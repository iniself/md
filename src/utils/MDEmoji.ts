import type { MarkedExtension } from 'marked'
import { UNICODE_SHORTCODES } from './emojiData'
import { resolveEmojiUrl } from './emojiRegistry'

const SHORTCODE_RULE = /^:([a-z0-9_+-]+):/
const EMOJI_TAG = `Emoji`
const EMOJI_TAG_OPEN = `<${EMOJI_TAG}`
const EMOJI_ID_RE = /^[\w-]+$/

export type EmojiAlign = `left` | `center` | `right`

export interface EmojiSnippetOptions {
  id: string
  alt?: string
  widthPercent?: number
  align?: EmojiAlign
}

export interface MarkedEmojiOptions {
  resolveUrl?: (id: string) => string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, `&amp;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`)
    .replace(/"/g, `&quot;`)
}

function quoteAttr(value: string): string {
  if (value.includes(`"`) && !value.includes(`'`)) {
    return `'${value}'`
  }
  return `"${value.replace(/"/g, `'`)}"`
}

function parseWidth(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined
  }
  const match = /^(\d+)%?$/.exec(raw.trim())
  if (!match) {
    return undefined
  }
  const value = Number(match[1])
  if (!Number.isFinite(value)) {
    return undefined
  }
  return Math.max(1, Math.min(100, value))
}

// Source snippet inserted by the picker. Small: `<Emoji id="x" alt="name" />`
export function formatEmojiSnippet(options: EmojiSnippetOptions): string {
  const attrs = [`id=${quoteAttr(options.id)}`]
  const alt = options.alt?.trim()
  if (alt) {
    attrs.push(`alt=${quoteAttr(alt)}`)
  }
  const width = options.widthPercent == null ? undefined : parseWidth(String(options.widthPercent))
  if (width != null) {
    attrs.push(`width=${quoteAttr(`${width}%`)}`)
  }
  if (options.align && options.align !== `left`) {
    attrs.push(`align=${quoteAttr(options.align)}`)
  }
  return `<${EMOJI_TAG} ${attrs.join(` `)} />`
}

// Keep an own-line sticker isolated from surrounding text.
export function padEmojiBlock(snippet: string, before: string, after: string): string {
  const lead = before.endsWith(`\n\n`) || before === ``
    ? ``
    : before.endsWith(`\n`) ? `\n` : `\n\n`
  const trail = after.startsWith(`\n\n`) || after === ``
    ? ``
    : after.startsWith(`\n`) ? `\n` : `\n\n`
  return `${lead}${snippet}${trail}`
}

function parseAlign(raw: string | undefined): EmojiAlign | undefined {
  const value = raw?.trim().toLowerCase()
  if (value === `left` || value === `center` || value === `right`) {
    return value
  }
  return undefined
}

function isNameBoundary(ch: string | undefined): boolean {
  return !ch || !/[\w-]/.test(ch)
}

function skipWs(src: string, from: number): number {
  let i = from
  while (i < src.length && /\s/.test(src[i])) {
    i++
  }
  return i
}

function readQuoted(src: string, from: number): { value: string, end: number } | undefined {
  const quote = src[from]
  if (quote !== `"` && quote !== `'`) {
    return undefined
  }
  let i = from + 1
  while (i < src.length && src[i] !== quote) {
    i++
  }
  if (src[i] !== quote) {
    return undefined
  }
  return { value: src.slice(from + 1, i), end: i + 1 }
}

