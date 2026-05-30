import { Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, type YouTubeSearchSettings } from "./settings/settings";
import { YouTubeSearchSettingTab } from "./settings/settingTab";
import { YouTubeUrlModal } from "./modals/urlModal";
import { VideoPreviewModal } from "./modals/previewModal";
import { LoadingModal } from "./modals/loadingModal";
import { fetchYouTubeVideoData } from "./utils/youtube";
import { createVideoNote } from "./utils/noteCreator";
import type { YouTubeVideoData } from "./types";

// SVG ribbon icon
const YOUTUBE_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
</svg>`;

export default class YouTubeSearchPlugin extends Plugin {
  settings!: YouTubeSearchSettings;

  async onload() {
    await this.loadSettings();

    // Register ribbon icon
    this.addRibbonIcon(YOUTUBE_ICON, "Add YouTube video", () => {
      this.openUrlModal();
    });

    // Register command
    this.addCommand({
      id: "add-youtube-video",
      name: "Add YouTube video",
      callback: () => {
        this.openUrlModal();
      },
    });

    // Register command to add from clipboard
    this.addCommand({
      id: "add-youtube-video-from-clipboard",
      name: "Add YouTube video from clipboard URL",
      callback: async () => {
        await this.addVideoFromClipboard();
      },
    });

    // Settings tab
    this.addSettingTab(new YouTubeSearchSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Opens the URL input modal — entry point for the normal flow.
   */
  openUrlModal() {
    new YouTubeUrlModal(this.app, async (videoId: string, url: string) => {
      await this.fetchAndPreview(videoId, url);
    }).open();
  }

  /**
   * Tries to read a YouTube URL from the clipboard and skip the URL modal.
   */
  async addVideoFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const { extractVideoId, isValidYouTubeUrl } = await import("./utils/youtube");

      if (!text || !isValidYouTubeUrl(text)) {
        new Notice("No valid YouTube URL found in clipboard.");
        this.openUrlModal();
        return;
      }

      const videoId = extractVideoId(text);
      if (!videoId) {
        new Notice("Could not extract video ID from clipboard URL.");
        this.openUrlModal();
        return;
      }

      await this.fetchAndPreview(videoId, text);
    } catch {
      // If clipboard read fails, fall back to manual input
      this.openUrlModal();
    }
  }

  /**
   * Checks if a note for this videoId already exists in the vault.
   * Returns the matching TFile, or null if none found.
   */
  findExistingNoteByVideoId(videoId: string): TFile | null {
    const files = this.app.vault.getMarkdownFiles();
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      if (!fm) continue;
      if (fm["videoId"] && String(fm["videoId"]) === videoId) return file;
      if (fm["url"] && String(fm["url"]) === videoUrl) return file;
    }
    return null;
  }

  /**
   * Fetches video data and opens the preview modal.
   */
  async fetchAndPreview(videoId: string, url: string) {
    const loadingModal = new LoadingModal(this.app, "Fetching video data…");
    loadingModal.open();

    let videoData: YouTubeVideoData;

    try {
      videoData = await fetchYouTubeVideoData(videoId);
    } catch (error) {
      loadingModal.close();
      const message = error instanceof Error ? error.message : "Unknown error";
      new Notice(`YouTube Search: ${message}`, 5000);
      // Re-open URL modal so user can try again
      this.openUrlModal();
      return;
    }

    loadingModal.close();

    // Check for duplicate before showing preview
    const existingNote = this.findExistingNoteByVideoId(videoData.videoId);

    new VideoPreviewModal(
      this.app,
      videoData,
      existingNote,
      async (confirmedData: YouTubeVideoData) => {
        await this.createNote(confirmedData);
      },
      () => {
        // Back button — re-open URL modal
        this.openUrlModal();
      }
    ).open();
  }

  /**
   * Creates the note and notifies the user.
   */
  async createNote(videoData: YouTubeVideoData) {
    const loadingModal = new LoadingModal(this.app, "Creating note…");
    loadingModal.open();

    try {
      const file: TFile = await createVideoNote(this.app, videoData, this.settings);
      loadingModal.close();

      new Notice(`✓ Note created: ${file.basename}`, 4000);

      if (this.settings.openNoteAfterCreation) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
      }
    } catch (error) {
      loadingModal.close();
      const message = error instanceof Error ? error.message : "Unknown error";
      new Notice(`YouTube Search: Failed to create note — ${message}`, 5000);
      console.error("YouTube Search plugin error:", error);
    }
  }
}
