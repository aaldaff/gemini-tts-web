import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { pcm16ToWav } from "../../../lib/wav";

export const runtime = "nodejs";

const PRESET = {
  chibi: {
    prompt:
      "Bacakan dengan gaya chibi lucu: suara agak cempreng, tempo cepat, energi tinggi, ekspresi komedi, intonasi naik-turun, artikulasi jelas. Tambahkan tawa kecil halus sesekali (tidak berlebihan).",
  },
  chibi_max: {
    prompt:
      "Bacakan super chibi ngakak: suara lebih cempreng, tempo lebih cepat, energi sangat tinggi, banyak ekspresi, intonasi ekstrem lucu, jeda pendek, tetap jelas, boleh ada 'hehe' kecil 1-2 kali.",
  },
  santai: {
    prompt:
      "Bacakan santai seperti ngobrol dengan teman: hangat, tempo sedang, natural, ada senyum di suara, tidak formal.",
  },
  serius: {
    prompt:
      "Bacakan tegas dan serius: tempo sedang, artikulasi kuat, intonasi stabil, sedikit menekan kata kunci penting.",
  },
  narrator: {
    prompt:
      "Bacakan seperti narator trailer cinematic: suara tegas, dalam, dramatis tapi tetap jelas, tempo sedang, jeda yang pas di akhir kalimat penting.",
  },
  berita: {
    prompt:
      "Bacakan seperti pembawa berita: tegas, jelas, informatif, tempo sedang, intonasi stabil, tidak berlebihan emosinya.",
  },
  whisper: {
    prompt:
      "Bacakan berbisik dramatis: volume lembut, dekat mic, tempo pelan-sedang, jelas, suasana misterius tapi tidak menyeramkan.",
  },
  marah_lucu: {
    prompt:
      "Bacakan seperti marah tapi lucu: intonasi naik, sedikit meledak-ledak, tempo cepat-sedang, tetap komedik dan jelas.",
  },
  robot: {
    prompt:
      "Bacakan seperti robot lucu: ritme sedikit patah-patah, tetap jelas, intonasi unik dan komedik, jangan terlalu monotone.",
  },
  iklan: {
    prompt:
      "Bacakan seperti voice over iklan: ceria, persuasif, tempo sedang-cepat, artikulasi tajam, terdengar menjual tapi tidak lebay.",
  },
};

async function callTTS(ai, prompt, voiceName) {
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

function extractRetrySeconds(msg) {
  const s = String(msg || "");
  let m = s.match(/retry in ([0-9.]+)s/i);
  if (m?.[1]) return Math.ceil(Number(m[1]));
  m = s.match(/retryDelay\\":\\"(\\d+)s\\"/i);
  if (m?.[1]) return Math.ceil(Number(m[1]));
  return null;
}

export async function POST(req) {
  try {
    const { text = "", preset = "chibi", voice = "Kore" } = await req.json();

    const t = String(text).trim();
    if (!t) return NextResponse.json({ error: "Teks kosong" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum diset" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const p = PRESET[preset] ?? PRESET.chibi;
    const prompt =
      `${p.prompt}\n\n` +
      `Teks yang harus dibacakan (jangan tambah subtitle/teks lain):\n` +
      t;

    let resp;
    try {
      resp = await callTTS(ai, prompt, String(voice));
    } catch {
      resp = await callTTS(ai, prompt, "Kore");
    }

    const b64 = resp?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      return NextResponse.json(
        { error: "Audio tidak ditemukan" },
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
      },
    });
  } catch (e) {
    const msg = String(e?.message || e);
    const retrySeconds = extractRetrySeconds(msg);
    const statusCode =
      msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") ? 429 : 500;

    return NextResponse.json(
      { error: "TTS gagal", detail: msg, retrySeconds },
      { status: statusCode }
    );
  }
}
}
