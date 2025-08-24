/* eslint-disable regexp/no-super-linear-backtracking */
import type { marked } from 'marked'
/*
!!! abstract this is a `abstract` type admonition
The warning above was a `abstract` type admonition
!!!

!!! attention this is a `attention` type admonition
The warning above was a `attention` type admonition
!!!

!!! bug this is a `bug` type admonition
The warning above was a `bug` type admonition
!!!

!!! caution this is a `caution` type admonition
The warning above was a `caution` type admonition
!!!

!!! danger this is a `danger` type admonition
The warning above was a `danger` type admonition
!!!

!!! error this is a `error` type admonition
The warning above was a `error` type admonition
!!!

!!! example this is a `example` type admonition
The warning above was a `example` type admonition
!!!

!!! failure this is a `failure` type admonition
The warning above was a `failure` type admonition
!!!

!!! hint this is a `hint` type admonition
The warning above was a `hint` type admonition
!!!

!!! info this is a `info` type admonition
The warning above was a `info` type admonition
!!!

!!! note this is a `note` type admonition
The warning above was a `note` type admonition
!!!

!!! question this is a `question` type admonition
The warning above was a `question` type admonition
!!!

!!! quote this is a `quote` type admonition
The warning above was a `quote` type admonition
!!!

!!! success this is a `success` type admonition
The warning above was a `success` type admonition
!!!

!!! tip this is a `tip` type admonition
The warning above was a `tip` type admonition
!!!

!!! warning this is a `warning` type admonition
The warning above was a `warning` type admonition
!!!
*/

interface Config {
  nodeName: string
  className: string
  title: { nodeName: string }
}
const admonitionTypes = [
  `abstract`,
  `attention`,
  `bug`,
  `caution`,
  `danger`,
  `error`,
  `example`,
  `failure`,
  `hint`,
  `info`,
  `note`,
  `question`,
  `quote`,
  `success`,
  `tip`,
  `warning`,
]

const startReg = new RegExp(
  `^!!!\\s+(${admonitionTypes.join(`|`)})(?:\\s+(.*))?$`,
)

const endReg = /^!!!\s*$/
const debug = false
let config: Config = { nodeName: `div`, className: `admonition`, title: { nodeName: `p` } }

const admonitionPlugin: marked.TokenizerExtension | marked.RendererExtension = {
  name: `admonition`,
  level: `block`,
  start(this: marked.TokenizerThis, src: string) {
    const index = src.match(
      new RegExp(
        `(?:^|[\\r\\n])!!!\\s+(${admonitionTypes.join(`|`)})(?:\\s+(.*))?`,
      ),
    )?.index
    debug && console.log(`🎋[marked start]`, src, index)
    return index
  },
  tokenizer(src: string, _tokens): marked.Tokens.Generic | void {
    debug && console.log(`🗼[marked tokenizer]`, src, _tokens)
    const lines = src.split(/\n/)
    if (startReg.test(lines[0])) {
      const section = { x: -1, y: -1 }
      const sections = []
      for (let i = 0, k = lines.length; i < k; i++) {
        if (startReg.test(lines[i])) {
          section.x = i
        }
        else if (endReg.test(lines[i])) {
          section.y = i
          if (section.x >= 0) {
            sections.push({ ...section })
            section.x = -1
            section.y = -1
          }
        }
      }

      if (sections.length) {
        const section = sections[0]
        const [_, icon, title] = startReg.exec(lines[section.x]) || []
        const text = lines.slice(section.x + 1, section.y).join(`\n`)
        const raw = lines.slice(section.x, section.y + 1).join(`\n`)
        const token = {
          type: `admonition`,
          raw,
          icon,
          title,
          text,
          titleTokens: [],
          tokens: [],
          childTokens: [`title`, `text`],
        }

        this.lexer.inlineTokens(token.title, token.titleTokens)
        this.lexer.blockTokens(token.text, token.tokens)
        return token
      }
    }
  },
  renderer(this: marked.RendererThis, token) {
    debug && console.log(`🐉[marked renderer]`, this, token)
    const html = `<${config.nodeName} class="${config.className} ${config.className}-${token.icon}">
    <${config.title.nodeName} class="${config.className}-title">${this.parser.parseInline(
      token.titleTokens,
    )}</${config.title.nodeName}>
    ${this.parser.parse(token.tokens!)}
    </${config.nodeName}>`
    return html
  },
}

const extensions: (marked.TokenizerExtension | marked.RendererExtension)[] = [admonitionPlugin]

function setConfig(data: Config) {
  config = data
}

export { admonitionTypes, setConfig }

export default <marked.MarkedExtension>{
  extensions,
}
