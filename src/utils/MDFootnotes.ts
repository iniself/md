import type { MarkedExtension, Tokens } from 'marked'
/**
 * A marked extension to support footnotes syntax.
 * Syntax:
 *  This is a footnote reference[^1][^2].
 *
 *  [^1]: .....
 *  [^2]: .....
 */

interface MapContent {
  index: number
  text: string
}
const fnMap = new Map<string, MapContent>()

export default function markedFootnotes(styledContent: (styleLabel: string, content: string, tagName?: string) => string, styles: (tag: string, addition?: string) => string): MarkedExtension {
  return {
    extensions: [
      {
        name: `footnoteDef`,
        level: `block`,
        start(src: string) {
          fnMap.clear()
          return src.match(/^\[\^/)?.index
        },
        tokenizer(src: string) {
          const match = src.match(/^\[\^(.*)\]:(.*)/)
          if (match) {
            const [raw, fnId, text] = match
            const index = fnMap.size + 1
            fnMap.set(fnId, { index, text })
            return {
              type: `footnoteDef`,
              raw,
              fnId,
              index,
              text,
            }
          }
          return undefined
        },
        renderer(token: Tokens.Generic) {
          const store = useStore()
          const tag = `h4`
          const content = `文章注释`
          const title = `<${tag} ${/^h\d$/.test(tag) ? `data-heading="true"` : ``} ${styles(tag, `;color: ${store.primaryColor}`)}>${content}</${tag}>`
          const hr = styledContent(`hr`, ``)
          const { index, text, fnId } = token
          const fnInner = `
                <code>${index}.</code> 
                <span>${text}</span> 
                    <a id="fnDef-${fnId}" href="#fnRef-${fnId}" style="color: var(--md-primary-color);">\u21A9\uFE0E</a>
                <br>`
          if (index === 1) {
            return `
            ${hr}
            ${title}
            <p style="font-size: 80%;margin: 0.5em 8px;word-break:break-all;">${fnInner}`
          }
          if (index === fnMap.size) {
            return `${fnInner}</p>`
          }
          return fnInner
        },
      },
      {
        name: `footnoteRef`,
        level: `inline`,
        start(src: string) {
          return src.match(/\[\^/)?.index
        },
        tokenizer(src: string) {
          const match = src.match(/^\[\^(.*?)\]/)
          if (match) {
            const [raw, fnId] = match
            if (fnMap.has(fnId)) {
              return {
                type: `footnoteRef`,
                raw,
                fnId,
              }
            }
          }
        },
        renderer(token: Tokens.Generic) {
          const { fnId } = token
          const { index } = fnMap.get(fnId) as MapContent
          const linkCss = styles(`link`)
          const store = useStore()
          return `<span ${linkCss}><sup>
                    <a href="#fnDef-${fnId}" style="color: ${store.primaryColor};" id="fnRef-${fnId}">\[注释${index}\]</a>
                </sup></span>`
        },
      },
    ],
  }
}
