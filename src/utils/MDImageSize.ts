import type { MarkedExtension, Tokens } from 'marked'

export default function MDImageSize(): MarkedExtension {
  return {
    extensions: [
      {
        name: `imageSize`,
        level: `inline`,
        start(src: string) {
          return src.indexOf(`![`)
        },
        tokenizer(src: string) {
          const regex = /^!\[([^\]]*)\]\(\s*(\S+?)\s*(?:=([0-9.%]*)(?:x([0-9.%]*))?\s*)?\)/
          const match = src.match(regex)
          if (match) {
            const [raw, alt, srcUrl, width, height] = match
            return {
              type: `imageSize`,
              raw,
              alt,
              src: srcUrl.trim(),
              width: width?.trim() || ``,
              height: height?.trim() || ``,
            }
          }
          return undefined
        },
        renderer(token: Tokens.Generic) {
          const { src, alt, width, height } = token
          const styleParts = []
          if (width)
            styleParts.push(`width: ${width};`)
          if (height)
            styleParts.push(`height: ${height};`)
          styleParts.push(`margin: auto`)
          const style = styleParts.join(` `)

          return `<center><img src="${src}" alt="${alt}" style="${style}" /></center>`
        },
      },
    ],
  }
}
