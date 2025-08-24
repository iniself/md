import type { MarkedExtension, Tokens } from 'marked'

export default function markedUnderlineExtension(): MarkedExtension {
  return {
    extensions: [
      {
        name: `underlineExtension`,
        level: `inline`,
        start(src: string) {
          return src.indexOf(`++`)
        },
        tokenizer(src: string) {
          const match = /^\+\+([\s\S]+?)\+\+/.exec(src)
          if (match) {
            const [raw, content] = match
            return {
              type: `underlineExtension`,
              raw,
              text: content,
              tokens: this.lexer.inlineTokens(content),
            }
          }
        },
        renderer(token: Tokens.Generic) {
          const tokens = token.tokens ?? []
          const store = useStore()
          const { primaryColor } = storeToRefs(store)
          return `<u style="text-decoration-line: underline;text-decoration-color:${primaryColor.value};text-decoration-style: wavy;text-underline-offset: 4px">${this.parser.parseInline(tokens)}</u>`
        },
      },
    ],
  }
}
