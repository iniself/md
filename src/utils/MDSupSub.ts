import type { MarkedExtension, Tokens } from 'marked'

/**
 * A marked extension to support sup/sub syntax with optional color.
 * Syntax:
 *   Docs ^+^ => Docs<sup>+</sup>
 *   Docs ^red:+^ => Docs<sup style="color:red">+</sup>
 *   Docs ^theme:+^ => Docs<sup style="color:{store.primaryColor}">+</sup>
 *   H~2~O => H<sub>2</sub>O
 *   H~blue:2~O => H<sub style="color:blue">2</sub>O
 *   H~theme:2~O => H<sub style="color:{store.primaryColor}">2</sub>O
 */
export default function markedSupSub(): MarkedExtension {
  return {
    extensions: [
      {
        name: `sup`,
        level: `inline`,
        start(src: string) {
          return src.indexOf(`^`)
        },
        tokenizer(src: string) {
          const match = src.match(/^\^([a-z]+:|:)?(.+?)\^/i)
          if (match) {
            const [, colorPart, text] = match
            return {
              type: `sup`,
              raw: match[0],
              text,
              color: colorPart && colorPart !== `:` ? colorPart.replace(/:$/, ``) : ``,
            }
          }
        },
        renderer(token: Tokens.Generic) {
          const store = useStore()
          if (token.color === `theme`) {
            return `<sup style="color:${store.primaryColor}">${token.text}</sup>`
          }
          else if (token.color) {
            return `<sup style="color:${token.color}">${token.text}</sup>`
          }
          return `<sup>${token.text}</sup>`
        },
      },
      {
        name: `sub`,
        level: `inline`,
        start(src: string) {
          return src.indexOf(`~`)
        },
        tokenizer(src: string) {
          const match = src.match(/^~([a-z]+:|:)?(.+?)~/i)
          if (match) {
            const [, colorPart, text] = match
            return {
              type: `sub`,
              raw: match[0],
              text,
              color: colorPart && colorPart !== `:` ? colorPart.replace(/:$/, ``) : ``,
            }
          }
        },
        renderer(token: Tokens.Generic) {
          const store = useStore()
          if (token.color === `theme`) {
            return `<sub style="color:${store.primaryColor}">${token.text}</sub>`
          }
          else if (token.color) {
            return `<sub style="color:${token.color}">${token.text}</sub>`
          }
          return `<sub>${token.text}</sub>`
        },
      },
    ],
  }
}
