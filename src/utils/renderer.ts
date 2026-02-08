import type { PropertiesHyphen } from 'csstype'
import type { RendererObject, Tokens } from 'marked'
import type { ReadTimeResults } from 'reading-time'
import { cloneDeep, toMerged } from 'es-toolkit'
import frontMatter from 'front-matter'
import hljs from 'highlight.js'
import { marked } from 'marked'

import mermaid from 'mermaid'
import readingTime from 'reading-time'
import type { ExtendedProperties, IOpts, ThemeStyles } from '@/types'
import type { RendererAPI } from '@/types/renderer-types'

import { delwsrv } from '@/utils'
import { getStyleString } from '.'
import markedAdmonitionExtension from './admonition/index.ts'
import renderCsvTable from './extendedtables/csv2table.ts'
// @ts-expect-error: not ts
import markedExtendedtables from './extendedtables/index.js'
import markedAbbr from './MDAbbr'
import markedAlert from './MDAlert'
import markedFootnotes from './MDFootnotes'
import markedImageSize from './MDImageSize'
import { MDKatex } from './MDKatex'
import markedRuby from './MDRuby.ts'
import markedSlider from './MDSlider'
import markedSupSub from './MDSupSub'
import markedTextExtension from './MDTextExtension'
import markedUnderlineExtension from './MDUnderlineExtension'
import markedZhihuLinkCard from './MDZhihuLinkCard'
import './admonition/index.css'

mermaid.initialize({
  startOnLoad: false,
  securityLevel: `loose`,
  suppressErrorRendering: true,
  deterministicIds: true,
  fontFamily: `system-ui, -apple-system, BlinkMacSystemFont, sans-serif`,
  logLevel: `fatal`,
})

marked.use(markedImageSize())
marked.use(markedTextExtension())
marked.use(markedUnderlineExtension())
marked.setOptions({
  breaks: true,
})
marked.use(markedSlider())
marked.use(markedAdmonitionExtension())
marked.use(markedRuby())

let __mermaidIdCounter = 0

function genMermaidId(): string {
  const ts = Date.now() // 毫秒
  __mermaidIdCounter = (__mermaidIdCounter + 1) % 10000 // 防止无限增大，循环 0000-9999
  const counter = __mermaidIdCounter.toString().padStart(4, `0`)
  return `${ts}${counter}`
}

