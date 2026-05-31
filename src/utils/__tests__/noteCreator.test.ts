import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import type { YouTubeVideoData } from '../../types'
import type { YouTubeSearchSettings } from '../../settings/settings'
import {
  sanitizeFilename,
  sanitizeVideoTitle,
  renderTemplate,
  generateNoteFrontmatter,
  generateNoteBody,
  generateNoteContent,
} from '../noteCreator'

// Freeze time so date-dependent output is deterministic
const FROZEN_DATE = new Date('2024-06-15T09:30:00.000Z')

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FROZEN_DATE)
})

afterAll(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const video: YouTubeVideoData = {
  videoId: 'dQw4w9WgXcQ',
  title: 'Never Gonna Give You Up',
  description: 'The official video for "Never Gonna Give You Up" by Rick Astley.',
  channelName: 'Rick Astley',
  channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
  channelUrl: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  thumbnailUrlMaxRes: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
  publishedAt: 'Oct 25, 2009',
  duration: '3:32',
  viewCount: '1.5B',
  likeCount: '16M',
  tags: ['rick astley', 'never gonna give you up', 'pop'],
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
}

const allOnSettings: YouTubeSearchSettings = {
  noteLocation: 'YouTube',
  filenameTemplate: '{{title}}',
  noteContentTemplate: '',
  includeChannel: true,
  includeThumbnail: true,
  includeTags: true,
  includeVideoInfo: true,
  saveLocalThumbnail: false,
  thumbnailDirectory: 'YouTube/thumbnails',
  openNoteAfterCreation: true,
}

const allOffSettings: YouTubeSearchSettings = {
  ...allOnSettings,
  includeChannel: false,
  includeThumbnail: false,
  includeTags: false,
  includeVideoInfo: false,
}

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------

describe('sanitizeFilename', () => {
  it.each([
    ['hello world', 'hello world'],
    ['Video: Part 1', 'Video Part 1'],
    ['File/name\\path', 'Filenamepath'],  // / and \ are removed without inserting spaces
    ['Name "quoted"', 'Name quoted'],
    ['Tags #one [two] ^three', 'Tags one two three'],
    ['  spaces  ', 'spaces'],
    ['a  b   c', 'a b c'],
  ])('sanitizes %j → %j', (input, expected) => {
    expect(sanitizeFilename(input)).toBe(expected)
  })

  it('removes all Obsidian-illegal characters', () => {
    const illegal = '\\/:*?"<>|#^[]'
    const result = sanitizeFilename(illegal)
    expect(result).toBe('')
  })

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(300)
    expect(sanitizeFilename(long)).toHaveLength(200)
  })

  it('does not truncate strings under 200 chars', () => {
    const short = 'a'.repeat(100)
    expect(sanitizeFilename(short)).toBe(short)
  })
})

// ---------------------------------------------------------------------------
// sanitizeVideoTitle
// ---------------------------------------------------------------------------

describe('sanitizeVideoTitle', () => {
  it('removes Obsidian-illegal characters', () => {
    // : " | are removed, then consecutive spaces are collapsed to one
    expect(sanitizeVideoTitle('My Video: "Special" | Edition')).toBe('My Video Special Edition')
  })

  it('collapses whitespace and trims', () => {
    expect(sanitizeVideoTitle('  hello   world  ')).toBe('hello world')
  })

  it('does not impose a length limit', () => {
    const long = 'a'.repeat(300)
    expect(sanitizeVideoTitle(long)).toHaveLength(300)
  })

  it('leaves ordinary titles unchanged', () => {
    expect(sanitizeVideoTitle('Never Gonna Give You Up')).toBe('Never Gonna Give You Up')
  })
})

// ---------------------------------------------------------------------------
// renderTemplate
// ---------------------------------------------------------------------------