// Parse `<Emoji …>` at the start of src. Attribute order is free, id is required.
function parseEmojiTag(src: string): { raw: string, id: string, alt?: string, widthPercent?: number, align?: EmojiAlign } | undefined {
  if (!src.startsWith(EMOJI_TAG_OPEN) || !isNameBoundary(src[EMOJI_TAG_OPEN.length])) {
    return undefined
  }
  const attrs: Record<string, string> = {}
  let i = skipWs(src, EMOJI_TAG_OPEN.length)
  let closed = false
  while (i < src.length) {
    i = skipWs(src, i)
    if (src.startsWith(`/>`, i)) {
      i += 2
      closed = true
      break
    }
    if (src[i] === `>`) {
      const close = `</${EMOJI_TAG}>`
      const rest = src.slice(i + 1)
      const ws = rest.match(/^\s*/)
      const after = rest.slice((ws?.[0] ?? ``).length)
      if (!after.startsWith(close)) {
        return undefined
      }
      i = i + 1 + (ws?.[0] ?? ``).length + close.length
      closed = true
      break
    }
    const nameStart = i
    while (i < src.length && /[\w-]/.test(src[i])) {
      i++
    }
    if (i === nameStart) {
      return undefined
    }
    const name = src.slice(nameStart, i)
    i = skipWs(src, i)
    if (src[i] !== `=`) {
      return undefined
    }
    i = skipWs(src, i + 1)
    const quoted = readQuoted(src, i)
    if (!quoted) {
      return undefined
    }
    attrs[name] = quoted.value
    i = quoted.end
  }
  if (!closed) {
    return undefined
  }
  const id = attrs.id?.trim()
  if (!id || !EMOJI_ID_RE.test(id)) {
    return undefined
  }
  return {
    raw: src.slice(0, i),
    id,
    alt: attrs.alt?.trim() || undefined,
    widthPercent: parseWidth(attrs.width),
    align: parseAlign(attrs.align),
  }
}

function isShortcodeChar(code: number): boolean {
  return (code >= 97 && code <= 122)
    || (code >= 48 && code <= 57)
    || code === 95
    || code === 43
    || code === 45
}

// Next `:name:` that can tokenize. Skips `http:` / `12:30`.
function findShortcodeStart(src: string, from = 0): number | undefined {
  let i = from
  while (i < src.length) {
    const colon = src.indexOf(`:`, i)
    if (colon === -1) {
      return undefined
    }
    let j = colon + 1
    while (j < src.length && isShortcodeChar(src.charCodeAt(j))) {
      j++
    }
    if (j > colon + 1 && src[j] === `:`) {
      return colon
    }
    i = colon + 1
  }
  return undefined
}

function findTagStart(src: string, from = 0): number | undefined {
  let i = from
  for (;;) {
    const index = src.indexOf(EMOJI_TAG_OPEN, i)
    if (index === -1) {
      return undefined
    }
    if (isNameBoundary(src[index + EMOJI_TAG_OPEN.length])) {
      return index
    }
    i = index + EMOJI_TAG_OPEN.length
  }
}

function fenceRunLength(src: string, lineStart: number, lineEnd: number): { char: string, length: number } | null {
  let i = lineStart
  let indent = 0
  while (i < lineEnd && src[i] === ` ` && indent < 3) {
    i++
    indent++
  }
  const char = src[i]
  if (char !== `\`` && char !== `~`) {
    return null
  }
  let length = 0
  while (i + length < lineEnd && src[i + length] === char) {
    length++
  }
  return length >= 3 ? { char, length } : null
}

// Own-line tag position. Skips fenced code so examples stay literal.
function findLineStartEmojiTag(src: string): number | undefined {
  let fenceChar = ``
  let fenceLength = 0
  let lineStart = 0
  for (;;) {
    const newline = src.indexOf(`\n`, lineStart)
    const lineEnd = newline === -1 ? src.length : newline
    const fence = fenceRunLength(src, lineStart, lineEnd)
    if (fenceChar) {
      if (fence && fence.char === fenceChar && fence.length >= fenceLength) {
        fenceChar = ``
        fenceLength = 0
      }
    }
    else if (fence) {
      fenceChar = fence.char
      fenceLength = fence.length
    }
    else if (
      src.startsWith(EMOJI_TAG_OPEN, lineStart)
      && isNameBoundary(src[lineStart + EMOJI_TAG_OPEN.length])
    ) {
      return lineStart
    }
    if (newline === -1 || lineStart > 65536) {
      return undefined
    }
    lineStart = newline + 1
  }
}

