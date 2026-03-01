import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
// IMPORTANT: pakai relative import biar aman di Vercel
import { pcm16ToWav } from "../../../lib/wav";

export const runtime = "nodejs";

const PRESET = {
  chibi: {
    label: "Chibi cempreng",
    prompt:
      "Bacakan dengan gaya chibi lucu: suara agak cempreng, tempo cepat, energi tinggi, ekspresi komedi, intonasi naik-turun, artikulasi jelas. Tambahkan tawa kecil halus sesekali (tidak berlebihan).",
  },
  chibi_max: {
    label: "Chibi SUPER",
    prompt:
      "Bacakan super chibi ngakak: suara lebih cempreng, tempo lebih cepat, energi sangat tinggi, banyak ekspresi, intonasi ekstrem lucu, jeda pendek, tetap jelas, boleh ada 'hehe' kecil 1-2 kali.",
  },
  santai: {
    label: "Santai ngobrol",
    prompt:
      "Bacakan santai seperti ngobrol dengan teman: hangat, tempo sedang, natural, ada senyum di suara, tidak formal.",
  },
  serius: {
    label: "Serius tegas",
    prompt:
      "Bacakan tegas dan serius: tempo sedang, artikulasi kuat, intonasi stabil, sedikit menekan kata kunci penting.",
  },
  narrator: {
    label: "Narator cinematic",
    prompt:
      "Bacakan seperti narator trailer cinematic: suara tegas, dalam, dramatis tapi tetap jelas, tempo sedang, jeda yang pas di akhir kalimat penting.",
  },
  berita: {
    label: "Pembawa berita",
    prompt:
      "Bacakan seperti pembawa berita: tegas, jelas, informatif, tempo sedang, intonasi stabil, tidak berlebihan emosinya.",
  },
  whisper: {
    label: "Bisik dramatis",
    prompt:
      "Bacakan berbisik dramatis: volume lembut, dekat mic, tempo pelan-sedang, jelas, suasana misterius tapi tidak menyeramkan.",
  },
  marah_lucu: {
    label: "Marah lucu",
    prompt:
      "Bacakan seperti marah tapi lucu: intonasi naik, sedikit meledak-ledak, tempo cepat-sedang, tetap komedik dan jelas.",
  },
  robot: {
    label: "Robot lucu",
    prompt:
      "Bacakan seperti robot lucu: ritme sedikit patah-patah, tetap jelas, intonasi unik dan komedik, jangan terlalu monotone.",
  },
  iklan: {
    label: "Iklan/promosi",
    prompt:
      "Bacakan seperti voice over iklan: ceria, persuasif, tempo sedang-cepat, artikulasi tajam, terdengar menjual tapi tidak lebay.",
  },
};

async function callTTS(ai, { prompt, voiceName }) {
  return ai.models.generateContent({
    // model TTS
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

function extractRetrySeconds(message) {
  const msg = String(message || "");
  // contoh: "Please retry in 22.19s."
  let m = msg.match(/retry in ([0-9.]+)s/i);
  if (m?.[1]) return Math.ceil(Number(m[1]));
  // contoh: retryDelay":"22s"
  m = msg.match(/retryDelay\\":\\"(\\d+)s\\"/i);
  if (m?.[1]) return Math.ceil(Number(m[1]));
  return null;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const text = String(body?.text ?? "").trim();
    const presetKey = String(body?.preset ?? "chibi");
    const voice = String(body?.voice ?? "Kore");

    if (!text) {
      return NextResponse.json({ error: "Teks kosong." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum diset di environment." },
        { status: 500 }
      );
    }

    const preset = PRESET[presetKey] ?? PRESET.chibi;

    const ai = new GoogleGenAI({ apiKey });

    const prompt =
      `${preset.prompt}\n\n` +
      `Teks yang harus dibacakan (jangan tambah subtitle/teks lain):\n` +
      text;

    // coba voice pilihan user, kalau gagal fallback ke Kore
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

    // Gemini TTS biasanya mengembalikan PCM 16-bit 24kHz base64 → bungkus jadi WAV
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
    const msg = String(e?.message || e);
    const retrySeconds = extractRetrySeconds(msg);
    const statusCode = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") ? 429 : 500;

    return NextResponse.json(
      { error: "TTS gagal", detail: msg, retrySeconds },
      { status: statusCode }
    );
  }
}
