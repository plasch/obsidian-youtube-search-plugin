import { requestUrl } from "obsidian";
import type { YouTubeVideoData } from "../types";

/**
 * Extracts the YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

export function buildVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function buildThumbnailUrl(videoId: string, quality: "default" | "hqdefault" | "mqdefault" | "sddefault" | "maxresdefault" = "hqdefault"): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

export function buildChannelUrl(channelId: string): string {
  return `https://www.youtube.com/channel/${channelId}`;
}

/**
 * Fetches video data using YouTube's oEmbed API (no API key needed).
 * Returns basic info: title, author_name, thumbnail_url.
 */
export async function fetchVideoDataViaOEmbed(videoId: string): Promise<Partial<YouTubeVideoData>> {
  const videoUrl = buildVideoUrl(videoId);
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

  const response = await requestUrl({ url: oEmbedUrl });
  if (response.status !== 200) {
    throw new Error(`Failed to fetch oEmbed data: HTTP ${response.status}`);
  }

  const data = response.json;

  return {
    videoId,
    title: data.author_name ? sanitizeTitle(data.title) : sanitizeTitle(data.title ?? ""),
    channelName: data.author_name ?? "",
    channelUrl: data.author_url ?? "",
    thumbnailUrl: buildThumbnailUrl(videoId, "hqdefault"),
    thumbnailUrlMaxRes: buildThumbnailUrl(videoId, "maxresdefault"),
    url: videoUrl,
    embedUrl: buildEmbedUrl(videoId),
    // oEmbed provides the thumbnail from YouTube directly too
    ...(data.thumbnail_url ? { thumbnailUrl: data.thumbnail_url } : {}),
  };
}

/**
 * Attempts to scrape additional metadata from the YouTube watch page.
 * Falls back gracefully if scraping fails.
 */
export async function fetchVideoDataFromPage(videoId: string): Promise<Partial<YouTubeVideoData>> {
  try {
    const videoUrl = buildVideoUrl(videoId);
    const response = await requestUrl({
      url: videoUrl,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ObsidianYouTubePlugin/1.0)",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (response.status !== 200) return {};

    const html = response.text;
    const result: Partial<YouTubeVideoData> = {};

    // Extract description from meta tag
    const descMatch = html.match(/<meta name="description" content="([^"]*)">/);
    if (descMatch) result.description = decodeHTMLEntities(descMatch[1]);

    // Extract channel ID from page
    const channelIdMatch = html.match(/"channelId":"([^"]+)"/);
    if (channelIdMatch) {
      result.channelId = channelIdMatch[1];
      result.channelUrl = buildChannelUrl(channelIdMatch[1]);
    }

    // Extract keywords/tags
    const keywordsMatch = html.match(/<meta name="keywords" content="([^"]*)">/);
    if (keywordsMatch) {
      result.tags = keywordsMatch[1].split(",").map(t => t.trim()).filter(Boolean);
    }

    // Extract publish date
    const dateMatch = html.match(/"dateText":{"simpleText":"([^"]+)"}/);
    if (dateMatch) result.publishedAt = dateMatch[1];

    // Try to extract view count
    const viewMatch = html.match(/"viewCount":"(\d+)"/);
    if (viewMatch) result.viewCount = formatViewCount(viewMatch[1]);

    return result;
  } catch {
    return {};
  }
}

/**
 * Main function: fetches complete video data by combining oEmbed + page scraping.
 */
export async function fetchYouTubeVideoData(videoId: string): Promise<YouTubeVideoData> {
  const [oEmbedData, pageData] = await Promise.allSettled([
    fetchVideoDataViaOEmbed(videoId),
    fetchVideoDataFromPage(videoId),
  ]);

  const oembed = oEmbedData.status === "fulfilled" ? oEmbedData.value : {};
  const page = pageData.status === "fulfilled" ? pageData.value : {};

  if (!oembed.title && !oembed.channelName) {
    throw new Error("Failed to fetch video data. Please check the URL and try again.");
  }

  const videoUrl = buildVideoUrl(videoId);

  return {
    videoId,
    title: oembed.title ?? "Unknown Title",
    description: page.description ?? "",
    channelName: oembed.channelName ?? page.channelName ?? "Unknown Channel",
    channelId: page.channelId ?? "",
    channelUrl: oembed.channelUrl ?? page.channelUrl ?? "",
    thumbnailUrl: oembed.thumbnailUrl ?? buildThumbnailUrl(videoId, "hqdefault"),
    thumbnailUrlMaxRes: buildThumbnailUrl(videoId, "maxresdefault"),
    publishedAt: page.publishedAt ?? "",
    duration: page.duration ?? "",
    viewCount: page.viewCount ?? "",
    likeCount: page.likeCount ?? "",
    tags: page.tags ?? [],
    url: videoUrl,
    embedUrl: buildEmbedUrl(videoId),
  };
}

function sanitizeTitle(title: string): string {
  return decodeHTMLEntities(title).trim();
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function formatViewCount(count: string): string {
  const num = parseInt(count, 10);
  if (isNaN(num)) return count;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return count;
}
