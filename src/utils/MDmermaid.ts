import type { MarkedExtension } from 'marked'
import mermaid from 'mermaid'
import { simpleHash } from '@/utils'

// 提取尺寸参数: 支持 px 或 %
// 格式支持：
//   mermaid 400x300
//   mermaid 500
//   mermaid 80%
//   mermaid 100%x400

mermaid.initialize({
  startOnLoad: false,
  securityLevel: `loose`,
})

// key -> svg
const svgCache = new Map<string, string>()

// 上一次渲染的结果（用于在新渲染完成前显示旧图片）
let lastRenderedSvg: string | null = null

function renderMermaid(id: string, code: string, cacheKey: string) {
  // id: `mermaid-${cacheKey}-${Date.now()}`
  // cacheKey: code 的 hash
  if (typeof window === `undefined`)
    return

  const handleResult = (svg: string) => {
    svgCache.set(cacheKey, svg)
    lastRenderedSvg = svg

    const el = document.getElementById(id)
    if (el) {
      el.innerHTML = svg
    }
  }

  const handleError = (error: unknown) => {
    console.error(`Failed to render Mermaid:`, error)
    const el = document.getElementById(id)
    if (el) {
      el.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red;">Mermaid 渲染失败: ${
        error instanceof Error ? error.message : String(error)
      }</div>`
    }
  }
  mermaid
    .render(`mermaid-svg-${cacheKey}`, code)
    .then(({ svg }) => handleResult(svg))
    .catch(handleError)
}

export default function markedMermaid(): MarkedExtension {
  const className = `mermaid-diagram`

  return {
    extensions: [
      {
        name: `mermaid`,
        level: `block`,
        start(src: string) {
          return src.match(/^```mermaid/m)?.index
        },

        tokenizer(src: string) {
          const match = /^```mermaid[^\n]*\n([\s\S]*?)\r?\n```/.exec(src)
          if (match) {
            return {
              type: `mermaid`,
              raw: match[0],
              text: match[1].trim(),
            }
          }
        },

        renderer(token: any) {
          const code = token.text
          const cacheKey = simpleHash(code)

          const infoLine = token.raw.split(`\n`)[0]
          let style = `width:80%;margin:0 auto;`
          let caption = ``

          // eslint-disable-next-line regexp/no-super-linear-backtracking
          const m = infoLine.match(/^mermaid(?:\s+([0-9%]+(?:x[0-9%]+)?))?(?:\s+(.*))?$/)

          if (m) {
            const size = m[1]
            const cap = m[2]

            if (size) {
              if (size.includes(`x`)) {
                const [w, h] = size.split(`x`)
                style = `width:${w.endsWith(`%`) ? w : `${w}px`};height:${h.endsWith(`%`) ? h : `${h}px`};margin:0 auto;display:block;`
                // style =
                //   `width:${w.endsWith('%') ? w : `${w}px`};` +
                //   `height:${h.endsWith('%') ? h : `${h}px`};` +
                //   `margin:0 auto;`
              }
              else {
                style = `width:${size.endsWith(`%`) ? size : `${size}px`};margin:0 auto;display:block;`
                // style = `width:${size.endsWith('%') ? size : `${size}px`};margin:0 auto;`
              }
            }

            if (cap) {
              caption = `<figcaption style="text-align:center;color:#888;font-size:0.8em">${cap}</figcaption>`
            }
          }

          const cached = svgCache.get(cacheKey)
          if (cached) {
            return `<!--mermaid-start--><figure style="${style}"><div class="${className}">${cached}</div>${caption}</figure><!--mermaid-end-->`
          }

          const id = `mermaid-${cacheKey}`
          renderMermaid(id, code, cacheKey)

          const body = lastRenderedSvg || `正在加载 Mermaid...`

          return `<!--mermaid-start--><figure style="${style}"><div id="${id}" class="${className}">${body}</div>${caption}</figure><!--mermaid-end-->`
        },
      },
    ],

    walkTokens(token: any) {
      if (token.type === `code` && token.lang === `mermaid`) {
        token.type = `mermaid`
      }
    },
  }
}