describe('renderTemplate', () => {
  it('replaces all known placeholders', () => {
    const template = '{{title}} by {{channelName}} ({{videoId}})'
    const result = renderTemplate(template, video)

    expect(result).toBe('Never Gonna Give You Up by Rick Astley (dQw4w9WgXcQ)')
  })

  it('replaces {{url}} and {{embedUrl}}', () => {
    const result = renderTemplate('{{url}} | {{embedUrl}}', video)
    expect(result).toContain('watch?v=dQw4w9WgXcQ')
    expect(result).toContain('embed/dQw4w9WgXcQ')
  })

  it('replaces {{channelUrl}} and {{channelId}}', () => {
    const result = renderTemplate('{{channelUrl}} {{channelId}}', video)
    expect(result).toContain('UCuAXFkgsw1L7xaCfnd5JJOw')
  })

  it('uses thumbnailUrl for {{thumbnailUrl}} when no local path', () => {
    const result = renderTemplate('{{thumbnailUrl}}', video)
    expect(result).toBe(video.thumbnailUrl)
  })

  it('uses [[localPath]] for {{thumbnailUrl}} when local path provided', () => {
    const result = renderTemplate('{{thumbnailUrl}}', video, 'YouTube/thumbnails/dQw4w9WgXcQ.jpg')
    expect(result).toBe('[[YouTube/thumbnails/dQw4w9WgXcQ.jpg]]')
  })

  it('{{thumbnailUrlRemote}} always uses the remote URL', () => {
    const result = renderTemplate('{{thumbnailUrlRemote}}', video, 'local/path.jpg')
    expect(result).toBe(video.thumbnailUrl)
  })

  it('formats tags as quoted, comma-separated list', () => {
    const result = renderTemplate('{{tags}}', video)
    expect(result).toBe('"rick astley", "never gonna give you up", "pop"')
  })

  it('renders empty string for {{tags}} when tags array is empty', () => {
    const noTags = { ...video, tags: [] }
    expect(renderTemplate('{{tags}}', noTags)).toBe('')
  })

  it('replaces {{date}} with frozen date', () => {
    const result = renderTemplate('{{date}}', video)
    expect(result).toBe('2024-06-15')
  })

  it('replaces {{description}} and {{publishedAt}} and {{viewCount}} and {{likeCount}}', () => {
    const result = renderTemplate('{{publishedAt}} {{viewCount}} {{likeCount}}', video)
    expect(result).toBe('Oct 25, 2009 1.5B 16M')
  })

  it('leaves unknown placeholders intact', () => {
    const result = renderTemplate('{{unknown}}', video)
    expect(result).toBe('{{unknown}}')
  })

  it('replaces multiple occurrences of the same placeholder', () => {
    const result = renderTemplate('{{title}} and {{title}}', video)
    expect(result).toBe('Never Gonna Give You Up and Never Gonna Give You Up')
  })
})

// ---------------------------------------------------------------------------
// generateNoteFrontmatter
// ---------------------------------------------------------------------------

