import type { MarkedExtension } from 'marked'

export default function markedInfographic(): MarkedExtension {
  return {
    extensions: [
      {
        name: `infographic`,
        level: `block`,
        start(src: string) {
          return src.match(/^```infographic/m)?.index
        },
        tokenizer(src: string) {
          const match = /^```infographic\r?\n([\s\S]*?)\r?\n```/.exec(src)
          if (match) {
            return {
              type: `infographic`,
              raw: match[0],
              text: match[1].trim(),
            }
          }
        },
        renderer(token: any) {
          const code = token.text
          return `<div class="infographic" style="width: 100%;">${code}</div>`
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
