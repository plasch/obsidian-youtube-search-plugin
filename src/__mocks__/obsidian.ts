import { vi } from 'vitest'

export const requestUrl = vi.fn()

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/\/+/g, '/').replace(/\/$/, '') || '/'
}

export class App {
  vault = {
    adapter: { exists: vi.fn(async () => false) },
    createFolder: vi.fn(async () => {}),
    createBinary: vi.fn(async () => {}),
    create: vi.fn(async (path: string) => ({ path, basename: path.split('/').pop()?.replace('.md', ''), extension: 'md' })),
    getMarkdownFiles: vi.fn(() => []),
    getAllLoadedFiles: vi.fn(() => []),
  }
  metadataCache = { getFileCache: vi.fn(() => null) }
  workspace = { getLeaf: vi.fn(() => ({ openFile: vi.fn() })) }
  keymap = { pushScope: vi.fn(), popScope: vi.fn() }
  dom = { appContainerEl: null as any }
}

export class TAbstractFile {
  path = ''
  vault: any = null
  parent: any = null
}

export class TFile extends TAbstractFile {
  basename = ''
  extension = 'md'
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = []
  isRoot(): boolean { return this.path === '/' || this.path === '' }
}

export class Scope {
  register = vi.fn()
}

export class Modal {
  contentEl: any
  constructor(public app: any) {
    const makeEl = () => ({
      addEventListener: vi.fn(),
      style: {} as CSSStyleDeclaration,
      addClass: vi.fn(),
      removeClass: vi.fn(),
      setText: vi.fn(),
      innerHTML: '',
      value: '',
    })
    this.contentEl = {
      createEl: vi.fn(() => makeEl()),
      createDiv: vi.fn(() => ({ ...makeEl(), createEl: vi.fn(() => makeEl()) })),
      addClass: vi.fn(),
      empty: vi.fn(),
    }
  }
  open() {}
  close() {}
}

export class Plugin {
  app: any
  constructor(app: any, _manifest: any) { this.app = app }
  addRibbonIcon = vi.fn()
  addCommand = vi.fn()
  addSettingTab = vi.fn()
  loadData = vi.fn(async () => ({}))
  saveData = vi.fn()
}

export class PluginSettingTab {
  constructor(public app: any, public plugin: any) {}
  display() {}
}

export class Setting {
  constructor(_containerEl: any) {}
  setName = vi.fn(() => this)
  setDesc = vi.fn(() => this)
  addText = vi.fn(() => this)
  addToggle = vi.fn(() => this)
  addTextArea = vi.fn(() => this)
  addButton = vi.fn(() => this)
}

export class Notice {
  constructor(_message: string, _timeout?: number) {}
}
