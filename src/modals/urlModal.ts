import { App, Modal, Notice } from "obsidian";
import { extractVideoId, isValidYouTubeUrl } from "../utils/youtube";

export class YouTubeUrlModal extends Modal {
  private onSubmit: (videoId: string, url: string) => void;
  private inputEl!: HTMLInputElement;

  constructor(app: App, onSubmit: (videoId: string, url: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("youtube-search-url-modal");

    // Header
    contentEl.createEl("h2", { text: "Add YouTube Video" });
    contentEl.createEl("p", {
      text: "Paste a YouTube video URL to create a note.",
      cls: "youtube-search-subtitle",
    });

    // Input area
    const inputContainer = contentEl.createDiv("youtube-search-input-container");

    const youtubeIcon = inputContainer.createDiv("youtube-search-yt-icon");
    youtubeIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
    </svg>`;

    this.inputEl = inputContainer.createEl("input", {
      type: "text",
      placeholder: "https://www.youtube.com/watch?v=...",
      cls: "youtube-search-url-input",
    });

    // Error message container
    const errorEl = contentEl.createDiv("youtube-search-error");
    errorEl.style.display = "none";

    // Supported formats hint
    const hintEl = contentEl.createDiv("youtube-search-hint");
    hintEl.innerHTML = `
      <strong>Supported formats:</strong><br>
      youtube.com/watch?v=ID &nbsp;•&nbsp; youtu.be/ID &nbsp;•&nbsp; youtube.com/shorts/ID
    `;

    // Buttons
    const buttonContainer = contentEl.createDiv("youtube-search-button-row");

    const cancelBtn = buttonContainer.createEl("button", {
      text: "Cancel",
      cls: "youtube-search-btn-cancel",
    });
    cancelBtn.addEventListener("click", () => this.close());

    const submitBtn = buttonContainer.createEl("button", {
      text: "Search Video",
      cls: "youtube-search-btn-submit",
    });

    const handleSubmit = () => {
      const url = this.inputEl.value.trim();
      if (!url) {
        this.showError(errorEl, "Please enter a YouTube URL.");
        return;
      }
      if (!isValidYouTubeUrl(url)) {
        this.showError(errorEl, "This doesn't look like a valid YouTube URL. Please try again.");
        return;
      }
      const videoId = extractVideoId(url);
      if (!videoId) {
        this.showError(errorEl, "Could not extract video ID from URL.");
        return;
      }
      errorEl.style.display = "none";
      this.close();
      this.onSubmit(videoId, url);
    };

    submitBtn.addEventListener("click", handleSubmit);
    this.inputEl.addEventListener("keydown", e => {
      if (e.key === "Enter") handleSubmit();
    });

    // Clear error message as soon as the user edits the input
    this.inputEl.addEventListener("input", () => {
      errorEl.style.display = "none";
      this.inputEl.removeClass("youtube-search-input-error");
    });

    // Auto-paste from clipboard
    this.tryPasteFromClipboard();

    // Focus input
    setTimeout(() => this.inputEl.focus(), 50);
  }

  private showError(el: HTMLElement, message: string) {
    el.setText(message);
    el.style.display = "block";
    this.inputEl.addClass("youtube-search-input-error");
    setTimeout(() => {
      el.style.display = "none";
      this.inputEl.removeClass("youtube-search-input-error");
    }, 3000);
  }

  private async tryPasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && isValidYouTubeUrl(text)) {
        this.inputEl.value = text;
      }
    } catch {
      // Clipboard access denied — no problem
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
