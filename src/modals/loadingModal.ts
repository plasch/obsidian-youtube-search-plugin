import { App, Modal } from "obsidian";

export class LoadingModal extends Modal {
  private message: string;

  constructor(app: App, message = "Fetching video data…") {
    super(app);
    this.message = message;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("youtube-search-loading-modal");

    const wrapper = contentEl.createDiv("youtube-loading-wrapper");

    // Animated YouTube logo
    const spinner = wrapper.createDiv("youtube-loading-spinner");
    spinner.innerHTML = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
        <circle cx="50" cy="50" r="40" stroke="var(--color-red)" stroke-width="6" fill="none"
          stroke-dasharray="188" stroke-dashoffset="0" class="youtube-spinner-circle"/>
        <path d="M40 33l27 17-27 17z" fill="var(--color-red)"/>
      </svg>
    `;

    wrapper.createEl("p", {
      text: this.message,
      cls: "youtube-loading-text",
    });

    // This modal is not closable by the user — it's closed programmatically
    this.modalEl.style.pointerEvents = "none";
  }

  onClose() {
    this.contentEl.empty();
  }
}
