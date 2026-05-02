import type { MarkedExtension } from 'marked'

let __infographicIdCounter = 0

function genInfographicId(): string {
  const ts = Date.now()
  __infographicIdCounter = (__infographicIdCounter + 1) % 10000
  const counter = __infographicIdCounter.toString().padStart(4, `0`)
  return `${ts}${counter}`
}

export default function markedInfographic(): MarkedExtension {
  return {
    extensions: [
      {
        name: `infographic`,
        level: `block`,
        start(src: string) {
          return src.match(/^```infographic(?:\s|$)/m)?.index
        },
        tokenizer(src: string) {
          // const match = /^```([^\n]+)\r?\n([\s\S]*?)\r?\n```/.exec(src)
          const match = /^```([^\n\r]+)\r?\n([\s\S]*?)\r?\n```/.exec(src)
          if (!match)
            return

          const langLine = match[1]
          const content = match[2]

          // const langMatch = langLine.match(
          //   /^infographic(?:\s+([0-9%]+(?:x[0-9%]+)?))?(?:\s+(.*))?$/
          // )
          const langMatch = langLine.match(
            /^infographic(?:\s+([0-9%]+(?:x[0-9%]+)?))?(?:\s+(\S.*))?$/,
          )

          if (!langMatch)
            return

          return {
            type: `infographic`,
            raw: match[0],
            text: content.trim(),
            size: langMatch[1],
            caption: langMatch[2],
          }
        },
        renderer(token: any) {
          if (token.type === `infographic`) {
            let style = `width:100%;margin:0 auto;display:block;`
            let caption = ``
            if (token.size) {
              const size = token.size
              if (size) {
                if (size.includes(`x`)) {
                  const [w, h] = size.split(`x`)
                  style = `width:${w.endsWith(`%`) ? w : `${w}px`};height:${h.endsWith(`%`) ? h : `${h}px`};margin:0 auto;display:block;`
                }
                else {
                  style = `width:${size.endsWith(`%`) ? size : `${size}px`};margin:0 auto;display:block;`
                }
              }
            }

            if (token.caption) {
              caption = `<figcaption style="text-align:center; color: rgb(128, 128, 128); font-size:0.8em">${token.caption}</figcaption>`
            }

            const preId = `infographic-pre-${genInfographicId()}`
            const figureHTML = `<figure style="text-align:center; ${style}"><pre class="infographic" data-processed="true" id="${preId}">${token.text}</pre>${caption}</figure>`
            return figureHTML
          }
        },
      },
    ],
    walkTokens(token: any) {
      if (token.type === `code` && token.lang === `infographic`) {
        token.type = `infographic`
      }
    },
  }
}
