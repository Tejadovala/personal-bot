"""
🤖 AI Model Advisor Bot — Real-time, multi-provider
A terminal chatbot that uses a live LLM to recommend the best AI model
for any task you describe, with streaming responses.

Supports: Google Gemini | Groq (free & fast) | OpenAI
"""

import sys
import os
import textwrap
import time
from datetime import datetime

# ── dependency check ────────────────────────────────────────────────
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.markdown import Markdown
    from rich.text import Text
    from rich.live import Live
    from rich.rule import Rule
    from rich.table import Table
    from rich.prompt import Prompt
except ImportError:
    print("Missing 'rich'. Run:  pip install rich")
    sys.exit(1)

# ── constants ───────────────────────────────────────────────────────
SYSTEM_PROMPT = textwrap.dedent("""\
    You are **Model Advisor**, an expert AI consultant who lives in the terminal.

    Your ONLY job is to recommend the best AI / ML model for whatever task the
    user describes.  Follow these rules strictly:

    1. **Always ask clarifying questions first** if the user's request is vague
       (budget? latency needs? open-source only? deployment target?).
    2. For every recommendation, provide:
       - Model name & provider
       - Why it fits the task (strengths)
       - Trade-offs / weaknesses
       - Approximate cost tier (free / low / medium / high)
       - A quick "getting started" tip (one-liner install or API call)
    3. Rank the options from best-fit to alternative.
    4. Use markdown formatting (headers, bold, bullet points, code blocks)
       so the terminal renders it nicely.
    5. Cover ALL major providers fairly: OpenAI, Anthropic, Google, Meta,
       Mistral, Cohere, open-source (Hugging Face / Ollama), and niche
       specialists when relevant.
    6. If the user asks something unrelated to AI models, politely redirect
       them back to model selection.
    7. Keep answers concise but thorough — no fluff.
    8. Stay up-to-date: mention the latest flagship models from each provider.
""")

PROVIDERS = {
    "1": {
        "name": "Groq",
        "desc": "Free & ultra-fast (recommended)",
        "env_var": "GROQ_API_KEY",
        "key_url": "https://console.groq.com/keys",
        "model": "llama-3.3-70b-versatile",
    },
    "2": {
        "name": "Gemini",
        "desc": "Google Gemini (free tier)",
        "env_var": "GEMINI_API_KEY",
        "key_url": "https://aistudio.google.com/apikey",
        "model": "gemini-2.0-flash",
    },
    "3": {
        "name": "OpenAI",
        "desc": "GPT-4o / GPT-4o-mini (paid)",
        "env_var": "OPENAI_API_KEY",
        "key_url": "https://platform.openai.com/api-keys",
        "model": "gpt-4o-mini",
    },
}

# ── UI helpers ──────────────────────────────────────────────────────
console = Console()

BANNER = r"""
[bold cyan]
  ╔══════════════════════════════════════════════════════════╗
  ║          🤖  AI  MODEL  ADVISOR  BOT  (Live)            ║
  ║     Real-time Streaming  ·  Multi-Provider Support      ║
  ╚══════════════════════════════════════════════════════════╝
[/bold cyan]"""

HELP_TEXT = textwrap.dedent("""\
    [bold yellow]Commands:[/bold yellow]
      [cyan]/help[/cyan]     — Show this help message
      [cyan]/clear[/cyan]    — Clear conversation history & start fresh
      [cyan]/history[/cyan]  — Show conversation summary
      [cyan]/switch[/cyan]   — Switch to a different AI provider
      [cyan]/exit[/cyan]     — Quit the bot

    [bold yellow]Usage:[/bold yellow]
      Just type what you need in plain English, for example:
      • "I need a model for real-time object detection on a Raspberry Pi"
      • "Best model for summarizing 200-page legal documents?"
      • "Cheapest coding assistant API for a startup"
""")


def print_banner():
    console.print(BANNER)
    console.print(
        "[dim white]  Type your task and press Enter. "
        "The bot will recommend the best AI model.[/dim white]"
    )
    console.print(
        "[dim white]  Type [bold]/help[/bold] for commands "
        "or [bold]/exit[/bold] to quit.\n[/dim white]"
    )


def print_help():
    console.print(Panel(HELP_TEXT, title="📖 Help", border_style="yellow"))


