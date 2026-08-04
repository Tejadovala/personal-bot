# 📄 Document Validation Tool

Validates scanned document images against XML data by running OCR on the image
and detecting **missing letters**, **missing spaces**, and **missing numbers**
for every field in each `<DataM>` record.

---

## 📁 Folder Structure

```
doc_validator/
├── validator.py          ← Main CLI entry point  ← RUN THIS
├── ocr_engine.py         ← Tesseract OCR wrapper
├── xml_parser.py         ← XML DataM record parser
├── checker.py            ← Missing char / space / number detection
├── report.py             ← Console + HTML report generator
├── requirements.txt      ← Python dependencies
└── sample_data/
    └── sample.xml        ← Your XML file (copy more XMLs here)
```

---

## ⚙️ Setup (one-time)

### 1 — Install Tesseract OCR (Windows)
Download and install from:
👉 https://github.com/UB-Mannheim/tesseract/wiki

Accept the default install path:
```
C:\Program Files\Tesseract-OCR\tesseract.exe
```

### 2 — Install Python dependencies
Open a terminal inside this folder and run:
```powershell
pip install -r requirements.txt
```

---

## 🚀 Usage

```powershell
# Basic usage — image + XML → console report + HTML file
python validator.py --image sample_data\3445.jpeg --xml sample_data\sample.xml

# Console only (no HTML file)
python validator.py -i sample_data\3445.jpeg -x sample_data\sample.xml --no-html

# Save HTML report to a custom path
python validator.py -i sample_data\3445.jpeg -x sample_data\sample.xml -o my_report.html

# Show ALL fields (including those with no issues)
python validator.py -i sample_data\3445.jpeg -x sample_data\sample.xml --verbose
```

---

## 📊 What the Report Shows

For every `<DataM>` record, the tool shows:

| Item | Description |
|---|---|
| ✅ Clean | All XML field values found correctly in OCR |
| ❌ Issues | One or more fields differ from OCR output |
| ⚠ Missing Letters | Alphabetic chars (A–Z, a–z) absent in OCR |
| ⚠ Missing Spaces | Word-boundary spaces missing in OCR |
| ⚠ Missing Numbers | Digit chars (0–9) absent in OCR |
| Match Score | 0–100% similarity between XML value and OCR match |

---

## 📌 Notes

- Place your image (`.jpeg`, `.png`, `.tiff`) in `sample_data/` or provide the full path.
- Place your XML file in `sample_data/` or provide the full path.
- The HTML report is saved as `validation_report.html` by default (opens in any browser).
- Fields with value `N.A` or blank are automatically skipped.
- Metadata fields (`ImageName`, `UserID`, `CreateDate`, `UpdateDate`, `Remarks`) are excluded from validation.
