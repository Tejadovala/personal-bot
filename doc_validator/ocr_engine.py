"""
ocr_engine.py  (v5 — docTR as primary AI engine)
-------------------------------------------------
Engine priority (all 100% LOCAL — no data sent anywhere):

  1. docTR     — Transformer AI, ~95% accuracy, document-aware
                 Built by Mindee specifically for document OCR.
                 Detection + Recognition in one PyTorch pipeline.
                 Works natively on Windows/Python 3.13.
                 Downloads models once (~200 MB) to local cache.

  2. EasyOCR   — Neural net, ~88% accuracy (fallback)

  3. Tesseract — Classic OCR, ~75% accuracy (final fallback)

Data Privacy: NOTHING leaves this machine. Ever.
"""

from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path
from typing import Literal

EngineType = Literal["doctr", "easyocr", "tesseract", "auto"]

_TESSERACT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    rf"C:\Users\{os.environ.get('USERNAME','')}\AppData\Local\Tesseract-OCR\tesseract.exe",
]


# ── engine detection ──────────────────────────────────────────────────────────

def _doctr_ok() -> bool:
    try:
        from doctr.models import ocr_predictor  # noqa
        return True
    except ImportError:
        return False


def _easyocr_ok() -> bool:
    try:
        import easyocr  # noqa
        return True
    except ImportError:
        return False


def _tesseract_ok() -> bool:
    if shutil.which("tesseract"):
        return True
    return any(os.path.exists(p) for p in _TESSERACT_PATHS)


def best_available_engine() -> str:
    if _doctr_ok():     return "doctr"
    if _easyocr_ok():   return "easyocr"
    if _tesseract_ok(): return "tesseract"
    return "none"


# ── shared block helper ───────────────────────────────────────────────────────

def _make_block(text: str, x: int, y: int, w: int, h: int,
                conf: float = 1.0) -> dict:
    return {
        "text": str(text).strip(),
        "x": x, "y": y, "w": w, "h": h,
        "conf": float(conf),
        "cx": x + w // 2,
        "cy": y + h // 2,
    }


# ── OpenCV preprocessing (used by EasyOCR & Tesseract) ───────────────────────

def _preprocess(image_path: str) -> str:
    """
    3× upscale → denoise → adaptive threshold → morph close → deskew.
    Returns path to a temp PNG. Caller must delete it.
    """
    import cv2
    import numpy as np

    img = cv2.imread(image_path)
    if img is None:
        from PIL import Image as PILImage
        pil = PILImage.open(image_path).convert("RGB")
        img = np.array(pil)[:, :, ::-1]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    gray = cv2.resize(gray, (w * 3, h * 3), interpolation=cv2.INTER_CUBIC)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    gray = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7,
                                    searchWindowSize=21)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, blockSize=31, C=10,
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    coords = np.column_stack(np.where(binary < 128))
    if len(coords) >= 5:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45: angle = -(90 + angle)
        else:           angle = -angle
        if 0.3 < abs(angle) < 10:
            center = (binary.shape[1] // 2, binary.shape[0] // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            binary = cv2.warpAffine(
                binary, M, (binary.shape[1], binary.shape[0]),
                flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE,
            )

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    cv2.imwrite(tmp.name, binary)
    tmp.close()
    return tmp.name


# ── docTR engine ──────────────────────────────────────────────────────────────
_doctr_model = None


def _load_doctr():
    global _doctr_model
    if _doctr_model is None:
        import os
        os.environ["USE_TORCH"] = "1"           # force PyTorch backend
        from doctr.models import ocr_predictor
        _doctr_model = ocr_predictor(
            det_arch="db_resnet50",             # best detection model
            reco_arch="crnn_vgg16_bn",          # best recognition model
            pretrained=True,
        )


def _extract_doctr(image_path: str) -> tuple[str, list[dict]]:
    """
    docTR — Mindee's document transformer pipeline.
    Detection: DB-ResNet50 | Recognition: CRNN-VGG16
    Returns per-word blocks with pixel-accurate bounding boxes.
    100% local after first model download (~200 MB cached).
    """
    import os
    os.environ["USE_TORCH"] = "1"
    from doctr.io import DocumentFile
    from PIL import Image as PILImage
    import numpy as np

    _load_doctr()

    # docTR can load from file path directly
    doc = DocumentFile.from_images([image_path])
    result = _doctr_model(doc)

    # Get image dimensions for coordinate scaling
    img = PILImage.open(image_path)
    img_w, img_h = img.size

    blocks: list[dict] = []
    for page in result.pages:
        for block in page.blocks:
            for line in block.lines:
                # Collect all words in the line first
                line_words = []
                for word in line.words:
                    text = str(word.value or "").strip()
                    if not text:
                        continue
                    # docTR geometry: [[x1,y1],[x2,y2]] normalized 0-1
                    geo = word.geometry
                    x1 = int(geo[0][0] * img_w)
                    y1 = int(geo[0][1] * img_h)
                    x2 = int(geo[1][0] * img_w)
                    y2 = int(geo[1][1] * img_h)
                    conf = float(getattr(word, "confidence", 1.0) or 1.0)
                    line_words.append(_make_block(text, x1, y1, x2 - x1, y2 - y1, conf))

                if not line_words:
                    continue

                # Sort words left-to-right to calculate horizontal gaps
                line_words.sort(key=lambda w: w["x"])

                # Group words by horizontal gaps to isolate columns on the same row
                word_groups = []
                current_group = [line_words[0]]
                for w in line_words[1:]:
                    last_w = current_group[-1]
                    # Calculate horizontal gap between last word and current word
                    gap = w["x"] - (last_w["x"] + last_w["w"])
                    avg_h = (w["h"] + last_w["h"]) / 2 if (w["h"] + last_w["h"]) > 0 else 20
                    # If gap is > 1.2 * average height, it's a column transition
                    if gap > avg_h * 1.2:
                        word_groups.append(current_group)
                        current_group = [w]
                    else:
                        current_group.append(w)
                if current_group:
                    word_groups.append(current_group)

                # Add word groups as combined blocks (isolated columns)
                for group in word_groups:
                    if len(group) > 1:
                        group_text = " ".join(w["text"] for w in group)
                        gx = min(w["x"] for w in group)
                        gy = min(w["y"] for w in group)
                        gx2 = max(w["x"] + w["w"] for w in group)
                        gy2 = max(w["y"] + w["h"] for w in group)
                        avg_conf = sum(w["conf"] for w in group) / len(group)
                        blocks.append(_make_block(group_text, gx, gy, gx2 - gx, gy2 - gy, avg_conf))
                    
                    # Add individual word blocks
                    blocks.extend(group)

    blocks.sort(key=lambda b: (b["y"], b["x"]))
    flat = "\n".join(b["text"] for b in blocks if " " in b["text"] or len(b["text"]) > 1)
    if not flat:
        flat = "\n".join(b["text"] for b in blocks)
    return flat, blocks



