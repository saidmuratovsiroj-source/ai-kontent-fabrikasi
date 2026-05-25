import { env } from "../config/env";

interface YouTubeChannelInfo {
  channelId:   string;
  channelName: string;
  channelUrl:  string;
  subscribers: number;
  views:       number;
  videosCount: number;
}

interface YouTubeAPIResponse {
  items?: {
    id: string;
    snippet:    { title: string };
    statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
  }[];
}

function parseInput(input: string): { param: string; value: string } {
  const chanIdMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (chanIdMatch) return { param: "id", value: chanIdMatch[1] };

  const handleUrlMatch = input.match(/youtube\.com\/@([\w.-]+)/);
  if (handleUrlMatch) return { param: "forHandle", value: `@${handleUrlMatch[1]}` };

  const userMatch = input.match(/youtube\.com\/user\/([\w.-]+)/);
  if (userMatch) return { param: "forUsername", value: userMatch[1] };

  if (/^UC[\w-]{22}$/.test(input)) return { param: "id", value: input };

  // @handle yoki oddiy nom — forHandle ishlatamiz
  return { param: "forHandle", value: input.startsWith("@") ? input : `@${input}` };
}

export async function youtubeKanalMalumatOl(input: string): Promise<YouTubeChannelInfo> {
  if (!env.youtubeApiKey) throw new Error("YOUTUBE_API_KEY sozlanmagan");

  const { param, value } = parseInput(input.trim());
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${param}=${encodeURIComponent(value)}&key=${env.youtubeApiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`YouTube API xatosi ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as YouTubeAPIResponse;
  if (!data.items?.length) throw new Error("Kanal topilmadi");

  const ch = data.items[0];
  return {
    channelId:   ch.id,
    channelName: ch.snippet.title,
    channelUrl:  `https://www.youtube.com/channel/${ch.id}`,
    subscribers: parseInt(ch.statistics.subscriberCount ?? "0", 10),
    views:       parseInt(ch.statistics.viewCount       ?? "0", 10),
    videosCount: parseInt(ch.statistics.videoCount      ?? "0", 10),
  };
}