describe('generateNoteFrontmatter', () => {
  it('always includes title, url, and dateAdded', () => {
    const fm = generateNoteFrontmatter(video, allOffSettings)

    expect(fm).toContain('title: "Never Gonna Give You Up"')
    expect(fm).toContain(`url: "${video.url}"`)
    expect(fm).toContain('dateAdded: "2024-06-15"')
    expect(fm).toMatch(/^---/)
    expect(fm).toMatch(/---$/)
  })

  it('includes videoId when includeVideoInfo is true', () => {
    const fm = generateNoteFrontmatter(video, allOnSettings)
    expect(fm).toContain(`videoId: "${video.videoId}"`)
  })

  it('omits videoId when includeVideoInfo is false', () => {
    const fm = generateNoteFrontmatter(video, allOffSettings)
    expect(fm).not.toContain('videoId:')
  })

  it('includes publishedAt and viewCount when includeVideoInfo is true', () => {
    const fm = generateNoteFrontmatter(video, allOnSettings)
    expect(fm).toContain('publishedAt: "Oct 25, 2009"')
    expect(fm).toContain('viewCount: "1.5B"')
  })

  it('omits publishedAt when video has no publishedAt value', () => {
    const fm = generateNoteFrontmatter({ ...video, publishedAt: '' }, allOnSettings)
    expect(fm).not.toContain('publishedAt:')
  })

  it('includes channelName and channelUrl when includeChannel is true', () => {
    const fm = generateNoteFrontmatter(video, allOnSettings)
    expect(fm).toContain('channelName: "Rick Astley"')
    expect(fm).toContain(`channelUrl: "${video.channelUrl}"`)
  })

  it('omits channel fields when includeChannel is false', () => {
    const fm = generateNoteFrontmatter(video, allOffSettings)
    expect(fm).not.toContain('channelName:')
    expect(fm).not.toContain('channelUrl:')
  })

  it('includes thumbnailUrl when includeThumbnail is true', () => {
    const fm = generateNoteFrontmatter(video, allOnSettings)
    expect(fm).toContain('thumbnailUrl:')
  })

  it('omits thumbnailUrl when includeThumbnail is false', () => {
    const fm = generateNoteFrontmatter(video, allOffSettings)
    expect(fm).not.toContain('thumbnailUrl:')
  })

  it('uses [[localPath]] for thumbnailUrl when a local path is given', () => {
    const fm = generateNoteFrontmatter(video, allOnSettings, 'YouTube/thumbnails/dQw4w9WgXcQ.jpg')
    expect(fm).toContain('thumbnailUrl: "[[YouTube/thumbnails/dQw4w9WgXcQ.jpg]]"')
  })

  it('includes tags when includeTags is true and tags exist', () => {
    const fm = generateNoteFrontmatter(video, allOnSettings)
    expect(fm).toContain('tags:')
    expect(fm).toContain('  - "rick astley"')
    expect(fm).toContain('  - "pop"')
  })

  it('omits tags section when includeTags is false', () => {
    const fm = generateNoteFrontmatter(video, allOffSettings)
    expect(fm).not.toContain('tags:')
  })

  it('omits tags section when tags array is empty even with includeTags true', () => {
    const fm = generateNoteFrontmatter({ ...video, tags: [] }, allOnSettings)
    expect(fm).not.toContain('tags:')
  })

  it('caps tags at 10 entries', () => {
    const manyTags = Array.from({ length: 15 }, (_, i) => `tag${i}`)
    const fm = generateNoteFrontmatter({ ...video, tags: manyTags }, allOnSettings)

    const tagLines = fm.split('\n').filter(l => l.trim().startsWith('- "tag'))
    expect(tagLines).toHaveLength(10)
  })

  it('escapes double quotes in title and channel name', () => {
    const v = { ...video, title: 'Q&A "Special" Edition', channelName: 'Channel "Pro"' }
    const fm = generateNoteFrontmatter(v, allOnSettings)

    expect(fm).toContain('title: "Q&A \\"Special\\" Edition"')
    expect(fm).toContain('channelName: "Channel \\"Pro\\""')
  })

  it('escapes newlines in frontmatter values', () => {
    const v = { ...video, title: 'Line1\nLine2' }
    const fm = generateNoteFrontmatter(v, allOnSettings)
    expect(fm).toContain('title: "Line1 Line2"')
  })
})

// ---------------------------------------------------------------------------
// generateNoteBody
// ---------------------------------------------------------------------------

