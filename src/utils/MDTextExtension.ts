import type { MarkedExtension, Tokens } from 'marked'

export default function markedTextExtension(): MarkedExtension {
  return {
    extensions: [
      {
        name: `textExtension`,
        level: `inline`,
        start(src: string) {
          return src.match(/=[:a-z]/i)?.index
        },
        tokenizer(src: string) {
          const match = src.match(
            // 要求 =color:background:size 内容=
            // /^=((#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-zA-Z]+)?)?(?::(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-zA-Z]+)?)?(?::([\d.]+[a-z%]*)?)? ([^=]+)=/
            /^=(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-zA-Z]+)?(?::(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-zA-Z]+)?)?(?::([\d.]+[a-z%]*)?)? ([^=]+)=/,
          )

          if (match) {
            // const [raw, , color, bgColor, fontSize, content] = match
            const [raw, color, bgColor, fontSize, content] = match
            return {
              type: `textExtension`,
              raw,
              color,
              bgColor,
              fontSize,
              text: content,
              tokens: this.lexer.inlineTokens(content) || [],
            }
          }
        },
        renderer(token: Tokens.Generic) {
          const store = useStore()
          const { primaryColor } = storeToRefs(store)
          const { color, bgColor, fontSize } = token
          const tokens = token.tokens ?? []
          const styles: string[] = []
          if (color)
            styles.push(`color: ${color === `theme` ? primaryColor.value : color}`)
          if (bgColor)
            styles.push(`background-color: ${bgColor === `theme` ? primaryColor.value : bgColor}; padding: 4px 8px; border-radius: 6px`)
          const isNumeric = (value: string) => /^-?\d+(?:\.\d+)?$/.test(value)
          if (fontSize)
            styles.push(`font-size: ${isNumeric(fontSize) ? (`${fontSize}px`) : fontSize}`)

          const styleStr = styles.join(`; `)
          return `<span style="${styleStr}">${this.parser.parseInline(tokens)}</span>`
        },
      },
    ],
  }
}
