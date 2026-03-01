# Gemini TTS Web (Next.js) — Preset + Voice (termasuk Algenib)

Web TTS berbasis Gemini (Google AI Studio / Gemini API):
- Input teks → generate audio → langsung play di browser
- Preset: chibi, normal, narator, berita, robot
- Voice dropdown: termasuk "Algenib" (jika tidak tersedia di akunmu, otomatis fallback ke "Kore")
- Output: WAV (PCM 16-bit 24kHz dibungkus WAV)

## Setup Lokal
1) Install:
```bash
npm install
```

2) Set API key (di terminal):
```bash
export GEMINI_API_KEY="API_KEY_KAMU"
```

3) Run:
```bash
npm run dev
```

Buka: http://localhost:3000

## Deploy Vercel
- Set Environment Variable: GEMINI_API_KEY
- Deploy

## Catatan
- Jangan taruh API key di frontend.
- Jika voice tertentu error/invalid, backend otomatis fallback ke "Kore".
