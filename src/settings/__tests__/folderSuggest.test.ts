import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

// Must be hoisted before module imports
vi.mock('@popperjs/core', () => ({
  createPopper: vi.fn(() => ({ destroy: vi.fn() })),
}))

import { FolderSuggest } from '../folderSuggest'
import { TAbstractFile, TFile, TFolder } from 'obsidian'

// Obsidian adds String.prototype.contains as an alias for includes at runtime
beforeAll(() => {
  if (!('contains' in String.prototype)) {
    Object.defineProperty(String.prototype, 'contains', {
      value(str: string) { return (this as string).includes(str) },
      configurable: true,
      writable: true,
    })
  }
})

afterAll(() => {
  delete (String.prototype as any).contains
})

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEl(): any {
  const el: any = {
    addClass: vi.fn(),
    removeClass: vi.fn(),
    setText: vi.fn(),
    empty: vi.fn(),
    detach: vi.fn(),
    scrollIntoView: vi.fn(),
    appendChild: vi.fn(),
    on: vi.fn(),
  }
  el.createDiv = vi.fn(() => makeEl())
  return el
}

function makeInputEl(initialValue = ''): any {
  return {
    value: initialValue,
    addEventListener: vi.fn(),
    trigger: vi.fn(),
  }
}

function makeApp(files: TAbstractFile[] = []) {
  return {
    vault: { getAllLoadedFiles: vi.fn(() => files) },
    keymap: { pushScope: vi.fn(), popScope: vi.fn() },
    dom: { appContainerEl: makeEl() },
  }
}

function makeFolder(path: string): TFolder {
  const f = new TFolder()
  f.path = path
  return f
}