# ── Provider selection ──────────────────────────────────────────────
def choose_provider() -> dict:
    """Let the user pick which AI provider to use."""
    console.print("\n[bold yellow]Choose your AI provider:[/bold yellow]\n")

    table = Table(show_header=True, header_style="bold magenta", border_style="dim")
    table.add_column("#", style="bold cyan", width=4, justify="center")
    table.add_column("Provider", style="bold white")
    table.add_column("Details", style="dim")
    table.add_column("Model", style="green")

    for key, p in PROVIDERS.items():
        table.add_row(key, p["name"], p["desc"], p["model"])

    console.print(table)
    console.print()

    choice = Prompt.ask(
        "Select provider",
        choices=list(PROVIDERS.keys()),
        default="1",
    )
    return PROVIDERS[choice]


def get_api_key(provider: dict) -> str:
    """Retrieve or interactively ask for the API key."""
    key = os.environ.get(provider["env_var"], "").strip()
    if key:
        console.print(
            f"[dim]Using {provider['name']} key from "
            f"${provider['env_var']}[/dim]"
        )
        return key

    console.print(
        Panel(
            f"[bold yellow]No {provider['env_var']} found in your environment.[/bold yellow]\n\n"
            f"Get a free key at: [link={provider['key_url']}]"
            f"{provider['key_url']}[/link]\n\n"
            f"[dim]Paste it below (used for this session only).[/dim]",
            title=f"🔑 {provider['name']} API Key Required",
            border_style="yellow",
        )
    )
    key = console.input("[bold cyan]API Key › [/bold cyan]").strip()
    if not key:
        console.print("[bold red]No key entered. Exiting.[/bold red]")
        sys.exit(1)
    os.environ[provider["env_var"]] = key
    return key


# ── Provider-specific chat backends ────────────────────────────────

class GroqChat:
    """Chat backend using the Groq REST API (httpx only, no SDK needed)."""

    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, api_key: str, model: str):
        import httpx
        self.client = httpx.Client(timeout=60)
        self.api_key = api_key
        self.model = model
        self.messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    def send_message_stream(self, user_message: str):
        self.messages.append({"role": "user", "content": user_message})
        payload = {
            "model": self.model,
            "messages": self.messages,
            "stream": True,
            "temperature": 0.7,
            "max_tokens": 2048,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        full_text = ""
        import httpx, json
        with self.client.stream(
            "POST", self.BASE_URL, json=payload, headers=headers
        ) as resp:
            if resp.status_code != 200:
                resp.read()
                raise Exception(f"{resp.status_code} — {resp.text}")
            for line in resp.iter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[len("data: "):]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    delta = chunk["choices"][0].get("delta", {})
                    text = delta.get("content", "")
                    if text:
                        full_text += text
                        yield text
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

        self.messages.append({"role": "assistant", "content": full_text})

    def reset(self):
        self.messages = [{"role": "system", "content": SYSTEM_PROMPT}]


class GeminiChat:
    """Chat backend using the google-genai SDK."""

    def __init__(self, api_key: str, model: str):
        from google import genai
        from google.genai import types
        self.client = genai.Client(api_key=api_key)
        self.model = model
        self.types = types
        self._create_chat()

    def _create_chat(self):
        from google.genai import types
        self.chat = self.client.chats.create(
            model=self.model,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=2048,
            ),
        )

    def send_message_stream(self, user_message: str):
        stream = self.chat.send_message_stream(user_message)
        for chunk in stream:
            if chunk.text:
                yield chunk.text

    def reset(self):
        self._create_chat()