describe('generateNoteBody', () => {
  it('returns custom template output when noteContentTemplate is set', () => {
    const settings = { ...allOnSettings, noteContentTemplate: '# {{title}}\n{{url}}' }
    const body = generateNoteBody(video, settings)
    expect(body).toBe(`# ${video.title}\n${video.url}`)
  })

  it('builds default body with remote thumbnail when includeThumbnail is true', () => {
    const body = generateNoteBody(video, allOnSettings)
    expect(body).toContain(`![thumbnail](${video.thumbnailUrl})`)
  })

  it('uses [[localPath]] embed when local thumbnail path is provided', () => {
    const body = generateNoteBody(video, allOnSettings, 'thumbnails/dQw4w9WgXcQ.jpg')
    expect(body).toContain('![[thumbnails/dQw4w9WgXcQ.jpg]]')
    expect(body).not.toContain('![thumbnail]')
  })

  it('omits thumbnail when includeThumbnail is false', () => {
    const body = generateNoteBody(video, allOffSettings)
    expect(body).not.toContain('![thumbnail]')
    expect(body).not.toContain('![[')
  })

  it('always includes the video title as h2', () => {
    const body = generateNoteBody(video, allOnSettings)
    expect(body).toContain(`## ${video.title}`)
  })

  it('always includes the watch link', () => {
    const body = generateNoteBody(video, allOnSettings)
    expect(body).toContain(`[Watch on YouTube](${video.url})`)
  })

  it('includes channel line when includeChannel is true and channelName is set', () => {
    const body = generateNoteBody(video, allOnSettings)
    expect(body).toContain(`**Channel:** [${video.channelName}](${video.channelUrl})`)
  })

  it('uses "#" for channel href when channelUrl is empty', () => {
    const body = generateNoteBody({ ...video, channelUrl: '' }, allOnSettings)
    expect(body).toContain(`**Channel:** [${video.channelName}](#)`)
  })

  it('omits channel line when includeChannel is false', () => {
    const body = generateNoteBody(video, allOffSettings)
    expect(body).not.toContain('**Channel:**')
  })

  it('includes description section when description is non-empty', () => {
    const body = generateNoteBody(video, allOnSettings)
    expect(body).toContain('## Description')
    expect(body).toContain(video.description)
  })

  it('omits description section when description is empty', () => {
    const body = generateNoteBody({ ...video, description: '' }, allOnSettings)
    expect(body).not.toContain('## Description')
  })

  it('truncates long descriptions to 500 characters with ellipsis', () => {
    const longDesc = 'x'.repeat(600)
    const body = generateNoteBody({ ...video, description: longDesc }, allOnSettings)
    expect(body).toContain('x'.repeat(500) + '...')
    expect(body).not.toContain('x'.repeat(501))
  })

  it('does not add ellipsis when description is exactly 500 characters', () => {
    const desc500 = 'y'.repeat(500)
    const body = generateNoteBody({ ...video, description: desc500 }, allOnSettings)
    expect(body).toContain(desc500)
    expect(body).not.toContain('...')
  })

  it('always includes the Notes section', () => {
    const body = generateNoteBody(video, allOnSettings)
    expect(body).toContain('## Notes')
    expect(body).toContain('> _Your notes here_')
  })
})

// ---------------------------------------------------------------------------
// generateNoteContent
// ---------------------------------------------------------------------------

describe('generateNoteContent', () => {
  it('returns only frontmatter when template is empty', () => {
    const content = generateNoteContent({ videoData: video, settings: allOnSettings })

    expect(content).toMatch(/^---\n/)
    expect(content).toMatch(/---$/)
    expect(content).not.toContain('## Notes')
  })

  it('returns frontmatter + rendered template body when template is set', () => {
    const settings = { ...allOnSettings, noteContentTemplate: '# {{title}}\n{{url}}' }
    const content = generateNoteContent({ videoData: video, settings })

    expect(content).toMatch(/^---\n/)
    expect(content).toContain(`# ${video.title}`)
    expect(content).toContain(video.url)
  })

  it('passes localThumbnailPath to frontmatter when template is empty', () => {
    const localPath = 'YouTube/thumbnails/dQw4w9WgXcQ.jpg'
    const content = generateNoteContent({ videoData: video, settings: allOnSettings, localThumbnailPath: localPath })

    expect(content).toContain(`thumbnailUrl: "[[${localPath}]]"`)
    expect(content).not.toContain(`![[${localPath}]]`)
  })

  it('passes localThumbnailPath to both frontmatter and template body when template is set', () => {
    const localPath = 'YouTube/thumbnails/dQw4w9WgXcQ.jpg'
    const settings = { ...allOnSettings, noteContentTemplate: '![[{{thumbnailUrl}}]]' }
    const content = generateNoteContent({ videoData: video, settings, localThumbnailPath: localPath })

    expect(content).toContain(`thumbnailUrl: "[[${localPath}]]"`)
    expect(content).toContain(`![[[[${localPath}]]]]`)
  })
})
