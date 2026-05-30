import { App, TFile, normalizePath, requestUrl } from "obsidian";
import type { YouTubeVideoData } from "../types";
import type { YouTubeSearchSettings } from "../settings/settings";
import { buildThumbnailUrl } from "./youtube";

export interface NoteCreationOptions {
  videoData: YouTubeVideoData;
  settings: YouTubeSearchSettings;
  localThumbnailPath?: string;
}

/**
 * Sanitizes a string for use as an Obsidian filename.
 * Obsidian forbids: \ / : * ? " < > | # ^ [ ]
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|#^[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/**
 * Sanitizes a video title for use in filenames and frontmatter.
 * Strips Obsidian-illegal characters that commonly appear in YouTube titles.
 */
export function sanitizeVideoTitle(title: string): string {
  return title
    .replace(/[\\/:*?"<>|#^[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Renders a template string by replacing {{placeholders}} with video data values.
 */
export function renderTemplate(template: string, videoData: YouTubeVideoData, localThumbnailPath?: string): string {
  const thumbnailValue = localThumbnailPath
    ? `[[${localThumbnailPath}]]`
    : videoData.thumbnailUrl;

  const replacements: Record<string, string> = {
    "{{title}}": videoData.title,
    "{{videoId}}": videoData.videoId,
    "{{url}}": videoData.url,
    "{{embedUrl}}": videoData.embedUrl,
    "{{channelName}}": videoData.channelName,
    "{{channelUrl}}": videoData.channelUrl,
    "{{channelId}}": videoData.channelId,
    "{{thumbnailUrl}}": thumbnailValue,
    "{{thumbnailUrlRemote}}": videoData.thumbnailUrl,
    "{{description}}": videoData.description,
    "{{publishedAt}}": videoData.publishedAt,
    "{{viewCount}}": videoData.viewCount,
    "{{likeCount}}": videoData.likeCount,
    "{{tags}}": videoData.tags.length > 0 ? videoData.tags.map(t => `"${t}"`).join(", ") : "",
    "{{date}}": new Date().toISOString().split("T")[0],
    "{{time}}": new Date().toTimeString().split(" ")[0],
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value ?? "");
  }
  return result;
}

/**
 * Generates the default frontmatter for a video note.
 */
export function generateNoteFrontmatter(videoData: YouTubeVideoData, settings: YouTubeSearchSettings, localThumbnailPath?: string): string {
  const thumbnailValue = localThumbnailPath
    ? `"[[${localThumbnailPath}]]"`
    : `"${videoData.thumbnailUrl}"`;

  const lines: string[] = [
    "---",
    `title: "${escapeFrontmatterValue(videoData.title)}"`,
    `url: "${videoData.url}"`,
  ];

  if (settings.includeVideoInfo) {
    lines.push(`videoId: "${videoData.videoId}"`);
  }

  if (settings.includeChannel) {
    lines.push(`channelName: "${escapeFrontmatterValue(videoData.channelName)}"`);
    lines.push(`channelUrl: "${videoData.channelUrl}"`);
  }

  if (settings.includeThumbnail) {
    lines.push(`thumbnailUrl: ${thumbnailValue}`);
  }

  if (settings.includeVideoInfo && videoData.publishedAt) {
    lines.push(`publishedAt: "${videoData.publishedAt}"`);
  }

  if (settings.includeVideoInfo && videoData.viewCount) {
    lines.push(`viewCount: "${videoData.viewCount}"`);
  }

  if (settings.includeTags && videoData.tags.length > 0) {
    lines.push(`tags:`);
    for (const tag of videoData.tags.slice(0, 10)) {
      lines.push(`  - "${escapeFrontmatterValue(tag)}"`);
    }
  }

  lines.push(`dateAdded: "${new Date().toISOString().split("T")[0]}"`);
  lines.push("---");

  return lines.join("\n");
}

/**
 * Generates the note body content.
 */
export function generateNoteBody(videoData: YouTubeVideoData, settings: YouTubeSearchSettings, localThumbnailPath?: string): string {
  if (settings.noteContentTemplate) {
    return renderTemplate(settings.noteContentTemplate, videoData, localThumbnailPath);
  }

  const lines: string[] = [];

  // Thumbnail
  if (settings.includeThumbnail) {
    if (localThumbnailPath) {
      lines.push(`![[${localThumbnailPath}]]`);
    } else {
      lines.push(`![thumbnail](${videoData.thumbnailUrl})`);
    }
    lines.push("");
  }

  // Video embed link
  lines.push(`## ${videoData.title}`);
  lines.push("");
  lines.push(`▶️ [Watch on YouTube](${videoData.url})`);
  lines.push("");

  if (videoData.channelName && settings.includeChannel) {
    lines.push(`**Channel:** [${videoData.channelName}](${videoData.channelUrl || "#"})`);
    lines.push("");
  }

  if (videoData.description) {
    lines.push("## Description");
    lines.push("");
    lines.push(videoData.description.slice(0, 500) + (videoData.description.length > 500 ? "..." : ""));
    lines.push("");
  }

  lines.push("## Notes");
  lines.push("");
  lines.push("> _Your notes here_");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates complete note content (frontmatter + body).
 */
export function generateNoteContent(options: NoteCreationOptions): string {
  const { videoData, settings, localThumbnailPath } = options;
  const frontmatter = generateNoteFrontmatter(videoData, settings, localThumbnailPath);
  const body = generateNoteBody(videoData, settings, localThumbnailPath);
  return `${frontmatter}\n\n${body}`;
}

/**
 * Recursively ensures all segments of a folder path exist in the vault.
 */
async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
  const normalized = normalizePath(folderPath);
  if (normalized === "/" || normalized === ".") return;

  if (await app.vault.adapter.exists(normalized)) return;

  // Ensure parent exists first
  const parts = normalized.split("/");
  if (parts.length > 1) {
    await ensureFolderExists(app, parts.slice(0, -1).join("/"));
  }

  try {
    await app.vault.createFolder(normalized);
  } catch (e) {
    // Another async operation may have created it — ignore "already exists" errors
    if (!(e instanceof Error) || !e.message.includes("already exists")) {
      throw e;
    }
  }
}

/**
 * Downloads the video thumbnail and saves it to the vault.
 */
export async function downloadThumbnail(
  app: App,
  videoData: YouTubeVideoData,
  thumbnailDir: string
): Promise<string | null> {
  try {
    // Ensure thumbnail directory (and any parents) exist
    await ensureFolderExists(app, thumbnailDir);

    const normalizedDir = normalizePath(thumbnailDir);

    // Try maxres first, fall back to hqdefault, then default quality
    let imageData: ArrayBuffer | null = null;
    const urlsToTry = [
      videoData.thumbnailUrlMaxRes,
      videoData.thumbnailUrl,
      buildThumbnailUrl(videoData.videoId, "sddefault"),
      buildThumbnailUrl(videoData.videoId, "mqdefault"),
    ];

    for (const url of urlsToTry) {
      try {
        const response = await requestUrl({ url, method: "GET" });
        if (response.status === 200) {
          const buf = response.arrayBuffer;
          if (buf && buf.byteLength > 2000) {
            imageData = buf;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (!imageData) {
      console.warn("YouTube Search: Failed to download thumbnail from any URL");
      return null;
    }

    const filename = `${videoData.videoId}.jpg`;
    const filePath = normalizePath(`${normalizedDir}/${filename}`);

    // If already downloaded previously, reuse it
    if (!(await app.vault.adapter.exists(filePath))) {
      await app.vault.createBinary(filePath, imageData);
    }

    return filePath;
  } catch (error) {
    console.error("YouTube Search: Error downloading thumbnail:", error);
    return null;
  }
}

/**
 * Creates the note file in the vault.
 */
export async function createVideoNote(
  app: App,
  videoData: YouTubeVideoData,
  settings: YouTubeSearchSettings
): Promise<TFile> {
  // Sanitize the title for use in filenames and note content.
  // Obsidian forbids: \ / : * ? " < > | # ^ [ ]
  // YouTube titles commonly contain colons and other illegal chars.
  const sanitizedVideoData: YouTubeVideoData = {
    ...videoData,
    title: sanitizeVideoTitle(videoData.title),
  };
  videoData = sanitizedVideoData;

  // Download thumbnail if local saving is enabled
  let localThumbnailPath: string | undefined;
  if (settings.saveLocalThumbnail && settings.thumbnailDirectory) {
    const thumbnailPath = await downloadThumbnail(app, videoData, settings.thumbnailDirectory);
    if (thumbnailPath) localThumbnailPath = thumbnailPath;
  }

  // Determine target folder
  const targetFolder = normalizePath(settings.noteLocation || "/");

  // Ensure folder exists
  if (targetFolder !== "/" && !(await app.vault.adapter.exists(targetFolder))) {
    await app.vault.createFolder(targetFolder);
  }

  // Determine filename
  const filenameTpl = settings.filenameTemplate || "{{title}}";
  let filename = renderTemplate(filenameTpl, videoData, localThumbnailPath);
  filename = sanitizeFilename(filename);
  if (!filename) filename = sanitizeFilename(videoData.title) || videoData.videoId;

  let filePath = normalizePath(`${targetFolder}/${filename}.md`);

  // Handle duplicate filenames
  if (await app.vault.adapter.exists(filePath)) {
    let counter = 1;
    while (await app.vault.adapter.exists(normalizePath(`${targetFolder}/${filename} (${counter}).md`))) {
      counter++;
    }
    filePath = normalizePath(`${targetFolder}/${filename} (${counter}).md`);
  }

  const content = generateNoteContent({ videoData, settings, localThumbnailPath });
  const file = await app.vault.create(filePath, content);
  return file;
}

function escapeFrontmatterValue(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\n/g, " ");
}
