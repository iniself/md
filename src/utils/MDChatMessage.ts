import type { MarkedExtension, Tokens } from 'marked'
import { marked, Marked } from 'marked'

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

const CHAT_CSS = `
.chat-container {
  --chat-bg: #ffffff;
  --chat-text: #000000;
  --chat-bubble-left: #f8f8f8;
  --chat-bubble-right: #95ec69;
  --chat-border: #e5e5e5;

  width: 100%;
  padding: 20px 0;
  background: var(--chat-bg);
  color: var(--chat-text);
}

.dark .chat-container {
  --chat-bg: #0f172a;
  --chat-bubble-left: #1f2937;
  --chat-bubble-right: #4ade80;
  --chat-border: #374151;
}

.dark .chat-container .bubble-right p{
  color: #000000!important;
}

.dark .chat-container .bubble-left p{
  color: #e5e7eb!important;
}

.chat-container .message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 48px;
  gap: 20px;
}

.chat-container .message.same-speaker {
  margin-top: -36px;
}

.chat-container .message.same-speaker .avatar {
  visibility: hidden
}

.chat-container .message.same-speaker .chat-name {
  display: none
}

.chat-container .message.same-speaker .bubble::before {
  display: none
}

.chat-container .message-left {
  flex-direction: row;
}

.chat-container .message-right {
  flex-direction: row-reverse;
}

.chat-container .avatar {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  margin-top:20px
}

.chat-container .avatar img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.chat-container .message-content {
  display: flex;
  flex-direction: column;
  max-width: calc(90% - 120px);
}

.chat-container .message-content-left {
  align-items: flex-start;
}

.chat-container .message-content-right {
  align-items: flex-end;
}

.chat-container .bubble {
  
  display: inline-block;
  max-width: 100%;
  

  padding: 12px 16px;
  border-radius: 12px;
  position: relative;
  word-break: break-word;
  border: 1px solid var(--chat-border);
}

.chat-container .bubble-left {
  background: var(--chat-bubble-left);
}

.chat-container .bubble-right {
  background: var(--chat-bubble-right);
}

.chat-container .bubble-left::before {
  content: "";
  position: absolute;
  left: -8px;
  top: 24px;
  width: 16px;
  height: 16px;
  background: var(--chat-bubble-left);
  border-left: 1px solid var(--chat-border);
  border-bottom: 1px solid var(--chat-border);
  transform: rotate(45deg);
}

.chat-container .bubble-right::before {
  content: "";
  position: absolute;
  right: -8px;
  top: 24px;
  width: 16px;
  height: 16px;
  background: var(--chat-bubble-right);
  border-right: 1px solid var(--chat-border);
  border-top: 1px solid var(--chat-border);
  transform: rotate(45deg);
}


.chat-container .message-content .chat-block {
  margin-top: 20px !important
}

.chat-container .chat-block {
  max-width: 100%;
}

.chat-container .chat-block table {
  table-layout: auto!important;
}

.chat-container .message-content
  > .chat-block > figure {
  margin-top: 0px !important;
  margin-bottom: 0px !important;
}

.chat-container .chat-block figure > img {
  margin: 0px!important;
  border-radius: 8px;
}

.chat-container .chat-block pre {
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0px !important;
}

.chat-container .bubble > p:first-child {
  margin-top: 0px!important;
}
  
.chat-container .bubble > p:last-child {
  margin-bottom: 0px!important;
}

.chat-container .chat-name {
  font-size: 12px;
  margin-bottom: 4px;
  opacity: 0.7;

  max-width:100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-container .chat-name-left {
  margin-left: 8px;
}

.chat-container .chat-name-right {
  margin-right: 8px;
}

.chat-container .bubble.empty {
  display:none;
}

/* ⭐ NEW：引用样式（只用于展示） */
.chat-container .quote {
  margin-top: 6px;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.4;
  color: #6b7280;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  position: relative;
}

.chat-container .quote::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: #9ca3af;
  border-radius: 1px;
}

.chat-container .quote-content {
  padding-left: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .chat-container .quote {
  background: rgba(255, 255, 255, 0.08);
  color: #9ca3af;
}

`

let chatStyleInjected = false

function ensureChatStyle() {
  if (chatStyleInjected)
    return
  chatStyleInjected = true

  const style = document.createElement(`style`)
  style.setAttribute(`data-marked-chat`, `true`)
  style.innerHTML = CHAT_CSS
  document.head.appendChild(style)
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

          const lines = body.split(`\n`)
          const messages: ChatMessage[] = []

          let current: {
            side: `left` | `right`
            avatar?: string
            name?: string
            raw: string
          } | null = null

          for (const line of lines) {
            const head = line.match(
              /^>>\s*(left|right)\b/,
            )

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

              const name = params.name
              const avatar = params.avatar

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
          ensureChatStyle()
          const { messages } = token as ChatToken

          return `
            <div class="chat-container">
            ${messages
              .map((msg, i) => {
                const prev = messages[i - 1]
                const sameSpeaker
                  = prev && prev.side === msg.side && prev.avatar === msg.avatar

                return `
                  <div class="message message-${msg.side} ${sameSpeaker ? `same-speaker` : ``}">
                    <div class="avatar">
                      <img src="${msg.avatar ?? `https://via.nplaceholder.com/200x200`}" />
                    </div>

                    <div class="message-content message-content-${msg.side}">
                      ${msg.name ? `<div class="chat-name chat-name-${msg.side}">${msg.name}</div>` : ``}

                      <div class="bubble bubble-${msg.side} ${msg.inlineHtml ? `` : `empty`}">
                        ${msg.inlineHtml}

                        ${msg.quote
                          ? `
                        <div class="quote">
                          <div class="quote-content">${msg.quote}</div>
                        </div>`
                          : ``}
                      </div>

                      ${msg.blocks
                        .map(
                          block => `
                        <div class="chat-block chat-block-${block.type}">
                          ${block.html}
                        </div>`,
                        )
                        .join(``)}
                    </div>
                  </div>`
              })
              .join(`\n`)}
            </div>`
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
  const newMarked = new Marked()
  newMarked.setOptions({
    breaks: true,
  })
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
    name: input.name || `xxx`,
    quote,
    inlineHtml: marked.parser(inlineTokens),
    blocks,
  }
}
