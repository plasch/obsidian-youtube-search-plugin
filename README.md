# YouTube Search — Obsidian Plugin

Search YouTube videos by link and automatically create Obsidian notes with rich metadata.

---

## Features

- 🎬 Paste any YouTube URL and create a note in seconds
- 📋 Auto-paste from clipboard — the URL field automatically populates if your clipboard contains a YouTube link
- 📝 Generates notes with frontmatter properties: `title`, `url`, `videoId`, `channelName`, `channelUrl`, `thumbnailUrl`, `publishedAt`, `viewCount`, `tags`
- 🖼️ Optionally download and save thumbnails locally to your vault
- ✏️ Fully customisable note template using `{{placeholder}}` variables
- ⚙️ Settings to control which properties are included

## How to Use

1. Click the **YouTube ribbon icon** (▶ in the sidebar), or run the command **"Add YouTube video"** from the command palette (`Ctrl/Cmd + P`).
2. Paste your YouTube video URL into the input field.
3. A preview of the video (thumbnail, title, channel, metadata) is shown — review it.
4. Click **"Create Note"** — done!

### Supported URL Formats

| Format | Example |
|---|---|
| Standard watch URL | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` |
| Short URL | `https://youtu.be/dQw4w9WgXcQ` |
| Shorts | `https://www.youtube.com/shorts/dQw4w9WgXcQ` |
| Embed URL | `https://www.youtube.com/embed/dQw4w9WgXcQ` |
| Mobile | `https://m.youtube.com/watch?v=dQw4w9WgXcQ` |

## Generated Note Example

```markdown
---
title: "Never Gonna Give You Up"
url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
videoId: "dQw4w9WgXcQ"
channelName: "Rick Astley"
channelUrl: "https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw"
thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
publishedAt: "Oct 25, 2009"
viewCount: "1.4B"
dateAdded: "2025-01-15"
---

![thumbnail](https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg)

## Never Gonna Give You Up

▶️ [Watch on YouTube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

**Channel:** [Rick Astley](https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw)

## Notes

> _Your notes here_
```

## Settings

### Note Creation
| Setting | Description | Default |
|---|---|---|
| **Note location** | Folder where notes are saved | `YouTube` |
| **Filename template** | Template for the note filename | `{{title}}` |
| **Open note after creation** | Auto-open the new note | `true` |

### Note Properties
| Setting | Description | Default |
|---|---|---|
| **Include channel info** | Add `channelName` and `channelUrl` | `false` |
| **Include thumbnail** | Add `thumbnailUrl` and show image | `true` |
| **Include tags** | Add YouTube video tags | `false` |
| **Include video info** | Add YouTube video info | `false` |

### Thumbnail
| Setting | Description | Default |
|---|---|---|
| **Save thumbnail locally** | Download thumbnail to vault | `false` |
| **Thumbnail directory** | Where to save thumbnails | `YouTube/thumbnails` |

When **Save thumbnail locally** is enabled, the `thumbnailUrl` property becomes an Obsidian wiki-link `[[YouTube/thumbnails/VIDEO_ID.jpg]]` so the image embeds natively.

## Template Variables

Use these in the **Filename template** or **Custom note template** settings:

| Variable | Value |
|---|---|
| `{{title}}` | Video title |
| `{{videoId}}` | YouTube video ID (e.g. `dQw4w9WgXcQ`) |
| `{{url}}` | Full YouTube URL |
| `{{embedUrl}}` | YouTube embed URL |
| `{{channelName}}` | Channel name |
| `{{channelUrl}}` | Channel URL |
| `{{channelId}}` | Channel ID |
| `{{thumbnailUrl}}` | Thumbnail URL (local path or remote URL) |
| `{{thumbnailUrlRemote}}` | Always the remote thumbnail URL |
| `{{description}}` | Video description (first 500 chars) |
| `{{publishedAt}}` | Publish date |
| `{{viewCount}}` | View count (formatted, e.g. `1.4B`) |
| `{{tags}}` | Comma-separated list of video tags |
| `{{date}}` | Today's date (`YYYY-MM-DD`) |
| `{{time}}` | Current time (`HH:MM:SS`) |

## Installation

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/plasch/obsidian-youtube-search-plugin/releases).
2. Create a folder `<vault>/.obsidian/plugins/youtube-search/`.
3. Copy the three files into that folder.
4. In Obsidian → Settings → Community plugins, enable **YouTube Search**.

### From Source
```bash
git clone https://github.com/plasch/obsidian-youtube-search-plugin
cd obsidian-youtube-search-plugin
npm install
npm run build
```
Then copy `main.js`, `manifest.json`, and `styles.css` to your plugin folder.

## How It Works

The plugin uses **no YouTube API key**. It fetches video metadata via:
1. **YouTube oEmbed API** (`youtube.com/oembed`) — provides title, channel name, and thumbnail URL. No auth required.
2. **YouTube page scraping** — extracts additional metadata (description, tags, view count, publish date, channel ID) from the video page HTML.

This means the plugin works out of the box with no configuration needed.

## Privacy

All requests go directly from Obsidian to YouTube's servers. No data is sent to any third-party service.

## License

MIT
