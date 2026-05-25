const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID   ?? "";

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

export async function sendTelegramPost(params: {
  topic:     string;
  plan:      string;
  script:    string;
  thumbnail: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN || !CHAT_ID) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan" };
  }

  // Sarlavhalar bo'limini topish — "## 📋 SARLAVHA VARIANTLARI" bo'limi
  const titlesMatch = params.thumbnail.match(/## 📋[^\n]*\n([\s\S]*?)(?=\n##|$)/);
  const titlesBlock = titlesMatch ? titlesMatch[1].trim() : "";

  // Ssenariyning boshlanish qismini olish (hook + kirish)
  const scriptPreview = params.script.slice(0, 800).replace(/##[^\n]*\n/g, "").trim();

  const message = [
    `🎬 *Yangi video suratga olishga tayyor\\!*`,
    ``,
    `📌 *Mavzu:* ${escapeMarkdown(params.topic.slice(0, 100))}`,
    ``,
    `📋 *Sarlavha variantlari:*`,
    escapeMarkdown(titlesBlock.slice(0, 400) || "— tizimda ko'ring"),
    ``,
    `✍️ *Ssenariy boshi:*`,
    `_${escapeMarkdown(scriptPreview.slice(0, 500))}_`,
    ``,
    `🤖 _AI Kontent Fabrikasi tomonidan yaratildi_`,
  ].join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id:    CHAT_ID,
          text:       message,
          parse_mode: "MarkdownV2",
        }),
      }
    );

    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) return { ok: false, error: data.description };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Fetch xatosi" };
  }
}
