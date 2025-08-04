import type { MarkedExtension, Tokens } from 'marked'

export default function markedImageSize(): MarkedExtension {
  return {
    extensions: [
      {
        name: `image`,
        level: `inline`,
        start(src) {
          return src.indexOf(`![`)
        },
        tokenizer(src, _tokens) {
          const regex = /^!\[([^\]]*)\]\(\s*([^\s)]+(?:\s[^\s)]+)*)\s*\)/
          const match = regex.exec(src)
          if (match) {
            const [raw, alt, href] = match
            return {
              type: `image`,
              raw,
              href,
              title: ``,
              text: alt,
            } as any as Tokens.Image // 为了 TS 编译通过
          }
        },
      },
    ],
  }
}