# ── EasyOCR engine ────────────────────────────────────────────────────────────
_easy_reader = None


def _extract_easyocr(image_path: str) -> tuple[str, list[dict]]:
    global _easy_reader
    if _easy_reader is None:
        import easyocr
        _easy_reader = easyocr.Reader(["en"], gpu=False, verbose=False)

    preprocessed = _preprocess(image_path)
    try:
        raw_res  = _easy_reader.readtext(image_path,   detail=1, paragraph=False)
        proc_res = _easy_reader.readtext(preprocessed, detail=1, paragraph=False)
    finally:
        try: os.unlink(preprocessed)
        except Exception: pass

    def _to_blocks(results):
        blks = []
        for item in (results or []):
            if len(item) < 2: continue
            bbox, text = item[0], item[1]
            conf = item[2] if len(item) >= 3 else 1.0
            text = str(text).strip()
            if not text: continue
            xs = [pt[0] for pt in bbox]; ys = [pt[1] for pt in bbox]
            x, y = int(min(xs)), int(min(ys))
            w = int(max(xs) - min(xs)); h = int(max(ys) - min(ys))
            blks.append(_make_block(text, x, y, w, h, float(conf)))
        return blks

    raw_blocks  = _to_blocks(raw_res)
    proc_blocks = _to_blocks(proc_res)

    raw_w  = sum(len(b["text"].split()) for b in raw_blocks)
    proc_w = sum(len(b["text"].split()) for b in proc_blocks)
    blocks = proc_blocks if proc_w >= raw_w else raw_blocks

    blocks.sort(key=lambda b: (b["y"], b["x"]))
    return "\n".join(b["text"] for b in blocks), blocks


# ── Tesseract engine ──────────────────────────────────────────────────────────

def _setup_tesseract() -> None:
    if shutil.which("tesseract"): return
    for p in _TESSERACT_PATHS:
        if os.path.exists(p):
            import pytesseract
            pytesseract.pytesseract.tesseract_cmd = p
            return
    raise RuntimeError("Tesseract not found.")


def _extract_tesseract(image_path: str) -> tuple[str, list[dict]]:
    _setup_tesseract()
    import pytesseract

    preprocessed = _preprocess(image_path)
    try:
        data = pytesseract.image_to_data(preprocessed, config="--psm 6 --oem 3",
                                          output_type=pytesseract.Output.DICT)
    finally:
        try: os.unlink(preprocessed)
        except Exception: pass

    blocks = []
    for i, text in enumerate(data["text"]):
        text = str(text).strip()
        if not text: continue
        conf = float(data["conf"][i]) / 100.0
        if conf < 0: conf = 0.5
        blocks.append(_make_block(text,
                                   data["left"][i], data["top"][i],
                                   data["width"][i], data["height"][i], conf))

    blocks.sort(key=lambda b: (b["y"], b["x"]))
    return "\n".join(b["text"] for b in blocks), blocks


# ── public API ────────────────────────────────────────────────────────────────

def extract_text(image_path: str,
                 engine: EngineType = "auto") -> tuple[str, list[dict], str]:
    """
    Extract text from a document image using the best available LOCAL AI engine.

    Returns:
        (flat_text, blocks, engine_label)
        - flat_text  : newline-joined OCR output (for backward compat)
        - blocks     : list of {"text","x","y","w","h","conf","cx","cy"}
        - engine_label: human-readable engine name

    Engine priority: docTR → EasyOCR → Tesseract

    Privacy: 100% local. Zero network calls. Zero API keys.
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    if engine == "auto":
        engine = best_available_engine()  # type: ignore[assignment]

    if engine == "none":
        raise RuntimeError(
            "No OCR engine found.\n"
            "Install docTR:     pip install python-doctr\n"
            "Or EasyOCR:       pip install easyocr"
        )

    if engine == "doctr":
        try:
            flat, blocks = _extract_doctr(str(path))
            return flat, blocks, "docTR (Mindee transformer — local, ~95% accuracy)"
        except Exception as e:
            print(f"[docTR failed: {e}] — falling back to EasyOCR")
            engine = "easyocr" if _easyocr_ok() else "tesseract"

    if engine == "easyocr":
        flat, blocks = _extract_easyocr(str(path))
        return flat, blocks, "EasyOCR (neural — local)"

    flat, blocks = _extract_tesseract(str(path))
    return flat, blocks, "Tesseract (classic — local)"
