# 🤖 AI Model Advisor Bot

A real-time, streaming terminal chatbot that recommends the best AI/ML model for any task you describe. Powered by live LLM APIs with multi-provider support.

![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- **Real-time streaming** — responses appear word-by-word as the LLM generates them
- **Multi-provider** — supports Groq (free & fast), Google Gemini, and OpenAI
- **Conversational memory** — remembers context across turns for follow-up questions
- **Rich terminal UI** — markdown rendering, colored panels, tables, spinners
- **Slash commands** — `/help`, `/clear`, `/switch`, `/history`, `/exit`
- **Zero config** — just paste your API key and start chatting

## 🚀 Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/ai-model-advisor-bot.git
cd ai-model-advisor-bot
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Get a free API key

| Provider | Free Tier | Speed | Get Key |
|----------|-----------|-------|---------|
| **Groq** (recommended) | ✅ Very generous | ⚡ Ultra-fast | [console.groq.com/keys](https://console.groq.com/keys) |
| **Gemini** | ✅ Limited | 🚀 Fast | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **OpenAI** | ❌ Paid | 🚀 Fast | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

### 4. Run the bot
```bash
python model_advisor.py
```

Select your provider, paste your API key, and start asking!

### (Optional) Set API key as environment variable

**Windows (PowerShell):**
```powershell
$env:GROQ_API_KEY = "your-key-here"
python model_advisor.py
```

**Linux / macOS:**
```bash
export GROQ_API_KEY="your-key-here"
python model_advisor.py
```

## 💬 Usage Examples

```
You › I need a model for real-time object detection on a Raspberry Pi
You › Best model for summarizing 200-page legal documents?
You › Compare GPT-4o vs Claude Sonnet for code generation
You › Cheapest coding assistant API for a startup
```

## ⌨️ Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help message |
| `/clear` | Clear conversation & start fresh |
| `/switch` | Switch to a different AI provider |
| `/history` | Show session info |
| `/exit` | Quit the bot |

## 📁 Project Structure

```
ai-model-advisor-bot/
├── model_advisor.py    # Main bot script
├── requirements.txt    # Python dependencies
├── README.md           # This file
└── .gitignore
```

## 🛠️ Requirements

- Python 3.9 or higher
- Internet connection (for API calls)
- A free API key from any supported provider

## 📜 License

MIT License — feel free to use, modify, and share.
