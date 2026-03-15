import type { IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core'
import type { MarkedExtension, Tokens } from 'marked'
import { findIconDefinition, icon, library } from '@fortawesome/fontawesome-svg-core'
import { fab } from '@fortawesome/free-brands-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fas } from '@fortawesome/free-solid-svg-icons'

library.add(fas, far, fab)

const prefixMap: Record<string, IconPrefix> = {
  'fa-solid': `fas`,
  'fa-regular': `far`,
  'fa-brands': `fab`,
}

interface IconParams {
  classes?: string[]
  attributes?: Record<string, string>
  styles?: Record<string, string>
  transform?: Record<string, string>
}

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

          const rawText = token.text?.trim()
          const iconMatch = rawText?.match(/\{([^}]+)\}/)

          const isNumeric = (value: string) => /^-?\d+(?:\.\d+)?$/.test(value)
          let textSize: string = fontSize ? (isNumeric(fontSize) ? `${fontSize}px` : fontSize) : ``
          let textColor: string = color ? color === `theme` ? primaryColor.value : color : ``
          let textBackground: string = bgColor ? bgColor === `theme` ? primaryColor.value : bgColor : ``

          if (color === `default`) {
            textSize = `0.9em`
            textColor = `rgb(128, 128, 128)`
            textBackground = ``
          }

          const styles: string[] = []

          if (textSize) {
            styles.push(`font-size: ${textSize}`)
          }
          if (textColor) {
            styles.push(`color: ${textColor}`)
          }
          if (textBackground) {
            styles.push(`background-color: ${textBackground}; padding: 4px 8px; border-radius: 6px`)
          }

          const styleStr = styles.join(`; `)

          if (iconMatch) {
            const classes: string[] = iconMatch[1].trim().split(/\s+/)
            const prefixClass = classes[0]
            const iconClass = classes[1]
            const extraClasses = classes.slice(2)
            const prefix = prefixMap[prefixClass] || `fas`
            const iconName = iconClass.replace(/^fa-/, ``) as IconName
            const def = findIconDefinition({ prefix, iconName })

            if (def) {
              const params: IconParams = {};

              (params.attributes ??= {}).fill = textColor || `currentColor`;
              (params.attributes ??= {}).width = textSize || `1em`;
              (params.attributes ??= {}).height = textSize || `1em`
              if (extraClasses.length) {
                params.classes = extraClasses
              }

              (params.styles ??= {}).color = textColor || `currentColor`;
              (params.styles ??= {}).width = textSize || `1em`;
              (params.styles ??= {}).height = textSize || `1em`

              if (textBackground) {
                (params.styles ??= {})[`background-color`] = textBackground
              }

              const svgObj = icon(def, params)
              if (svgObj) {
                const svgHtml = svgObj.html.join(``)
                return `<span style="display: inline-block; vertical-align: middle">${svgHtml}</span>`
              }
            }
          }
          else {
            return `<span style="${styleStr}">${this.parser.parseInline(tokens)}</span>`
          }
        },
      },
    ],
  }
}
