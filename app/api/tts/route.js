import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { pcm16ToWav } from "../../../lib/wav";

export const runtime = "nodejs";

const PRESET = {
  chibi: {
    label: "Chibi cempreng",
    prompt:
      "Bacakan dengan gaya chibi lucu: suara agak cempreng, tempo cepat, energi tinggi, ekspresi komedi, intonasi naik-turun, artikulasi jelas. Tambahkan tawa kecil halus sesekali (tidak berlebihan).",
  },
  normal: {
    label: "Normal natural",
    prompt:
      "Bacakan natural dan ramah: tempo normal, artikulasi jelas, intonasi wajar, terdengar hangat dan santai.",
  },
  narrator: {
    label: "Narator cinematic",
    prompt:
      "Bacakan seperti narator trailer cinematic: suara tegas, dalam, dramatis tapi tetap jelas, tempo sedang, jeda yang pas di akhir kalimat penting.",
  },
  news: {
    label: "Pembawa berita",
    prompt:
      "Bacakan seperti pembawa berita: tegas, jelas, informatif, tempo sedang, intonasi stabil, tidak berlebihan emosinya.",
  },
  robot: {
    label: "Robot lucu",
    prompt:
      "Bacakan seperti robot lucu: ritme sedikit patah-patah, tetap jelas, intonasi unik dan komedik, jangan terlalu monotone.",
  },
};

async function callTTS(ai, { prompt, voiceName }) {
  return ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const voice = String(body?.voice ?? "Kore");
    const presetKey = String(body?.preset ?? "chibi");
    const preset = PRESET[presetKey] ?? PRESET.chibi;

    if (!text) return NextResponse.json({ error: "Teks kosong." }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum diset di environment." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `${preset.prompt}\n\nTeks yang harus dibacakan (jangan ditambah subtitle/teks lain):\n${text}`;

    // Try requested voice, fallback to Kore if invalid/unavailable
    let resp;
    try {
      resp = await callTTS(ai, { prompt, voiceName: voice });
    } catch (err) {
      resp = await callTTS(ai, { prompt, voiceName: "Kore" });
    }

    const part = resp?.candidates?.[0]?.content?.parts?.[0];
    const b64 = part?.inlineData?.data;
    if (!b64) {
      return NextResponse.json(
        { error: "Audio tidak ditemukan di response." },
        { status: 500 }
      );
    }

    const pcm = Buffer.from(b64, "base64");
    const wav = pcm16ToWav(pcm, 24000, 1);

    return new NextResponse(wav, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
        "X-TTS-Preset": presetKey,
        "X-TTS-Voice": voice,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "TTS gagal", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
