export interface YouTubeSearchSettings {
  // Note creation
  noteLocation: string;
  filenameTemplate: string;
  noteContentTemplate: string;

  // Properties to include
  includeChannel: boolean;
  includeThumbnail: boolean;
  includeTags: boolean;
  includeVideoInfo: boolean;

  // Thumbnail settings
  saveLocalThumbnail: boolean;
  thumbnailDirectory: string;

  // UI
  openNoteAfterCreation: boolean;
}

export const DEFAULT_SETTINGS: YouTubeSearchSettings = {
  noteLocation: "YouTube",
  filenameTemplate: "{{title}}",
  noteContentTemplate: "",

  includeChannel: false,
  includeThumbnail: true,
  includeTags: false,
  includeVideoInfo: false,

  saveLocalThumbnail: false,
  thumbnailDirectory: "YouTube/thumbnails",

  openNoteAfterCreation: true,
};

export const DEFAULT_NOTE_TEMPLATE = `---
title: "{{title}}"
url: "{{url}}"
videoId: "{{videoId}}"
channelName: "{{channelName}}"
channelUrl: "{{channelUrl}}"
thumbnailUrl: "{{thumbnailUrl}}"
publishedAt: "{{publishedAt}}"
viewCount: "{{viewCount}}"
dateAdded: "{{date}}"
---

![thumbnail]({{thumbnailUrlRemote}})

## {{title}}

▶️ [Watch on YouTube]({{url}})

**Channel:** [{{channelName}}]({{channelUrl}})

## Notes

> _Your notes here_
`;
