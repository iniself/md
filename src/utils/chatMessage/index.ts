import type { MarkedExtension, Tokens } from 'marked'
import { marked, Marked } from 'marked'
import markedImageSize from '../MDImageSize'

const newMarked = new Marked()

newMarked.use(markedImageSize())

newMarked.setOptions({
  breaks: true,
})

interface ChatMessage {
  side: `left` | `right`
  avatar?: string
  name?: string
  quote?: string
  inlineHtml: string
  blocks: {
    type: string
    html: string
  }[]
}

interface ChatToken extends Tokens.Generic {
  type: `chatBlock`
  messages: ChatMessage[]
}

function isBlockToken(token: Tokens.Generic) {
  return [
    `code`,
    `blockquote`,
    `list`,
    `table`,
    `heading`,
    `hr`,
    `html`,
    `image`,
  ].includes(token.type)
}

function isParagraphAsBlock(t: Tokens.Generic) {
  if (t.type !== `paragraph`)
    return false
  const tokens = (t as any).tokens as Tokens.Generic[] | undefined
  if (!tokens || tokens.length === 0)
    return false

  return tokens.every(
    tk =>
      tk.type === `image`,
  )
}

export default function markedChat(): MarkedExtension {
  return {
    extensions: [
      {
        name: `chatBlock`,
        level: `block`,

        start(src: string) {
          return src.match(/^!!!\s*chat/)?.index
        },

        tokenizer(src: string) {
          if (!src.match(/^!!!\s*chat/))
            return

          const match = src.match(/^!!!\s*chat[ \t]*\n([\s\S]*?)\n!!![ \t]*(?:\n|$)/)
          if (!match)
            return

          const raw = match[0]
          const body = match[1].trim()

          const roles: Record<string, { name: string, avatar?: string }> = {}

          const aliasMap: Record<string, string> = {}

          const lines = body.split(`\n`)

          let i = 0

          if (lines[i]?.trim() === `roles:`) {
            i++

            for (; i < lines.length; i++) {
              const line = lines[i]
              if (!/^\s+/.test(line))
                break

              const parts = line.trim().split(/[，,]/)

              const rolePart = parts.shift()?.trim()
              if (!rolePart)
                continue

              let roleName = rolePart
              let alias: string | undefined

              // 处理 "as"
              if (rolePart.includes(` as `)) {
                // eslint-disable-next-line regexp/no-super-linear-backtracking
                const m = rolePart.match(/^(.*?)\s+as\s+(.+)$/)
                if (m) {
                  roleName = m[1].trim()
                  alias = m[2].trim()
                }
              }

              // 处理 "="
              else if (rolePart.includes(`=`)) {
                // eslint-disable-next-line regexp/no-super-linear-backtracking
                const m = rolePart.match(/^(.*?)\s*=\s*(.+)$/)
                if (m) {
                  roleName = m[1].trim()
                  alias = m[2].trim()
                }
              }

              if (!roleName)
                continue

              const params: Record<string, string> = {}
              parts.forEach((p) => {
                const idx = p.indexOf(`=`)
                if (idx !== -1) {
                  const k = p.slice(0, idx).trim()
                  const v = p.slice(idx + 1).trim()
                  if (k && v)
                    params[k] = v
                }
              })

              roles[roleName] = {
                name: roleName,
                avatar: params.avatar,
              }
              if (alias) {
                aliasMap[alias] = roleName
              }
            }
          }

          const messages: ChatMessage[] = []

          let current: {
            side: `left` | `right`
            avatar?: string
            name?: string
            raw: string
          } | null = null

          for (; i < lines.length; i++) {
            const line = lines[i]
            // eslint-disable-next-line regexp/no-super-linear-backtracking
            const head = line.match(/^>>\s*(left|right)\s*(.*)$/)

            if (head) {
              if (current) {
                messages.push(processMessage(current))
              }

              const side = head[1] as `left` | `right`

              const params: Record<string, string> = {}
              line.replace(/(\w+)\s*=\s*(\S+)/g, (_, key, value) => {
                params[key] = value
                return ``
              })

              const rawRoleName = head[2].trim()
              const resolvedRoleName = aliasMap[rawRoleName] || rawRoleName
              const role = roles[resolvedRoleName]

              const name = params.name || role?.name
              const avatar = params.avatar || role?.avatar

              if (rawRoleName && !role) {
                console.warn(
                  `[chat] role "${rawRoleName}" is not defined in roles`,
                )
              }

              current = { side, name, avatar, raw: `` }
              continue
            }

            if (current) {
              current.raw += (current.raw ? `\n` : ``) + line
            }
          }

          if (current) {
            messages.push(processMessage(current))
          }

          return {
            type: `chatBlock`,
            raw,
            tokens: [],
            messages,
          } as ChatToken
        },

        renderer(token) {
          const { messages } = token as ChatToken

          return `
            <section class="chat-container">
            ${messages
              .map((msg, i) => {
                const prev = messages[i - 1]
                const sameSpeaker
                  = prev && prev.side === msg.side && prev.avatar === msg.avatar

                return `
                  <section class="message message-${msg.side} ${sameSpeaker ? `same-speaker` : ``}">
                    <section class="avatar">
                      <img src="${msg.avatar ?? `https://via.nplaceholder.com/200x200`}" />
                    </section>

                    <section class="message-content message-content-${msg.side}">
                      ${msg.name ? `<span class="chat-name chat-name-${msg.side}">${msg.name}</span>` : ``}
                      <section style="max-width: 100%; display: flex; flex-direction: ${msg.side === `right` ? `row` : `row-reverse`}; ">
                        <section class="bubble bubble-${msg.side} ${msg.inlineHtml ? `` : `empty`}">
                          ${msg.inlineHtml}

                          ${msg.quote
                            ? `
                          <section class="quote">
                            <p class="quote-content">${msg.quote}</p>
                          </section>`
                            : ``}
                        </section>
                        <span class="bubble-arrow bubble-arrow-${msg.side}"></span>
                      </section>

                      ${msg.blocks
                        .map(
                          block => `
                        <section class="chat-block chat-block-${block.type}">
                          ${block.html}
                        </section>`,
                        )
                        .join(``)}
                    </section>
                  </section>`
              })
              .join(`\n`)}
            </section>`
        },
      },
    ],
  }
}

function processMessage(
  input: { side: `left` | `right`, avatar?: string, name?: string, raw: string },
): ChatMessage {
  const lines = input.raw.split(`\n`)
  let quote: string | undefined
  const contentLines: string[] = []

  for (const line of lines) {
    if (line.startsWith(`@`) && !quote) {
      quote = line.slice(1).trim()
    }
    else {
      contentLines.push(line)
    }
  }

  const content = contentLines.join(`\n`)
  const tokens = newMarked.lexer(content)

  const inlineTokens: Tokens.Generic[] = []
  const blocks: { type: string, html: string }[] = []

  for (const t of tokens) {
    if (isBlockToken(t) || isParagraphAsBlock(t)) {
      blocks.push({
        type: t.type,
        html: marked.parser([t]),
      })
    }
    else {
      inlineTokens.push(t)
    }
  }
  return {
    side: input.side,
    avatar: input.avatar,
    name: input.name ? marked.parseInline(input.name) as string : `xxx`,
    quote,
    inlineHtml: marked.parser(inlineTokens),
    blocks,
  }
}