// GitHub-style shortcodes plus local `<Emoji id="…">` stickers.
export default function markedEmoji(options: MarkedEmojiOptions = {}): MarkedExtension {
  const resolveUrl = options.resolveUrl ?? resolveEmojiUrl

  function renderSticker(id: string, alt: string | undefined, widthPercent: number | undefined, raw: string): string {
    const url = resolveUrl(id)
    // Keep unknown ids as source text so no content is lost.
    if (!url) {
      return escapeHtml(raw)
    }
    const safeAlt = escapeHtml(alt ?? `:${id}:`)
    const width = widthPercent == null ? undefined : parseWidth(String(widthPercent))
    if (width != null) {
      // Original size. Percentage of the content width, still inline so it
      // can sit in a line with text (explicit display beats preflight block).
      return `<img class="md-asset-img" data-emoji-id="${escapeHtml(id)}" data-asset-id="${escapeHtml(id)}" src="${escapeHtml(url)}" alt="${safeAlt}" style="display:inline-block;vertical-align:-0.25em;width:${width}%;max-width:100%" />`
    }
    // Small size. Fixed em width so it scales with the font size,
    // height follows the image aspect ratio.
    return `<img class="md-emoji" data-emoji-id="${escapeHtml(id)}" src="${escapeHtml(url)}" alt="${safeAlt}" style="width:1.4em;height:auto;vertical-align:-0.25em;display:inline-block" />`
  }

  return {
    extensions: [
      {
        name: `mdEmojiBlock`,
        level: `block`,
        start(src: string) {
          return findLineStartEmojiTag(src)
        },
        tokenizer(src: string) {
          const tag = parseEmojiTag(src)
          if (!tag) {
            return undefined
          }
          const after = src.slice(tag.raw.length)
          const newline = after.indexOf(`\n`)
          const rest = newline === -1 ? after : after.slice(0, newline)
          if (rest.trim() !== ``) {
            return undefined
          }
          return {
            type: `mdEmojiBlock`,
            raw: tag.raw + rest + (newline === -1 ? `` : `\n`),
            emojiId: tag.id,
            emojiAlt: tag.alt,
            widthPercent: tag.widthPercent,
            emojiAlign: tag.align,
          }
        },
        renderer(token: any) {
          // Alignment only applies to an own-line sticker. Inline stickers
          // follow the surrounding text, same as md-office.
          const align = token.emojiAlign as EmojiAlign | undefined
          const img = renderSticker(String(token.emojiId ?? ``), token.emojiAlt as string | undefined, token.widthPercent as number | undefined, String(token.raw ?? ``))
          if (align && align !== `left`) {
            return `<p style="text-align:${align}">${img}</p>`
          }
          return `<p>${img}</p>`
        },
      },
      {
        name: `mdEmoji`,
        level: `inline`,
        start(src: string) {
          const shortcode = findShortcodeStart(src)
          const tag = findTagStart(src)
          const candidates = [shortcode, tag].filter((v): v is number => v !== undefined)
          if (!candidates.length) {
            return undefined
          }
          return Math.min(...candidates)
        },
        tokenizer(src: string) {
          const tag = parseEmojiTag(src)
          if (tag) {
            return {
              type: `mdEmoji`,
              raw: tag.raw,
              emojiId: tag.id,
              emojiAlt: tag.alt,
              widthPercent: tag.widthPercent,
            }
          }
          const match = SHORTCODE_RULE.exec(src)
          if (!match) {
            return undefined
          }
          const char = UNICODE_SHORTCODES[match[1]]
          if (!char) {
            return undefined
          }
          return {
            type: `mdEmoji`,
            raw: match[0],
            emojiChar: char,
          }
        },
        renderer(token: any) {
          if (token.emojiChar) {
            return token.emojiChar as string
          }
          return renderSticker(String(token.emojiId ?? ``), token.emojiAlt as string | undefined, token.widthPercent as number | undefined, String(token.raw ?? ``))
        },
      },
    ],
  }
}
