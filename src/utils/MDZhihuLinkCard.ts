import type { MarkedExtension, Tokens } from 'marked'

export default function markedZhihuLinkCard(wxLinkStyle: string, linkStyle: string): MarkedExtension {
  return {
    extensions: [
      {
        name: `linkCard`,
        level: `inline`,
        start(src) {
          return src.indexOf(`[[`)
        },
        tokenizer(src, _tokens) {
          // 匹配 [[...](...)]
          const regex = /^\[\[([^\]]+)\]\(([^\s)]+)\)\]/
          const match = regex.exec(src)
          if (match) {
            const [raw, text, href] = match
            return {
              type: `linkCard`,
              raw,
              href,
              title: ``,
              text,
              tokens: this.lexer.inlineTokens(text),
            } as any as Tokens.Link
          }
          return undefined
        },
        renderer(token: Tokens.Generic) {
          const { href, title, text } = token
          const tokens = token.tokens ?? []
          const parsedText = this.parser.parseInline(tokens)
          if (href.startsWith(`https://mp.weixin.qq.com`)) {
            return `<a href="${href}" data-linkcard title="${title || text}" ${wxLinkStyle}>${parsedText}</a>`
          }
          return `<a href="${href}" data-linkcard title="${title || text}" ${linkStyle}>${parsedText}</a>`
        },
      },
    ],
  }
}
