export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  channelName: string;
  channelId: string;
  channelUrl: string;
  thumbnailUrl: string;
  thumbnailUrlMaxRes: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  likeCount: string;
  tags: string[];
  url: string;
  embedUrl: string;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  publishedAt: string;
  url: string;
}
