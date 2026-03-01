"use client";

import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const presets = useMemo(
    () => [
      { key: "chibi", label: "Chibi cempreng" },
      { key: "chibi_max", label: "Chibi SUPER" },
      { key: "santai", label: "Santai ngobrol" },
      { key: "serius", label: "Serius tegas" },
      { key: "narrator", label: "Narator cinematic" },
      { key: "berita", label: "Pembawa berita" },
      { key: "whisper", label: "Bisik dramatis" },
      { key: "marah_lucu", label: "Marah lucu" },
      { key: "robot", label: "Robot lucu" },
      { key: "iklan", label: "Iklan/promosi" },
    ],
    []
  );

  const voices = useMemo(
    () => [
      { key: "Algenib", label: "Algenib" },
      { key: "Leda", label: "LEDA" },
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
  const [status, setStatus] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Countdown cooldown (anti 429 spam)
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function generate() {
    if (loading) return;
    if (cooldown > 0) return;

    const t = String(text || "").trim();
    if (!t) {
      setStatus("Teks masih kosong.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, preset, voice }),
      });

      if (!r.ok) throw new Error(await r.text());

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      setTimeout(() => {
        const el = document.getElementById("player");
        if (el) el.play().catch(() => {});
      }, 50);

      setStatus("Sukses! Audio sudah dibuat.");
    } catch (e) {
      const msg = String(e?.message || e);

      // ambil detik dari pesan: "Please retry in 42.63s" atau retryDelay:"42s"
      const m =
        msg.match(/retry in ([0-9.]+)s/i) ||
        msg.match(/retryDelay\\":\\"(\\d+)s\\"/i);
      const wait = m ? Math.ceil(Number(m[1])) : 45;

      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        setStatus(`Kena limit (429). Tunggu ${wait} detik lalu coba lagi.`);
        setCooldown(wait);
      } else {
        setStatus("Gagal: " + msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const activePresetLabel = presets.find((p) => p.key === preset)?.label ?? preset;

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
        Preset suara + voice (Algenib/LEDA). Jika voice tidak tersedia, backend fallback ke Kore.
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
          <label style={{ display: "block", marginBottom: 6 }}>
            Preset (klik untuk memilih — tidak auto-generate)
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {presets.map((p) => (
              <button
                type="button"
                key={p.key}
                onClick={() => setPreset(p.key)}
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

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={generate}
          disabled={loading || cooldown > 0}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            cursor: loading || cooldown > 0 ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating..." : cooldown > 0 ? `Tunggu ${cooldown}s` : "Generate"}
        </button>

        <span style={{ opacity: 0.7 }}>
          Aktif: <b>{activePresetLabel}</b> • Voice: <b>{voice}</b>
        </span>
      </div>

      {status && (
        <p style={{ marginTop: 10, color: status.includes("Gagal") ? "#b91c1c" : "#b45309" }}>
          {status}
        </p>
      )}

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
