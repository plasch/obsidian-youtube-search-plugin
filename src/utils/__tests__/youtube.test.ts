import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestUrl } from 'obsidian'
import {
  extractVideoId,
  isValidYouTubeUrl,
  buildVideoUrl,
  buildEmbedUrl,
  buildThumbnailUrl,
  buildChannelUrl,
  fetchVideoDataViaOEmbed,
  fetchVideoDataFromPage,
  fetchYouTubeVideoData,
} from '../youtube'

const mockRequestUrl = vi.mocked(requestUrl)

beforeEach(() => {
  mockRequestUrl.mockReset()
})

/** Build a complete RequestUrlResponse so TypeScript is satisfied. */
function mockResponse(overrides: { status: number; json?: unknown; text?: string }) {
  return {
    headers: {} as Record<string, string>,
    arrayBuffer: new ArrayBuffer(0),
    text: overrides.text ?? '',
    json: overrides.json ?? {},
    status: overrides.status,
  }
}

// ---------------------------------------------------------------------------
// extractVideoId
// ---------------------------------------------------------------------------

describe('extractVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/abc_DEF-123', 'abc_DEF-123'],
  ])('extracts ID from %s', (url, expected) => {
    expect(extractVideoId(url)).toBe(expected)
  })

  it.each([
    ['https://www.example.com'],
    ['https://vimeo.com/123456'],
    ['not a url'],
    [''],
    ['https://www.youtube.com/watch'],
    ['https://www.youtube.com/channel/UCxxxxxx'],
  ])('returns null for invalid/unsupported URL: %s', (url) => {
    expect(extractVideoId(url)).toBeNull()
  })

  it('does not extract IDs shorter than 11 characters', () => {
    expect(extractVideoId('https://youtu.be/short')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isValidYouTubeUrl
// ---------------------------------------------------------------------------

describe('isValidYouTubeUrl', () => {
  it('returns true for valid YouTube URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
  })

  it('returns false for non-YouTube URLs', () => {
    expect(isValidYouTubeUrl('https://vimeo.com/123')).toBe(false)
    expect(isValidYouTubeUrl('')).toBe(false)
    expect(isValidYouTubeUrl('just some text')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// buildVideoUrl
// ---------------------------------------------------------------------------

describe('buildVideoUrl', () => {
  it('builds a standard watch URL', () => {
    expect(buildVideoUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })
})

// ---------------------------------------------------------------------------
// buildEmbedUrl
// ---------------------------------------------------------------------------

describe('buildEmbedUrl', () => {
  it('builds an embed URL', () => {
    expect(buildEmbedUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })
})

// ---------------------------------------------------------------------------
// buildThumbnailUrl
// ---------------------------------------------------------------------------

describe('buildThumbnailUrl', () => {
  it('defaults to hqdefault quality', () => {
    expect(buildThumbnailUrl('dQw4w9WgXcQ')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it.each([
    ['default', 'default'],
    ['hqdefault', 'hqdefault'],
    ['mqdefault', 'mqdefault'],
    ['sddefault', 'sddefault'],
    ['maxresdefault', 'maxresdefault'],
  ] as const)('builds URL for quality %s', (quality, slug) => {
    expect(buildThumbnailUrl('dQw4w9WgXcQ', quality)).toBe(
      `https://img.youtube.com/vi/dQw4w9WgXcQ/${slug}.jpg`
    )
  })
})

// ---------------------------------------------------------------------------
// buildChannelUrl
// ---------------------------------------------------------------------------

describe('buildChannelUrl', () => {
  it('builds a channel URL', () => {
    expect(buildChannelUrl('UCuAXFkgsw1L7xaCfnd5JJOw')).toBe(
      'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw'
    )
  })
})

// ---------------------------------------------------------------------------
// fetchVideoDataViaOEmbed
// ---------------------------------------------------------------------------

describe('fetchVideoDataViaOEmbed', () => {
  it('returns parsed video data on success', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({
      status: 200,
      json: {
        title: 'Never Gonna Give You Up',
        author_name: 'Rick Astley',
        author_url: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      },
    }))

    const result = await fetchVideoDataViaOEmbed('dQw4w9WgXcQ')

    expect(result.videoId).toBe('dQw4w9WgXcQ')
    expect(result.title).toBe('Never Gonna Give You Up')
    expect(result.channelName).toBe('Rick Astley')
    expect(result.channelUrl).toBe('https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw')
    expect(result.thumbnailUrl).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
    expect(result.thumbnailUrlMaxRes).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
    expect(result.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('decodes HTML entities in the title', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({
      status: 200,
      json: {
        title: 'Rick &amp; Morty: A &#39;Rick&#39; Adventure',
        author_name: 'Adult Swim',
        author_url: '',
      },
    }))

    const result = await fetchVideoDataViaOEmbed('someVideoId')
    expect(result.title).toBe("Rick & Morty: A 'Rick' Adventure")
  })

  it('throws on non-200 status', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({ status: 404 }))

    await expect(fetchVideoDataViaOEmbed('dQw4w9WgXcQ')).rejects.toThrow('HTTP 404')
  })

  it('uses built thumbnail URL when oEmbed provides no thumbnail_url', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({
      status: 200,
      json: { title: 'Test', author_name: 'Channel', author_url: '' },
    }))

    const result = await fetchVideoDataViaOEmbed('dQw4w9WgXcQ')
    expect(result.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })
})

// ---------------------------------------------------------------------------
// fetchVideoDataFromPage
// ---------------------------------------------------------------------------

describe('fetchVideoDataFromPage', () => {
  const makeHtml = ({
    description = '',
    channelId = '',
    keywords = '',
    dateText = '',
    viewCount = '',
  } = {}) => [
    description && `<meta name="description" content="${description}">`,
    channelId && `"channelId":"${channelId}"`,
    keywords && `<meta name="keywords" content="${keywords}">`,
    dateText && `"dateText":{"simpleText":"${dateText}"}`,
    viewCount && `"viewCount":"${viewCount}"`,
  ].filter(Boolean).join('\n')

  it('parses all supported fields from HTML', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({
      status: 200,
      text: makeHtml({
        description: 'Great video',
        channelId: 'UCabc123',
        keywords: 'music, pop, 80s',
        dateText: 'Jan 1, 2024',
        viewCount: '1500000',
      }),
    }))

    const result = await fetchVideoDataFromPage('dQw4w9WgXcQ')

    expect(result.description).toBe('Great video')
    expect(result.channelId).toBe('UCabc123')
    expect(result.channelUrl).toBe('https://www.youtube.com/channel/UCabc123')
    expect(result.tags).toEqual(['music', 'pop', '80s'])
    expect(result.publishedAt).toBe('Jan 1, 2024')
    expect(result.viewCount).toBe('1.5M')
  })

  it('returns empty object on non-200 status', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({ status: 403 }))

    const result = await fetchVideoDataFromPage('dQw4w9WgXcQ')
    expect(result).toEqual({})
  })

  it('returns empty object when requestUrl throws', async () => {
    mockRequestUrl.mockRejectedValueOnce(new Error('Network error'))

    const result = await fetchVideoDataFromPage('dQw4w9WgXcQ')
    expect(result).toEqual({})
  })

  it('returns empty object when HTML has no recognisable fields', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({ status: 200, text: '<html><body></body></html>' }))

    const result = await fetchVideoDataFromPage('dQw4w9WgXcQ')
    expect(result).toEqual({})
  })

  it('formats view counts correctly', async () => {
    const cases: [string, string][] = [
      ['999', '999'],
      ['1000', '1.0K'],
      ['1500', '1.5K'],
      ['1000000', '1.0M'],
      ['2500000', '2.5M'],
    ]

    for (const [raw, formatted] of cases) {
      mockRequestUrl.mockResolvedValueOnce(mockResponse({
        status: 200,
        text: `"viewCount":"${raw}"`,
      }))
      const result = await fetchVideoDataFromPage('id')
      expect(result.viewCount).toBe(formatted)
    }
  })

  it('decodes HTML entities in descriptions', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({
      status: 200,
      text: '<meta name="description" content="Q&amp;A with &quot;experts&quot;">',
    }))

    const result = await fetchVideoDataFromPage('id')
    expect(result.description).toBe('Q&A with "experts"')
  })

  it('filters empty strings from keyword tags', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({
      status: 200,
      text: '<meta name="keywords" content="tag1,,tag2, ,tag3">',
    }))

    const result = await fetchVideoDataFromPage('id')
    expect(result.tags).toEqual(['tag1', 'tag2', 'tag3'])
  })
})

