import type { MarkedExtension } from 'marked'
import { exportToSVG, Infographic, setDefaultFont, setFontExtendFactor } from '@antv/infographic'

interface InfographicOptions {
  themeMode?: `dark` | `light`
}

let __mermaidIdCounter = 0

function genMermaidId(): string {
  const ts = Date.now()
  __mermaidIdCounter = (__mermaidIdCounter + 1) % 10000 // 防止无限增大，循环 0000-9999
  const counter = __mermaidIdCounter.toString().padStart(4, `0`)
  return `${ts}${counter}`
}

async function renderInfographic(containerId: string, code: string, options?: InfographicOptions) {
  if (typeof window === `undefined`)
    return
  try {
    setFontExtendFactor(1.1)
    setDefaultFont(`-apple-system-font, "system-ui", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif`)

    const findContainer = (retries = 5, delay = 100) => {
      const container = document.getElementById(containerId)
      if (container) {
        const isDark = options?.themeMode === `dark`

        // 从 CSS 变量中读取主题颜色
        const root = document.documentElement
        const computedStyle = getComputedStyle(root)
        const primaryColor = computedStyle.getPropertyValue(`--md-primary-color`).trim()
        const backgroundColor = computedStyle.getPropertyValue(`--background`).trim()

        // 转换 HSL 格式
        const toHSLString = (variant: string) => {
          const vars = variant.split(` `)
          if (vars.length === 3)
            return `hsl(${vars.join(`, `)})`
          if (vars.length === 4)
            return `hsla(${vars.join(`, `)})`
          return ``
        }

        const instance = new Infographic({
          container,
          svg: {
            style: {
              width: `100%`,
              height: `100%`,
              background: isDark ? `#000` : `transparent`,
            },
            background: false,
          },
          theme: isDark ? `dark` : `default`,
          themeConfig: {
            colorPrimary: primaryColor || undefined,
            colorBg: toHSLString(backgroundColor) || undefined,
          },
        })

        instance.on(`loaded`, ({ node }) => {
          exportToSVG(node, { removeIds: true }).then((svg) => {
            container.replaceChildren(svg)
          })
        })

        instance.render(code)

        return
      }

      if (retries > 0) {
        setTimeout(() => findContainer(retries - 1, delay), delay)
      }
    }

    findContainer()
  }
  catch (error) {
    console.error(`Failed to render Infographic:`, error)
    const container = document.getElementById(containerId)
    if (container) {
      container.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red;">Infographic 渲染失败: ${error instanceof Error ? error.message : String(error)}</div>`
    }
  }
}

export default function markedInfographic(options?: InfographicOptions): MarkedExtension {
  const className = `infographic-diagram`
  const store = useStore()
  const { isDark } = storeToRefs(store)
  options = { themeMode: isDark ? `dark` : `light` }
  return {
    extensions: [
      {
        name: `infographic`,
        level: `block`,
        start(src: string) {
          return src.match(/^```infographic/m)?.index
        },
        tokenizer(src: string) {
          const match = /^```infographic\r?\n([\s\S]*?)\r?\n```/.exec(src)
          if (match) {
            return {
              type: `infographic`,
              raw: match[0],
              text: match[1].trim(),
            }
          }
        },
        renderer(token: any) {
          const code = token.text
          const containerId = `mermaid-${genMermaidId()}`
          renderInfographic(containerId, code, options)
          return `<!--infographic-start--><div id="${containerId}" class="${className}" style="width: 100%;">正在加载 Infographic...</div><!--infographic-end-->`
        },
      },
    ],
    walkTokens(token: any) {
      if (token.type === `code` && token.lang === `infographic`) {
        token.type = `infographic`
      }
    },
  }
}
