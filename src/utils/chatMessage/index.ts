import type { Marked, MarkedExtension, Tokens } from 'marked'
import { marked } from 'marked'

const defaultAvatar = new URL(`/assets/images/aui.jpg`, import.meta.url).href

type ChatMessage =
  | {
    type: `message`
    side: `left` | `right`
    avatar?: string
    name?: string
    quote?: string
    inlineTokens: Tokens.Generic[]
    blockTokens: Tokens.Generic[]
  }
  | {
    type: `notice`
    tokens: Tokens.Generic[]
  }

type CurrentMessage =
  | { type: `message`, side: `left` | `right`, avatar?: string, name?: string, raw: string }
  | { type: `notice`, raw: string }

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
    `admonition`,
    `infographic`,
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

export default function markedChat(newMarked: Marked): MarkedExtension {
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

          const srcLines = src.split(`\n`)

          let rawIndex = 0
          const rawLines: string[] = []
          let nestLevel = 0

          rawLines.push(srcLines[rawIndex])
          rawIndex++

          for (; rawIndex < srcLines.length; rawIndex++) {
            const line = srcLines[rawIndex]
            const trimmed = line.trim()

            if (trimmed.startsWith(`!!!`) && trimmed !== `!!!`) {
              nestLevel++
              rawLines.push(line)
              continue
            }

            if (trimmed === `!!!`) {
              if (nestLevel > 0) {
                nestLevel--
                rawLines.push(line)
                continue
              }

              rawLines.push(line)
              rawIndex++
              break
            }

            rawLines.push(line)
          }

          const raw = rawLines.join(`\n`)
          const body = rawLines.slice(1, -1).join(`\n`).trim()

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

          let current: CurrentMessage | null = null

          for (; i < lines.length; i++) {
            const line = lines[i]

            // eslint-disable-next-line regexp/no-super-linear-backtracking
            const head = line.match(/^>>\s*(left|right|notice)\s*(.*)$/)

            if (head) {
              const type = head[1] as `left` | `right` | `notice`

              if (current) {
                pushCurrentMessage(messages, current, newMarked)
                current = null
              }

              if (type === `notice`) {
                current = { type: `notice`, raw: `` }
                continue
              }

              const params: Record<string, string> = {}
              line.replace(/(\w+)\s*=\s*(\S+)/g, (_, key, value) => {
                params[key] = value
                return ``
              })

              const side = type as `left` | `right`
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

              current = { type: `message`, side, name, avatar, raw: `` }
              continue
            }

            if (current) {
              current.raw += (current.raw ? `\n` : ``) + line
            }
          }

          if (current) {
            pushCurrentMessage(messages, current, newMarked)
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
              ${messages.map((msg, i) => {
                if (msg.type === `notice`) {
                  return `
                    <section class="chat-notice">
                      ${marked.parser(msg.tokens)}
                    </section>
                  `
                }

                const prev = messages[i - 1]
                const sameSpeaker
                  = prev
                    && prev.type === `message`
                    && msg.type === `message`
                    && prev.side === msg.side
                    && prev.avatar === msg.avatar

                return `
                  <section class="message message-${msg.side} ${sameSpeaker ? `same-speaker` : ``}">
                    <section class="avatar">
                      <img src="${msg.avatar ?? defaultAvatar}" />
                    </section>

                    <section class="message-content message-content-${msg.side}">
                      ${msg.name
                        ? `<span class="chat-name chat-name-${msg.side}">${marked.parseInline(msg.name)}</span>`
                        : ``}

                      <section style="max-width: 100%; display: flex; flex-direction: ${msg.side === `right` ? `row` : `row-reverse`};">
                        <section class="bubble bubble-${msg.side} ${msg.inlineTokens.length ? `` : `empty`}">
                          ${marked.parser(msg.inlineTokens)}

                          ${msg.quote
                            ? `
                            <section class="quote">
                              <p class="quote-content">${msg.quote}</p>
                            </section>
                            `
                            : ``}
                        </section>
                        <span class="bubble-arrow bubble-arrow-${msg.side}"></span>
                      </section>

                      ${msg.blockTokens.map(t => `
                        <section class="chat-block chat-block-${t.type}">
                          ${marked.parser([t])}
                        </section>
                      `).join(``)}
                    </section>
                  </section>
                `
              }).join(`\n`)}
            </section>
          `
        },
      },
    ],
  }
}

function pushCurrentMessage(
  messages: ChatMessage[],
  current: CurrentMessage,
  newMarked: Marked,
) {
  newMarked.setOptions({
    breaks: true,
  })

  if (current.type === `notice`) {
    const tokens = newMarked.lexer(current.raw)

    messages.push({
      type: `notice`,
      tokens,
    })
    return
  }

  const lines = current.raw.split(`\n`)
  let quote: string | undefined
  const contentLines: string[] = []

  for (const line of lines) {
    if (line.startsWith(`@`) && !quote)
      quote = line.slice(1).trim()
    else
      contentLines.push(line)
  }

  const content = contentLines.join(`\n`)

  const tokens = newMarked.lexer(content)

  const inlineTokens: Tokens.Generic[] = []
  const blockTokens: Tokens.Generic[] = []

  for (const t of tokens) {
    if (isBlockToken(t) || isParagraphAsBlock(t))
      blockTokens.push(t)
    else
      inlineTokens.push(t)
  }

  messages.push({
    type: `message`,
    side: current.side,
    avatar: current.avatar,
    name: current.name ?? `xxx`,
    quote,
    inlineTokens,
    blockTokens,
  })
}
