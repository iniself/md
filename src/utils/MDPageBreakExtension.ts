import type { MarkedExtension, Tokens } from 'marked'

export default function markedPageBreakExtension(): MarkedExtension {
  return {
    extensions: [
      {
        name: `pageBreak`,
        level: `block`,

        start(src: string) {
          return src.indexOf(`+++`)
        },

        tokenizer(src: string) {
          const match = /^\s*\+\+\+\s*(?:\n|$)/.exec(src)
          if (match) {
            return {
              type: `pageBreak`,
              raw: match[0],
            }
          }
        },

        renderer(_token: Tokens.Generic) {
          return `<p class="page-break" style="display: none;"></p>`
        },
      },
    ],
  }
}
