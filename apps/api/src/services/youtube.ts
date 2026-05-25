import { env } from "../config/env";

export interface YouTubeVideoInfo {
  videoId:      string;
  title:        string;
  channelId:    string;
  channelName:  string;
  publishedAt:  string;
  viewCount:    number;
  thumbnailUrl: string;
}

interface YouTubeSearchResponse {
  items?: Array<{
    id: { videoId?: string };
    snippet: {
      title:        string;
      channelId:    string;
      channelTitle: string;
      publishedAt:  string;
      thumbnails?:  { medium?: { url: string } };
    };
  }>;
}

interface YouTubeVideosResponse {
  items?: Array<{
    id: string;
    snippet: {
      title:        string;
      channelId:    string;
      channelTitle: string;
      publishedAt:  string;
      thumbnails?:  { medium?: { url: string } };
    };
    statistics: { viewCount?: string };
  }>;
}

async function qidiruvVaStatistika(searchUrl: string): Promise<YouTubeVideoInfo[]> {
  if (!env.youtubeApiKey) throw new Error("YOUTUBE_API_KEY sozlanmagan");

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`YouTube Search API ${searchRes.status}`);

  const searchData = (await searchRes.json()) as YouTubeSearchResponse;
  const ids = (searchData.items ?? []).map((i) => i.id.videoId).filter(Boolean).join(",");
  if (!ids) return [];

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}&key=${env.youtubeApiKey}`
  );
  if (!statsRes.ok) throw new Error(`YouTube Videos API ${statsRes.status}`);

  const statsData = (await statsRes.json()) as YouTubeVideosResponse;
  return (statsData.items ?? []).map((item) => ({
    videoId:      item.id,
    title:        item.snippet.title,
    channelId:    item.snippet.channelId,
    channelName:  item.snippet.channelTitle,
    publishedAt:  item.snippet.publishedAt,
    viewCount:    parseInt(item.statistics.viewCount ?? "0", 10),
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? "",
  }));
}

export async function youtubeKanalVideolari(
  channelId: string,
  publishedAfter: Date,
  maxResults = 20
): Promise<YouTubeVideoInfo[]> {
  const after = publishedAfter.toISOString();
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=viewCount&publishedAfter=${after}&maxResults=${maxResults}&key=${env.youtubeApiKey}`;
  return qidiruvVaStatistika(url);
}

export async function youtubeTrendlar(
  qidiruv: string,
  publishedAfter: Date,
  maxResults = 20
): Promise<YouTubeVideoInfo[]> {
  const after = publishedAfter.toISOString();
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(qidiruv)}&order=viewCount&publishedAfter=${after}&maxResults=${maxResults}&key=${env.youtubeApiKey}`;
  return qidiruvVaStatistika(url);
}

export function extractYoutubeChannelId(channelUrl: string): string | null {
  const m = channelUrl.match(/\/channel\/(UC[\w-]{22})/);
  return m ? m[1] : null;
}

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
