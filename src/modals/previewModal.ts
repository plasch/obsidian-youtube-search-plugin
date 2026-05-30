import { App, Modal, TFile } from "obsidian";
import type { YouTubeVideoData } from "../types";

export class VideoPreviewModal extends Modal {
  private videoData: YouTubeVideoData;
  private existingNote: TFile | null;
  private onConfirm: (videoData: YouTubeVideoData) => void;
  private onBack: () => void;

  constructor(
    app: App,
    videoData: YouTubeVideoData,
    existingNote: TFile | null,
    onConfirm: (videoData: YouTubeVideoData) => void,
    onBack: () => void
  ) {
    super(app);
    this.videoData = videoData;
    this.existingNote = existingNote;
    this.onConfirm = onConfirm;
    this.onBack = onBack;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("youtube-search-preview-modal");

    contentEl.createEl("h2", { text: "Video Found" });
    contentEl.createEl("p", {
      text: "Review the video details and create a note.",
      cls: "youtube-search-subtitle",
    });

    // Duplicate warning banner
    if (this.existingNote) {
      const dupeWarning = contentEl.createDiv("youtube-dupe-warning");
      dupeWarning.innerHTML = `
        <span class="youtube-dupe-icon">⚠️</span>
        <span>A note for this video already exists: <strong>${this.existingNote.basename}</strong>. Creating another will make a duplicate.</span>
      `;
    }

    // Video card
    const card = contentEl.createDiv("youtube-video-card");

    // Thumbnail
    const thumbContainer = card.createDiv("youtube-thumb-container");
    const img = thumbContainer.createEl("img", {
      cls: "youtube-thumb",
    });
    img.src = this.videoData.thumbnailUrl;
    img.alt = this.videoData.title;
    img.onerror = () => {
      thumbContainer.innerHTML = `<div class="youtube-thumb-placeholder">
        <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
          <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
        </svg>
      </div>`;
    };

    // Play overlay
    const playOverlay = thumbContainer.createDiv("youtube-play-overlay");
    playOverlay.innerHTML = `<svg viewBox="0 0 24 24" fill="white" width="32" height="32"><path d="M8 5v14l11-7z"/></svg>`;
    playOverlay.addEventListener("click", () => {
      window.open(this.videoData.url, "_blank");
    });

    // Video info
    const info = card.createDiv("youtube-video-info");

    const title = info.createEl("h3", {
      text: this.videoData.title,
      cls: "youtube-video-title",
    });

    if (this.videoData.channelName) {
      const channelRow = info.createDiv("youtube-channel-row");
      const channelIcon = channelRow.createDiv("youtube-channel-icon");
      channelIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`;
      channelRow.createEl("span", {
        text: this.videoData.channelName,
        cls: "youtube-channel-name",
      });
    }

    // Meta row
    const metaRow = info.createDiv("youtube-meta-row");

    if (this.videoData.publishedAt) {
      this.createMetaBadge(metaRow, "📅", this.videoData.publishedAt);
    }

    if (this.videoData.viewCount) {
      this.createMetaBadge(metaRow, "👁", this.videoData.viewCount + " views");
    }

    // URL row
    const urlRow = info.createDiv("youtube-url-row");
    const urlLink = urlRow.createEl("a", {
      text: this.videoData.url,
      href: this.videoData.url,
      cls: "youtube-url-link",
    });
    urlLink.setAttr("target", "_blank");
    urlLink.setAttr("rel", "noopener noreferrer");

    // Tags preview
    if (this.videoData.tags.length > 0) {
      const tagsContainer = info.createDiv("youtube-tags-container");
      for (const tag of this.videoData.tags.slice(0, 6)) {
        tagsContainer.createEl("span", { text: tag, cls: "youtube-tag" });
      }
      if (this.videoData.tags.length > 6) {
        tagsContainer.createEl("span", {
          text: `+${this.videoData.tags.length - 6} more`,
          cls: "youtube-tag youtube-tag-more",
        });
      }
    }

    // Buttons
    const buttonRow = contentEl.createDiv("youtube-search-button-row");

    const backBtn = buttonRow.createEl("button", {
      text: "← Back",
      cls: "youtube-search-btn-cancel",
    });
    backBtn.addEventListener("click", () => {
      this.close();
      this.onBack();
    });

    const createBtn = buttonRow.createEl("button", {
      text: "✓ Create Note",
      cls: "youtube-search-btn-submit",
    });
    createBtn.addEventListener("click", () => {
      this.close();
      this.onConfirm(this.videoData);
    });
  }

  private createMetaBadge(container: HTMLElement, icon: string, text: string): HTMLElement {
    const badge = container.createDiv("youtube-meta-badge");
    badge.createEl("span", { text: icon, cls: "youtube-meta-icon" });
    badge.createEl("span", { text });
    return badge;
  }

  onClose() {
    this.contentEl.empty();
  }
}