// ---------------------------------------------------------------------------
// fetchYouTubeVideoData
// ---------------------------------------------------------------------------

describe('fetchYouTubeVideoData', () => {
  it('merges oEmbed and page data into a complete video object', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({
      status: 200,
      json: {
        title: 'Never Gonna Give You Up',
        author_name: 'Rick Astley',
        author_url: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      },
    }))
    mockRequestUrl.mockResolvedValueOnce(mockResponse({
      status: 200,
      text: [
        '<meta name="description" content="Official video">',
        '"channelId":"UCuAXFkgsw1L7xaCfnd5JJOw"',
        '<meta name="keywords" content="pop, classic">',
        '"dateText":{"simpleText":"Oct 25, 2009"}',
        '"viewCount":"2500000"',
      ].join('\n'),
    }))

    const result = await fetchYouTubeVideoData('dQw4w9WgXcQ')

    expect(result.videoId).toBe('dQw4w9WgXcQ')
    expect(result.title).toBe('Never Gonna Give You Up')
    expect(result.channelName).toBe('Rick Astley')
    expect(result.description).toBe('Official video')
    expect(result.channelId).toBe('UCuAXFkgsw1L7xaCfnd5JJOw')
    expect(result.tags).toEqual(['pop', 'classic'])
    expect(result.publishedAt).toBe('Oct 25, 2009')
    expect(result.viewCount).toBe('2.5M')
    expect(result.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    expect(result.thumbnailUrlMaxRes).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
  })

  it('throws when oEmbed fails and no fallback title is available', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({ status: 404 }))
    mockRequestUrl.mockResolvedValueOnce(mockResponse({ status: 200, text: '' }))

    await expect(fetchYouTubeVideoData('badId12345x')).rejects.toThrow(
      'Failed to fetch video data'
    )
  })

  it('falls back to defaults when page scraping returns nothing', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({
      status: 200,
      json: { title: 'Test Video', author_name: 'Test Channel', author_url: '' },
    }))
    mockRequestUrl.mockResolvedValueOnce(mockResponse({ status: 403 }))

    const result = await fetchYouTubeVideoData('testVideoId')

    expect(result.title).toBe('Test Video')
    expect(result.description).toBe('')
    expect(result.tags).toEqual([])
    expect(result.publishedAt).toBe('')
    expect(result.viewCount).toBe('')
  })

  it('fills in default strings for missing oEmbed fields', async () => {
    mockRequestUrl.mockResolvedValueOnce(mockResponse({
      status: 200,
      json: { title: 'Minimal', author_name: 'Channel', author_url: undefined },
    }))
    mockRequestUrl.mockResolvedValueOnce(mockResponse({ status: 200, text: '' }))

    const result = await fetchYouTubeVideoData('vid12345678')
    expect(result.channelUrl).toBe('')
    expect(result.duration).toBe('')
    expect(result.likeCount).toBe('')
  })
})