class OpenAIChat:
    """Chat backend using the OpenAI REST API (httpx, no SDK needed)."""

    BASE_URL = "https://api.openai.com/v1/chat/completions"

    def __init__(self, api_key: str, model: str):
        import httpx
        self.client = httpx.Client(timeout=60)
        self.api_key = api_key
        self.model = model
        self.messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    def send_message_stream(self, user_message: str):
        self.messages.append({"role": "user", "content": user_message})
        payload = {
            "model": self.model,
            "messages": self.messages,
            "stream": True,
            "temperature": 0.7,
            "max_tokens": 2048,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        full_text = ""
        import httpx, json
        with self.client.stream(
            "POST", self.BASE_URL, json=payload, headers=headers
        ) as resp:
            if resp.status_code != 200:
                resp.read()
                raise Exception(f"{resp.status_code} — {resp.text}")
            for line in resp.iter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[len("data: "):]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    delta = chunk["choices"][0].get("delta", {})
                    text = delta.get("content", "")
                    if text:
                        full_text += text
                        yield text
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

        self.messages.append({"role": "assistant", "content": full_text})

    def reset(self):
        self.messages = [{"role": "system", "content": SYSTEM_PROMPT}]


def create_chat(provider: dict, api_key: str):
    """Factory: create the right chat backend for the chosen provider."""
    name = provider["name"]
    model = provider["model"]
    if name == "Groq":
        return GroqChat(api_key, model)
    elif name == "Gemini":
        return GeminiChat(api_key, model)
    elif name == "OpenAI":
        return OpenAIChat(api_key, model)
    else:
        raise ValueError(f"Unknown provider: {name}")


# ── streaming renderer ──────────────────────────────────────────────
def stream_response(chat, user_message: str) -> str | None:
    """Stream the model response chunk-by-chunk and render as markdown."""
    full_text = ""
    console.print()

    try:
        with Live(console=console, refresh_per_second=12, vertical_overflow="visible") as live:
            for text_chunk in chat.send_message_stream(user_message):
                full_text += text_chunk
                live.update(
                    Panel(
                        Markdown(full_text),
                        title="[bold green]🤖 Model Advisor[/bold green]",
                        border_style="green",
                        padding=(1, 2),
                    )
                )
    except Exception as e:
        error_msg = str(e)
        if any(k in error_msg.upper() for k in ["API_KEY", "401", "403", "INVALID"]):
            console.print(
                Panel(
                    f"[bold red]Authentication error.[/bold red]\n"
                    f"Your API key may be invalid or expired.\n\n"
                    f"[dim]{error_msg[:300]}[/dim]",
                    title="❌ API Error",
                    border_style="red",
                )
            )
        elif "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "rate" in error_msg.lower():
            console.print(
                Panel(
                    f"[bold red]Rate limit / quota exhausted.[/bold red]\n"
                    f"Try again in a minute, or switch provider with [bold]/switch[/bold].\n\n"
                    f"[dim]{error_msg[:300]}[/dim]",
                    title="⏳ Rate Limited",
                    border_style="yellow",
                )
            )
        else:
            console.print(
                Panel(
                    f"[bold red]Something went wrong:[/bold red]\n{error_msg[:400]}",
                    title="❌ Error",
                    border_style="red",
                )
            )
        return None

    return full_text


# ── main loop ───────────────────────────────────────────────────────
def main():
    print_banner()

    provider = choose_provider()
    api_key = get_api_key(provider)
    chat = create_chat(provider, api_key)
    turn_count = 0

    console.print(
        f"\n[bold green]✓ Connected to {provider['name']}![/bold green]  "
        f"[dim](model: {provider['model']})[/dim]\n"
        f"  Ask me anything about choosing an AI model.\n"
    )

    while True:
        try:
            user_input = console.input("[bold magenta]You › [/bold magenta]").strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\n[bold cyan]Goodbye! 👋[/bold cyan]")
            break

        if not user_input:
            continue

        # ── slash commands ──────────────────────────────────────────
        cmd = user_input.lower()
        if cmd in ("/exit", "/quit", "/q"):
            console.print("[bold cyan]Goodbye! Happy building! 👋[/bold cyan]")
            break
        if cmd == "/help":
            print_help()
            continue
        if cmd == "/clear":
            chat.reset()
            turn_count = 0
            console.clear()
            print_banner()
            console.print(
                f"[bold green]✓ Conversation cleared. "
                f"Provider: {provider['name']}[/bold green]\n"
            )
            continue
        if cmd == "/switch":
            provider = choose_provider()
            api_key = get_api_key(provider)
            chat = create_chat(provider, api_key)
            turn_count = 0
            console.print(
                f"\n[bold green]✓ Switched to {provider['name']}![/bold green]  "
                f"[dim](model: {provider['model']})[/dim]\n"
            )
            continue
        if cmd == "/history":
            console.print(
                Panel(
                    f"[bold]Turns so far:[/bold] {turn_count}\n"
                    f"[bold]Provider:[/bold] {provider['name']}\n"
                    f"[bold]Model:[/bold] {provider['model']}\n"
                    f"[bold]Session:[/bold] {datetime.now():%Y-%m-%d %H:%M}",
                    title="📜 Session Info",
                    border_style="cyan",
                )
            )
            continue

        # ── send to LLM ────────────────────────────────────────────
        result = stream_response(chat, user_input)
        if result is not None:
            turn_count += 1
        console.print()


# ── entry point ─────────────────────────────────────────────────────
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[bold red]Interrupted. Goodbye![/bold red]")
        sys.exit(0)
