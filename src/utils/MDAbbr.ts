import type { MarkedExtension, Tokens } from 'marked'
/**
 * A marked extension to support abbr syntax.
 * Syntax:
 *  This is an HTML example.
 *  [HTML]: HyperText Markup Language
 *
 */

interface AbbrContent {
  abbr: string
  title: string
}

const abbrMap = new Map<string, AbbrContent>()

export default function markedAbbr(): MarkedExtension {
  return {
    extensions: [
      // 识别缩写定义 [*HTML]: ...
      {
        name: `abbrDef`,
        level: `block`,
        start(src: string) {
          abbrMap.clear()
          return src.match(/^\*\[[^\]]+\]:/)?.index
        },
        tokenizer(src: string) {
          const match = src.match(/^\*\[([^\]]+)\]:\s+(.*)/)
          if (match) {
            const [raw, abbr, title] = match
            abbrMap.set(abbr, { abbr, title })
            return {
              type: `abbrDef`,
              raw,
              abbr,
              title,
            }
          }
          return undefined
        },
        renderer() {
          // 缩写定义不渲染到 HTML
          return ``
        },
      },
      // 识别正文中的缩写，转换成 <abbr> 标签
      {
        name: `abbrRef`,
        level: `inline`,
        start(src: string) {
          // 提升性能，只在包含缩写之一时启动
          const keys = [...abbrMap.keys()]
          if (keys.length === 0)
            return -1
          // 构造正则，匹配所有缩写
          const pattern = `\\b(${keys.map(k => escapeRegExp(k)).join(`|`)})\\b`
          const reg = new RegExp(pattern)
          return src.search(reg)
        },
        tokenizer(src: string) {
          const keys = [...abbrMap.keys()]
          if (keys.length === 0)
            return undefined

          // 只匹配这些缩写词
          const pattern = `^(${keys.map(k => escapeRegExp(k)).join(`|`)})\\b`
          const reg = new RegExp(pattern)
          const match = src.match(reg)
          if (match) {
            const abbr = match[1]
            return {
              type: `abbrRef`,
              raw: abbr,
              abbr,
            }
          }
          return undefined
        },
        renderer(token: Tokens.Generic) {
          const { abbr } = token
          const title = abbrMap.get(abbr)?.title || ``
          return `<abbr title="${title}">${abbr}</abbr>`
        },
      },
    ],
  }
}

// 工具函数，转义正则特殊字符
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)
}
