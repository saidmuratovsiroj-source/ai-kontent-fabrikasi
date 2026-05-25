import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Muhit o'zgaruvchisi topilmadi: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  port:              parseInt(optional("BACKEND_PORT", "4000"), 10),
  databaseUrl:       required("DATABASE_URL"),
  anthropicApiKey:   optional("ANTHROPIC_API_KEY", ""),
  openrouterApiKey:  optional("OPENROUTER_API_KEY", ""),
  tavilyApiKey:      optional("TAVILY_API_KEY", ""),
  youtubeApiKey:     optional("YOUTUBE_API_KEY", ""),
  telegramBotToken:  optional("TELEGRAM_BOT_TOKEN", ""),
  telegramChatId:    optional("TELEGRAM_CHAT_ID", ""),
  nodeEnv:           optional("NODE_ENV", "development"),
};
