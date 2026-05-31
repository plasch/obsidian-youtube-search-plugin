import { App, PluginSettingTab, Setting, setIcon } from "obsidian";
import type YouTubeSearchPlugin from "../main";
import { DEFAULT_NOTE_TEMPLATE } from "./settings";
import { FolderSuggest } from "./folderSuggest";

export class YouTubeSearchSettingTab extends PluginSettingTab {
  plugin: YouTubeSearchPlugin;

  constructor(app: App, plugin: YouTubeSearchPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "YouTube Search Settings" });

    // ── Note Creation ──────────────────────────────────────────────────────
    containerEl.createEl("h3", { text: "Note Creation" });

    new Setting(containerEl)
      .setName("Note location")
      .setDesc("Folder where new video notes will be saved. Leave empty for vault root.")
      .addText(text => {
        new FolderSuggest(this.app, text.inputEl);

        const wrapper = document.createElement("div");
        wrapper.className = "yt-folder-input-wrapper";
        text.inputEl.parentElement!.insertBefore(wrapper, text.inputEl);

        const iconEl = document.createElement("span");
        iconEl.className = "yt-folder-input-icon";
        setIcon(iconEl, "search");
        wrapper.appendChild(iconEl);
        wrapper.appendChild(text.inputEl);

        text
          .setPlaceholder("YouTube")
          .setValue(this.plugin.settings.noteLocation)
          .onChange(async value => {
            this.plugin.settings.noteLocation = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Filename template")
      .setDesc(
        "Template for the note filename. Available: {{title}}, {{videoId}}, {{channelName}}, {{date}}."
      )
      .addText(text =>
        text
          .setPlaceholder("{{title}}")
          .setValue(this.plugin.settings.filenameTemplate)
          .onChange(async value => {
            this.plugin.settings.filenameTemplate = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Open note after creation")
      .setDesc("Automatically open the new note after it's created.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.openNoteAfterCreation)
          .onChange(async value => {
            this.plugin.settings.openNoteAfterCreation = value;
            await this.plugin.saveSettings();
          })
      );

    // ── Properties ────────────────────────────────────────────────────────
    containerEl.createEl("h3", { text: "Note Properties" });

    new Setting(containerEl)
      .setName("Include channel info")
      .setDesc("Add channelName and channelUrl to the note frontmatter.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.includeChannel)
          .onChange(async value => {
            this.plugin.settings.includeChannel = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Include thumbnail")
      .setDesc("Add thumbnailUrl property and show thumbnail image in the note.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.includeThumbnail)
          .onChange(async value => {
            this.plugin.settings.includeThumbnail = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Include tags")
      .setDesc("Add video tags from YouTube to the note frontmatter.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.includeTags)
          .onChange(async value => {
            this.plugin.settings.includeTags = value;
            await this.plugin.saveSettings();
          })
      );

    // "Include video info" — parent toggle. Controls visibility of the three rows below.
    new Setting(containerEl)
      .setName("Include video info")
      .setDesc("Add videoId, publishedAt, and viewCount to the note frontmatter.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.includeVideoInfo)
          .onChange(async value => {
            this.plugin.settings.includeVideoInfo = value;
            await this.plugin.saveSettings();
          })
      );

    // ── Thumbnail ─────────────────────────────────────────────────────────
    containerEl.createEl("h3", { text: "Thumbnail" });

    new Setting(containerEl)
      .setName("Save thumbnail locally")
      .setDesc(
        "Download and save the video thumbnail image to your vault. The thumbnailUrl property will link to the local file instead of the remote URL."
      )
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.saveLocalThumbnail)
          .onChange(async value => {
            this.plugin.settings.saveLocalThumbnail = value;
            await this.plugin.saveSettings();
            this.display(); // Refresh to show/hide directory setting
          })
      );

    if (this.plugin.settings.saveLocalThumbnail) {
      new Setting(containerEl)
        .setName("Thumbnail directory")
        .setDesc("Folder where downloaded thumbnails will be saved.")
        .addText(text => {
          new FolderSuggest(this.app, text.inputEl);

          const wrapper = document.createElement("div");
          wrapper.className = "yt-folder-input-wrapper";
          text.inputEl.parentElement!.insertBefore(wrapper, text.inputEl);

          const iconEl = document.createElement("span");
          iconEl.className = "yt-folder-input-icon";
          setIcon(iconEl, "search");
          wrapper.appendChild(iconEl);
          wrapper.appendChild(text.inputEl);

          text
            .setPlaceholder("YouTube/thumbnails")
            .setValue(this.plugin.settings.thumbnailDirectory)
            .onChange(async value => {
              this.plugin.settings.thumbnailDirectory = value;
              await this.plugin.saveSettings();
            });
        });
    }

    // ── Custom Template ───────────────────────────────────────────────────
    containerEl.createEl("h3", { text: "Custom Note Template" });

    const templateSetting = new Setting(containerEl)
      .setName("Note content template")
      .setDesc(
        "Template for the note body (frontmatter is always auto-generated above). Clear to create notes with frontmatter only. " +
        "Variables: {{title}}, {{videoId}}, {{url}}, {{embedUrl}}, {{channelName}}, {{channelUrl}}, " +
        "{{channelId}}, {{thumbnailUrl}}, {{thumbnailUrlRemote}}, {{description}}, {{publishedAt}}, " +
        "{{viewCount}}, {{tags}}, {{date}}, {{time}}."
      );

    // Place the textarea directly under the setting-item-info block (below name + desc),
    // spanning the full width of the setting element instead of sitting in the control column.
    const textArea = document.createElement("textarea");
    textArea.placeholder = "No template — notes will be created without one.";
    textArea.value = this.plugin.settings.noteContentTemplate;
    textArea.rows = 16;
    textArea.style.width = "100%";
    textArea.style.marginTop = "8px";
    textArea.style.fontFamily = "var(--font-monospace)";
    textArea.style.fontSize = "0.85em";
    textArea.style.resize = "vertical";
    textArea.style.boxSizing = "border-box";
    textArea.addEventListener("input", async () => {
      this.plugin.settings.noteContentTemplate = textArea.value;
      await this.plugin.saveSettings();
    });

    // Append textarea inside the setting-item element, after the info div
    templateSetting.settingEl.style.flexWrap = "wrap";
    templateSetting.settingEl.style.alignItems = "flex-start";
    templateSetting.settingEl.appendChild(textArea);

    new Setting(containerEl)
      .setName("Reset to default template")
      .setDesc("Restore the default template.")
      .addButton(btn =>
        btn
          .setButtonText("Load default template")
          .onClick(async () => {
            this.plugin.settings.noteContentTemplate = DEFAULT_NOTE_TEMPLATE;
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }
}
