"use client";

import { useMemo, useState } from "react";

export default function Home() {
  const presets = useMemo(
    () => [
      { key: "chibi", label: "Chibi cempreng" },
      { key: "normal", label: "Normal" },
      { key: "narrator", label: "Narator cinematic" },
      { key: "news", label: "Berita" },
      { key: "robot", label: "Robot lucu" },
    ],
    []
  );

  const voices = useMemo(
    () => [
      { key: "Algenib", label: "Algenib" },
      { key: "Kore", label: "Kore" },
      { key: "Puck", label: "Puck" },
      { key: "Zephyr", label: "Zephyr" },
      { key: "Aoede", label: "Aoede" },
    ],
    []
  );

  const [text, setText] = useState("Halo gengs! Balik lagi di konten hari ini!");
  const [preset, setPreset] = useState("chibi");
  const [voice, setVoice] = useState("Algenib");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");

  async function generate(nextPreset = preset) {
    setLoading(true);
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, preset: nextPreset, voice }),
      });

      if (!r.ok) throw new Error(await r.text());

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      setTimeout(() => {
        const el = document.getElementById("player");
        if (el) el.play().catch(() => {});
      }, 50);
    } catch (e) {
      alert("Gagal: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "36px auto",
        padding: 16,
        fontFamily: "system-ui",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Gemini TTS Web</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Preset suara + voice (termasuk Algenib). Jika voice tidak tersedia, otomatis fallback ke Kore.
      </p>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Voice</label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            style={{ padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
          >
            {voices.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Preset cepat</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  setPreset(p.key);
                  generate(p.key);
                }}
                disabled={loading}
                style={{
                  padding: "10px 12px",
                  borderRadius: 999,
                  border: "1px solid #ddd",
                  cursor: loading ? "not-allowed" : "pointer",
                  background: preset === p.key ? "#f3f3f3" : "white",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label style={{ display: "block", marginTop: 16, marginBottom: 6 }}>Teks</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tulis teks..."
        style={{
          width: "100%",
          height: 160,
          padding: 12,
          borderRadius: 14,
          border: "1px solid #ddd",
        }}
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <button
          onClick={() => generate(preset)}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate"}
        </button>

        <span style={{ opacity: 0.7 }}>
          Aktif: <b>{presets.find((p) => p.key === preset)?.label}</b> • Voice: <b>{voice}</b>
        </span>
      </div>

      {audioUrl && (
        <section style={{ marginTop: 18 }}>
          <audio id="player" controls src={audioUrl} style={{ width: "100%" }} />
          <div style={{ marginTop: 8 }}>
            <a href={audioUrl} download={`tts-${preset}-${voice}.wav`}>
              Download WAV
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