beforeEach(() => {
  vi.stubGlobal('createDiv', vi.fn(() => makeEl()))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── FolderSuggest.getSuggestions ───────────────────────────────────────────

describe('FolderSuggest.getSuggestions', () => {
  it('returns only TFolder instances, not TFile or other types', () => {
    const files: TAbstractFile[] = [makeFolder('notes'), new TFile(), makeFolder('YouTube')]
    const suggest = new FolderSuggest(makeApp(files) as any, makeInputEl() as any)

    const results = suggest.getSuggestions('')
    expect(results).toHaveLength(2)
    expect(results.every(f => f instanceof TFolder)).toBe(true)
  })

  it('returns all folders when the input string is empty', () => {
    const files = [makeFolder('a'), makeFolder('b'), makeFolder('c')]
    const suggest = new FolderSuggest(makeApp(files) as any, makeInputEl() as any)

    expect(suggest.getSuggestions('')).toHaveLength(3)
  })

  it('filters folders case-insensitively by path prefix', () => {
    const files = [makeFolder('YouTube'), makeFolder('notes'), makeFolder('YouTube/thumbnails')]
    const suggest = new FolderSuggest(makeApp(files) as any, makeInputEl() as any)

    const results = suggest.getSuggestions('you')
    expect(results.map(f => f.path)).toEqual(['YouTube', 'YouTube/thumbnails'])
  })

  it('matches on any substring of the path', () => {
    const files = [makeFolder('YouTube'), makeFolder('YouTube/thumbnails'), makeFolder('notes')]
    const suggest = new FolderSuggest(makeApp(files) as any, makeInputEl() as any)

    expect(suggest.getSuggestions('thumbnails').map(f => f.path)).toEqual(['YouTube/thumbnails'])
  })

  it('returns empty array when no folders match the input', () => {
    const suggest = new FolderSuggest(makeApp([makeFolder('notes')]) as any, makeInputEl() as any)

    expect(suggest.getSuggestions('youtube')).toHaveLength(0)
  })

  it('returns empty array when the vault has no files', () => {
    const suggest = new FolderSuggest(makeApp([]) as any, makeInputEl() as any)

    expect(suggest.getSuggestions('')).toHaveLength(0)
  })

  it('is case-insensitive in both path and query', () => {
    const files = [makeFolder('UPPERCASE'), makeFolder('lowercase')]
    const suggest = new FolderSuggest(makeApp(files) as any, makeInputEl() as any)

    expect(suggest.getSuggestions('UPPER').map(f => f.path)).toEqual(['UPPERCASE'])
    expect(suggest.getSuggestions('LOW').map(f => f.path)).toEqual(['lowercase'])
  })
})

// ── FolderSuggest.renderSuggestion ────────────────────────────────────────

describe('FolderSuggest.renderSuggestion', () => {
  it('sets the element text to the folder path', () => {
    const suggest = new FolderSuggest(makeApp() as any, makeInputEl() as any)
    const el = makeEl()
    suggest.renderSuggestion(makeFolder('YouTube/thumbnails'), el)

    expect(el.setText).toHaveBeenCalledWith('YouTube/thumbnails')
    expect(el.setText).toHaveBeenCalledOnce()
  })

  it('sets text for a root-level folder', () => {
    const suggest = new FolderSuggest(makeApp() as any, makeInputEl() as any)
    const el = makeEl()
    suggest.renderSuggestion(makeFolder('notes'), el)

    expect(el.setText).toHaveBeenCalledWith('notes')
  })
})

// ── FolderSuggest.selectSuggestion ────────────────────────────────────────

describe('FolderSuggest.selectSuggestion', () => {
  it('writes the selected folder path into the input element', () => {
    const inputEl = makeInputEl()
    const suggest = new FolderSuggest(makeApp() as any, inputEl as any)

    suggest.selectSuggestion(makeFolder('YouTube'))

    expect(inputEl.value).toBe('YouTube')
  })

  it('triggers an input event so onChange handlers fire', () => {
    const inputEl = makeInputEl()
    const suggest = new FolderSuggest(makeApp() as any, inputEl as any)

    suggest.selectSuggestion(makeFolder('YouTube'))

    expect(inputEl.trigger).toHaveBeenCalledWith('input')
  })

  it('closes the dropdown after selection', () => {
    const suggest = new FolderSuggest(makeApp() as any, makeInputEl() as any)
    const closeSpy = vi.spyOn(suggest, 'close')

    suggest.selectSuggestion(makeFolder('YouTube'))

    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('writes nested folder paths correctly', () => {
    const inputEl = makeInputEl()
    const suggest = new FolderSuggest(makeApp() as any, inputEl as any)

    suggest.selectSuggestion(makeFolder('YouTube/thumbnails'))

    expect(inputEl.value).toBe('YouTube/thumbnails')
  })
})

// ── TextInputSuggest.onInputChanged ───────────────────────────────────────

describe('TextInputSuggest.onInputChanged', () => {
  it('opens the dropdown when suggestions are found', () => {
    const inputEl = makeInputEl('you')
    const files = [makeFolder('YouTube'), makeFolder('YouTube/thumbnails')]
    const suggest = new FolderSuggest(makeApp(files) as any, inputEl as any)
    const openSpy = vi.spyOn(suggest, 'open')

    suggest.onInputChanged()

    expect(openSpy).toHaveBeenCalledOnce()
  })

  it('closes the dropdown when no suggestions match', () => {
    const inputEl = makeInputEl('zzz')
    const suggest = new FolderSuggest(makeApp([makeFolder('notes')]) as any, inputEl as any)
    const closeSpy = vi.spyOn(suggest, 'close')

    suggest.onInputChanged()

    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('closes when the vault is empty', () => {
    const suggest = new FolderSuggest(makeApp([]) as any, makeInputEl('any') as any)
    const closeSpy = vi.spyOn(suggest, 'close')

    suggest.onInputChanged()

    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('uses the current inputEl.value when filtering', () => {
    // 'notes' in the input → only 'notes' folder matches, open is called
    const inputEl = makeInputEl('notes')
    const files = [makeFolder('YouTube'), makeFolder('notes')]
    const suggest = new FolderSuggest(makeApp(files) as any, inputEl as any)
    const openSpy = vi.spyOn(suggest, 'open')

    suggest.onInputChanged()

    expect(openSpy).toHaveBeenCalledOnce()
  })
})

// ── TextInputSuggest.close ────────────────────────────────────────────────

describe('TextInputSuggest.close', () => {
  it('pops the scope from the app keymap', () => {
    const app = makeApp()
    const suggest = new FolderSuggest(app as any, makeInputEl() as any)

    suggest.close()

    expect(app.keymap.popScope).toHaveBeenCalledOnce()
  })

  it('detaches the suggestion container element from the DOM', () => {
    const suggestEl = makeEl()
    vi.stubGlobal('createDiv', vi.fn(() => suggestEl))
    const suggest = new FolderSuggest(makeApp() as any, makeInputEl() as any)

    suggest.close()

    expect(suggestEl.detach).toHaveBeenCalledOnce()
  })

  it('does not throw when called before open (no popper instance)', () => {
    const suggest = new FolderSuggest(makeApp() as any, makeInputEl() as any)

    expect(() => suggest.close()).not.toThrow()
  })

  it('destroys the popper instance when one was created by open', async () => {
    const { createPopper } = await import('@popperjs/core')
    const destroy = vi.fn()
    vi.mocked(createPopper).mockReturnValueOnce({ destroy } as any)

    const suggest = new FolderSuggest(makeApp() as any, makeInputEl() as any)
    suggest.open(makeEl(), makeInputEl())
    suggest.close()

    expect(destroy).toHaveBeenCalledOnce()
  })
})