function buildTheme({ theme: _theme, fonts, size, isUseIndent }: IOpts): ThemeStyles {
  const theme = cloneDeep(_theme)
  const base = toMerged(theme.base, {
    'font-family': fonts,
    'font-size': size,
  })

  if (isUseIndent) {
    theme.block.p = {
      'text-indent': `2em`,
      ...theme.block.p,
    }
  }

  const mergeStyles = (styles: Record<string, PropertiesHyphen>): Record<string, ExtendedProperties> =>
    Object.fromEntries(
      Object.entries(styles).map(([ele, style]) => [ele, toMerged(base, style)]),
    )
  return {
    ...mergeStyles(theme.inline),
    ...mergeStyles(theme.block),
  } as ThemeStyles
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, `&amp;`) // 转义 &
    .replace(/</g, `&lt;`) // 转义 <
    .replace(/>/g, `&gt;`) // 转义 >
    .replace(/"/g, `&quot;`) // 转义 "
    .replace(/'/g, `&#39;`) // 转义 '
    .replace(/`/g, `&#96;`) // 转义 `
}

function buildAddition(): string {
  return `
    <style>
      .preview-wrapper pre::before {
        position: absolute;
        top: 0;
        right: 0;
        color: #ccc;
        text-align: center;
        font-size: 0.8em;
        padding: 5px 10px 0;
        line-height: 15px;
        height: 15px;
        font-weight: 600;
      }
    </style>
  `
}

function getStyles(styleMapping: ThemeStyles, tokenName: string, addition: string = ``): string {
  const dict = styleMapping[tokenName as keyof ThemeStyles]
  if (!dict) {
    return ``
  }
  const styles = getStyleString(dict)
  return `style="${styles}${addition}"`
}

function buildFootnoteArray(footnotes: [number, string, string][]): string {
  return footnotes
    .map(([index, title, link]) =>
      link === title
        ? `<code style="font-size: 90%; opacity: 0.6;">[${index}]</code>: <i style="word-break: break-all">${title}</i><br/>`
        : `<code style="font-size: 90%; opacity: 0.6;">[${index}]</code> ${title}: <i style="word-break: break-all">${link}</i><br/>`,
    )
    .join(`\n`)
}

function transform(legend: string, text: string | null, title: string | null): string {
  const options = legend.split(`-`)
  for (const option of options) {
    if (option === `alt` && text) {
      return text
    }
    if (option === `title` && title) {
      return title
    }
  }
  return ``
}

const macCodeSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="45px" height="13px" viewBox="0 0 450 130">
    <ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" />
    <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" />
    <ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" />
  </svg>
`.trim()

interface ParseResult {
  yamlData: Record<string, any>
  markdownContent: string
  readingTime: ReadTimeResults
}

function parseFrontMatterAndContent(markdownText: string): ParseResult {
  try {
    const parsed = frontMatter(markdownText)
    const yamlData = parsed.attributes
    const markdownContent = parsed.body

    const readingTimeResult = readingTime(markdownContent)

    return {
      yamlData: yamlData as Record<string, any>,
      markdownContent,
      readingTime: readingTimeResult,
    }
  }
  catch (error) {
    console.error(`Error parsing front-matter:`, error)
    return {
      yamlData: {},
      markdownContent: markdownText,
      readingTime: readingTime(markdownText),
    }
  }
}

function extractImageInfo(input: string): {
  relHref: string
  width?: string
  height?: string
  fit?: string
} {
  const allowedFits = new Set([`cover`, `contain`, `fill`, `none`, `scale-down`])

  // 抽取尺寸和 fit 的正则
  const sizeFitRegex = /(?:\s*=\s*(\d+(?:\.\d+)?%?)(?:x(\d+(?:\.\d+)?%?))?)?(?:\s+@([\w-]+))?/

  // 提取 url 主体
  const parts = input.match(/^(\S+)/)
  const baseUrl = parts?.[1] ?? ``
  const remainder = input.slice(baseUrl.length)

  // 用 size+fit 的正则抽取 width height fit
  const match = sizeFitRegex.exec(remainder)

  let width: string | undefined
  let height: string | undefined
  let fit: string | undefined

  if (match) {
    width = match[1]
    height = match[2]
    const fitRaw = match[3]
    if (fitRaw && allowedFits.has(fitRaw)) {
      fit = fitRaw
    }
  }

  // 把处理过的尺寸+fit部分从 remainder 去掉
  const matchedLength = match?.[0]?.length || 0
  const rest = remainder.slice(matchedLength).trim()

  // 拼接剩余部分回 href
  const relHref = rest ? `${baseUrl} ${rest}` : baseUrl

  return {
    relHref,
    width,
    height,
    fit,
  }
}

export function initRenderer(opts: IOpts): RendererAPI {
  const footnotes: [number, string, string][] = []
  let footnoteIndex: number = 0
  let styleMapping: ThemeStyles = buildTheme(opts)
  const listOrderedStack: boolean[] = []
  const listCounters: number[] = []

  function getOpts(): IOpts {
    return opts
  }

  function styles(tag: string, addition: string = ``): string {
    return getStyles(styleMapping, tag, addition)
  }

  function processBlockquoteChildren(container: HTMLElement) {
    const children = Array.from(container.children)
    const ps = children.filter(c => c.tagName.toLowerCase() === `p`) as HTMLElement[]
    ps.forEach((p, i) => {
      let styleStr = styles(`blockquote_p`)
      const marginTop = i === 0 ? `0` : `1.5em`
      const marginBottom = i === ps.length - 1 ? `0` : `1.5em`
      styleStr = styleStr.replace(/margin:[^;]+;/, `margin: ${marginTop} 8px ${marginBottom} 8px;`)
      p.setAttribute(`style`, styleStr.slice(7, -1))
    })

    children.forEach((c) => {
      if (c.tagName.toLowerCase() === `blockquote`) {
        processBlockquoteChildren(c as HTMLElement)
      }
    })
  }

  function styledContent(styleLabel: string, content: string, tagName?: string): string {
    const tag = tagName ?? styleLabel

    return `<${tag} ${/^h\d$/.test(tag) ? `data-heading="true"` : ``} ${styles(styleLabel)}>${content}</${tag}>`
  }

  function addFootnote(title: string, link: string): number {
    footnotes.push([++footnoteIndex, title, link])
    return footnoteIndex
  }

  function reset(newOpts: Partial<IOpts>): void {
    footnotes.length = 0
    footnoteIndex = 0
    setOptions(newOpts)
  }

  function setOptions(newOpts: Partial<IOpts>): void {
    opts = { ...opts, ...newOpts }
    const oldStyle = JSON.stringify(styleMapping)
    styleMapping = buildTheme(opts)
    const newStyle = JSON.stringify(styleMapping)
    if (oldStyle !== newStyle) {
      marked.use(markedAlert({ styles: styleMapping }))
      marked.use(
        MDKatex({ nonStandard: true }, styles(`inline_katex`, `;vertical-align: middle; line-height: 1;`), styles(`block_katex`, `;text-align: center;`),
        ),
      )
    }
  }

  function buildReadingTime(readingTime: ReadTimeResults): string {
    if (!opts.countStatus) {
      return ``
    }
    if (!readingTime.words) {
      return ``
    }
    return `
      <blockquote ${styles(`blockquote`)}>
        <p ${styles(`blockquote_p`)}>字数 ${readingTime?.words}，阅读大约需 ${Math.ceil(readingTime?.minutes)} 分钟</p>
      </blockquote>
    `
  }

  const buildFootnotes = () => {
    if (!footnotes.length) {
      return ``
    }

    return (
      styledContent(`hr`, ``)
      + styledContent(`h4`, `引用链接`)
      + styledContent(`footnotes`, buildFootnoteArray(footnotes), `p`)
    )
  }

  const renderer: RendererObject = {
    heading({ tokens, depth }: Tokens.Heading) {
      const text = this.parser.parseInline(tokens)
      const tag = `h${depth}`
      return styledContent(tag, text)
    },

    paragraph({ tokens }: Tokens.Paragraph): string {
      const store = useStore()
      const { isJustify } = storeToRefs(store)

      const text = this.parser.parseInline(tokens)
      const isFigureImage = text.includes(`<figure`) && text.includes(`<img`)
      const isEmpty = text.trim() === ``
      if (isFigureImage || isEmpty) {
        return text
      }
      if (isJustify.value) {
        // 两端对齐
        return `<p lang="zh"  ${/^h\d$/.test(`p`) ? `data-heading="true"` : ``} ${styles(`p`, `;text-align: justify;hyphens: auto; word-wrap: break-word !important`)}>${text}</p>`
      }
      return styledContent(`p`, text)
    },

    blockquote({ tokens }: Tokens.Blockquote): string {
      const container = document.createElement(`div`)
      container.innerHTML = this.parser.parse(tokens)
      processBlockquoteChildren(container)
      return styledContent(`blockquote`, container.innerHTML)
    },

    code({ text, lang = `` }: Tokens.Code): string {
      if (lang === `csv`) {
        return renderCsvTable(text, styles)
      }
      if (lang.startsWith(`en`)) {
        return `<p lang="en" ${styles(`p`, `;text-align: justify;hyphens: auto; word-wrap: break-word !important;padding-right: 0.5em;`)}>${marked.parseInline(text)}</p>`
      }
      if (lang.startsWith(`center`)) {
        return `<p ${styles(`p`, `;text-align: center`)}>${marked.parseInline(text)}</p>`
      }
      if (lang.startsWith(`mermaid`)) {
        // 提取尺寸参数: 支持 px 或 %
        // 格式支持：
        //   mermaid 400x300
        //   mermaid 500
        //   mermaid 80%
        //   mermaid 100%x400

        // eslint-disable-next-line regexp/no-super-linear-backtracking
        const match = lang.match(/^mermaid(?:\s+([0-9%]+(?:x[0-9%]+)?))?(?:\s+(.*))?$/)
        let style = `width:80%;margin:0 auto;display:block;`
        let caption = ``
        if (match) {
          const size = match[1]
          const cap = match[2]
          if (size) {
            if (size.includes(`x`)) {
              const [w, h] = size.split(`x`)
              style = `width:${w.endsWith(`%`) ? w : `${w}px`};height:${h.endsWith(`%`) ? h : `${h}px`};margin:0 auto;display:block;`
            }
            else {
              style = `width:${size.endsWith(`%`) ? size : `${size}px`};margin:0 auto;display:block;`
            }
          }
          if (cap) {
            caption = `<figcaption style="text-align:center; color: rgb(128, 128, 128); font-size:0.8em">${cap}</figcaption>`
          }
        }

        const svgId = `mermaid-${genMermaidId()}`
        const preId = `mermaid-pre-${genMermaidId()}`

        const figureHTML = `<figure style="text-align:center; ${style}">
          <pre class="mermaid" data-processed="true" id="${preId}">${text}</pre>
          ${caption}
        </figure>`
        mermaid.render(svgId, text).then(({ svg }) => {
          const container = document.getElementById(preId)
          if (container) {
            container.innerHTML = svg.replace(
              /<svg([^>]*)>/,
              (_, attrs) => {
                if (/style="/.test(attrs)) {
                  return `<svg${attrs.replace(/style="(.*?)"/, `style="display:block;margin:0 auto;$1"`)}>`
                }
                else {
                  return `<svg${attrs} style="display:block;margin:0 auto;">`
                }
              },
            )
          }
        }).catch(() => {
          const container = document.getElementById(preId)
          if (container) {
            container.innerHTML = `<div style="color:#999;text-align:center;">正在渲染…</div>`
          }
        })

        return figureHTML
      }

      const langText = lang.split(` `)[0]
      const language = hljs.getLanguage(langText) ? langText : `plaintext`
      let highlighted = hljs.highlight(text, { language }).value
      // tab to 4 spaces
      highlighted = highlighted.replace(/\t/g, `    `)
      highlighted = highlighted
        .replace(/\r\n/g, `<br/>`)
        .replace(/\n/g, `<br/>`)
        .replace(/(>[^<]+)|(^[^<]+)/g, str => str.replace(/\s/g, `&nbsp;`))
      const span = `<span class="mac-sign" style="padding: 10px 14px 0;" hidden>${macCodeSvg}</span>`
      const code = `<code class="language-${lang}" ${styles(`code`)}>${highlighted}</code>`
      return `<pre class="hljs code__pre" ${styles(`code_pre`)}>${span}${code}</pre>`
    },

    codespan({ text }: Tokens.Codespan): string {
      const escapedText = escapeHtml(text)
      return styledContent(`codespan`, escapedText, `code`)
    },

    del({ text }: Tokens.Del): string {
      const store = useStore()
      return `<del style="text-decoration-style: double; text-decoration-color:  ${store.primaryColor};">${text}</del>`
    },

    list({ ordered, items, start = 1 }: Tokens.List) {
      listOrderedStack.push(ordered)
      listCounters.push(Number(start))

      const html = items
        .map(item => this.listitem(item))
        .join(``)

      return styledContent(
        ordered ? `ol` : `ul`,
        html,
      )
    },

    listitem(token: Tokens.ListItem) {
      // 渲染内容：优先 inline，fallback 去掉 <p> 包裹
      let content: string
      try {
        content = this.parser.parseInline(token.tokens)
      }
      catch {
        content = this.parser
          .parse(token.tokens)
          .replace(/^<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/, `$1`)
      }

      return styledContent(
        `listitem`,
        `${content}`,
        `li`,
      )
    },

    image({ href, title, text }: Tokens.Image): string {
      const store = useStore()
      const styleParts = []

      let { relHref, width, height, fit } = extractImageInfo(href)
      if (relHref) {
        href = relHref.trim()
        if (!store.useWsrv) {
          href = delwsrv(href)
        }

        const isNumeric = (value: string) => /^-?\d+(?:\.\d+)?$/.test(value)
        width = width?.trim() || ``
        height = height?.trim() || ``

        if (width && isNumeric(width)) {
          width = `${width}px`
        }
        if (height && isNumeric(height)) {
          height = `${height}px`
        }

        if (width)
          styleParts.push(`width: ${width};`)
        if (height)
          styleParts.push(`height: ${height};`)
        if (fit)
          styleParts.push(`object-fit: ${fit};`)
      }
      const imgWidthStyles = styleParts.length > 0 ? `${styleParts.join(` `)}` : ``

      const subText = styledContent(`figcaption`, transform(opts.legend!, text, title))
      const figureStyles = styles(`figure`)
      const imgStyles = styles(`image`)

      const mergeImgStyles = `style="${imgStyles.replace(/^style="/, ``).replace(/"$/, ``).trim().replace(/;$/, ``)}; ${imgWidthStyles}"`
      return `<figure ${figureStyles}><img ${mergeImgStyles} src="${href}" title="${title}" alt="${text}"/>${subText}</figure>`
    },

    link({ href, title, text, tokens }: Tokens.Link): string {
      const store = useStore()
      const parsedText = this.parser.parseInline(tokens)
      if (href.startsWith(`https://mp.weixin.qq.com`)) {
        return `<a href="${href}" title="${title || text}" ${styles(`wx_link`)}>${parsedText}</a>`
      }
      if (href === text) {
        return parsedText
      }
      if (opts.citeStatus) {
        const ref = addFootnote(title || text, href)
        return `<span ${styles(`link`)}>${parsedText}<sup style="color: ${store.primaryColor};">[链接${ref}]</sup></span>`
      }
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${title || text}" ${styles(`link`)}>${parsedText}</a>`
    },

    strong({ tokens }: Tokens.Strong): string {
      return styledContent(`strong`, this.parser.parseInline(tokens))
    },

    em({ tokens }: Tokens.Em): string {
      return styledContent(`em`, this.parser.parseInline(tokens), `span`)
    },

    table({ header, rows }: Tokens.Table): string {
      if (header[0].text !== `cols`) {
        const headerRow = header
          .map((cell) => {
            const text = this.parser.parseInline(cell.tokens)
            return styledContent(`th`, text)
          })
          .join(``)
        const body = rows
          .map((row) => {
            const rowContent = row
              .map(cell => this.tablecell(cell))
              .join(``)
            return styledContent(`tr`, rowContent)
          })
          .join(``)
        return `
          <section style="padding:0 8px; max-width: 100%; overflow: auto">
            <table class="preview-table">
              <thead ${styles(`thead`)}>${headerRow}</thead>
              <tbody>${body}</tbody>
            </table>
          </section>
        `
      }
      else {
        const body = rows
          .map((row) => {
            const rowContent = row
              .map((cell) => {
                const text = this.parser.parseInline(cell.tokens)
                const tag = `td`
                const styleLabel = `td`
                return `<${tag} ${/^h\d$/.test(tag) ? `data-heading="true"` : ``} ${styles(styleLabel, `;border: none`)}>${text}</${tag}>`
              })
              .join(``)
            return styledContent(`tr`, rowContent)
          })
          .join(``)
        return `
            <section style="padding:0 8px; max-width: 100%; overflow: auto">
            <table class="preview-table">
                <tbody>${body}</tbody>
            </table>
            </section>
        `
      }
    },

    tablecell(token: Tokens.TableCell): string {
      const text = this.parser.parseInline(token.tokens)
      return styledContent(`td`, text)
    },

    hr(_: Tokens.Hr): string {
      return styledContent(`hr`, ``)
    },
  }

  marked.use({ renderer })
  marked.use(markedSlider({ styles: styleMapping }))
  marked.use(markedAlert({ styles: styleMapping }))
  marked.use(
    MDKatex({ nonStandard: true }, styles(`inline_katex`, `;vertical-align: middle; line-height: 1;`), styles(`block_katex`, `;text-align: center;`),
    ),
  )
  marked.use(markedFootnotes(styledContent, styles))
  marked.use(markedAbbr())
  marked.use(markedZhihuLinkCard(styles(`wx_link`), styles(`link`)))
  marked.use(markedExtendedtables(styles))
  marked.use(markedSupSub())

  return {
    buildAddition,
    buildFootnotes,
    setOptions,
    reset,
    parseFrontMatterAndContent,
    buildReadingTime,
    createContainer(content: string) {
      return styledContent(`container`, content, `section`)
    },
    getOpts,
  }
}
