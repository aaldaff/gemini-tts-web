export const metadata = {
  title: "Gemini TTS Web",
  description: "Web TTS pakai Gemini (Google AI Studio) + preset suara",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
