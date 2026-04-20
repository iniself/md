import { exportToSVG, Infographic, loadSVGResource, registerResourceLoader, setDefaultFont, setFontExtendFactor } from '@antv/infographic'
import { Marked } from 'marked'
import mermaid from 'mermaid'
import markedTextExtension from './MDTextExtension'

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

const mermaidClassName = `mermaid-diagram`
const mermaidCache = new Map<string, string>()
let lastRenderedMermaid: string | null = null

function renderMermaid(id: string, code: string, cacheKey: string) {
  if (typeof window === `undefined`)
    return

  const handleResult = (svg: string) => {
    mermaidCache.set(cacheKey, svg)
    lastRenderedMermaid = svg

    const el = document.getElementById(id)
    if (el) {
      el.innerHTML = svg
    }
  }

  const handleError = (error: unknown) => {
    console.error(`Failed to render Mermaid:`, error)
    const el = document.getElementById(id)
    if (el) {
      el.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red;">Mermaid 渲染失败: ${error instanceof Error ? error.message : String(error)}</div>`
    }
  }
  mermaid.render(`mermaid-svg-${cacheKey}`, code).then((result: { svg: string }) => {
    const svg = result.svg.replace(
      /<svg([^>]*)>/,
      (_, attrs) => {
        if (/style="/.test(attrs)) {
          return `<svg${attrs.replace(/style="(.*?)"/, `style="display:block;margin:0 auto;$1"`)}>`
        }
        else {
          return `<svg${attrs} style="display:block;margin:0 auto;">`
        }
      },
    )

    handleResult(svg)
  }).catch(handleError)
}

export function getOrRenderMermaidSvg(el = `.mermaid`) {
  document.querySelectorAll(el).forEach((el) => {
    const code = el.textContent ?? ``
    const cacheKey = simpleHash(code)
    const cached = mermaidCache.get(cacheKey)
    if (cached) {
      const uniqueId = `mermaid-instances-${Math.random().toString(36).slice(2)}`
      el.outerHTML = `<div id="${uniqueId}" class="${mermaidClassName}" style="margin:0 auto">${cached}</div>`
    }
    else {
      const id = `mermaid-${cacheKey}`
      renderMermaid(id, code, cacheKey)
      if (lastRenderedMermaid) {
        el.outerHTML = `<div id="${id}" class="${mermaidClassName}" style="margin:0 auto">${lastRenderedMermaid}</div>`
      }
      el.outerHTML = `<div id="${id}" class="${mermaidClassName}" style="margin:0 auto">正在加载 Mermaid...</div>`
    }
  })
}

// Infographic

interface InfographicOptions {
  themeMode?: `dark` | `light`
}

const markedInstance = new Marked()
markedInstance.use(markedTextExtension({ mode: `infographic` }))

registerResourceLoader(async (config) => {
  const { data, scene = `icon` } = config

  if (scene === `icon`) {
    let raw = data.trim()
    if (!raw.startsWith(`=`)) {
      raw = `=${raw}`
    }
    if (!raw.endsWith(`=`)) {
      raw = `${raw}=`
    }

    const str = await markedInstance.parseInline(raw)

    const match = str.match(/<svg[\s\S]*?<\/svg>/)
    const svg = match ? match[0] : null
    if (!svg) {
      return null
    }

    const res = loadSVGResource(svg)
    return res
  }

  return null
})

const infographicCache = new Map<string, string>()
let lastRenderedInfographic: string | null = null
const infographicClassName = `infographic-diagram`

function fixSvgGradientFromDom(svgEl: SVGSVGElement): SVGSVGElement {
  const gradientMap = new Map<string, boolean>()

  let defs = svgEl.querySelector(`defs`) as SVGDefsElement | null

  if (!defs) {
    defs = document.createElementNS(
      `http://www.w3.org/2000/svg`,
      `defs`,
    ) as SVGDefsElement

    svgEl.insertBefore(defs, svgEl.firstChild)
  }

  const elements = svgEl.querySelectorAll<SVGElement>(`[stroke],[fill]`)

  elements.forEach((el: SVGElement) => {
    ([`stroke`, `fill`] as const).forEach((attr) => {
      const val = el.getAttribute(attr)
      if (!val)
        return

      const match = val.match(
        /data:image\/svg\+xml;charset=utf-8,([\s\S]*?)(?:"|')?\)/,
      )
      if (!match)
        return

      const decoded = decodeURIComponent(match[1])

      const idMatch = decoded.match(/#([\w-]+)$/)
      const refId = idMatch?.[1]

      const gradients = decoded.match(
        /<linearGradient[\s\S]*?<\/linearGradient>/g,
      )
      if (gradients) {
        gradients.forEach((grad) => {
          const idMatch = grad.match(/id="([^"]+)"/)
          if (!idMatch)
            return

          const id = idMatch[1]

          if (!gradientMap.has(id)) {
            gradientMap.set(id, true)

            const temp = document.createElementNS(
              `http://www.w3.org/2000/svg`,
              `g`,
            )
            temp.innerHTML = grad

            const node = temp.firstElementChild
            if (node) {
              const gradEl = node as SVGLinearGradientElement

              const originalId = gradEl.getAttribute(`id`)
              if (originalId) {
                gradEl.setAttribute(`data-origin-id`, originalId)
              }

              gradEl.setAttribute(`data-fixed-def`, gradEl.tagName.toLowerCase())
              defs!.appendChild(gradEl)
            }
          }
        })
      }

      if (refId) {
        el.setAttribute(attr, `url(#${refId})`)
        el.setAttribute(`data-origin-${attr}`, refId)
        el.setAttribute(`data-fixed-ref`, attr)
      }
    })
  })

  return svgEl
}

async function renderInfographic(containerId: string, code: string, cacheKey: string, options?: InfographicOptions) {
  if (typeof window === `undefined`)
    return
  try {
    setFontExtendFactor(1.1)
    setDefaultFont(`-apple-system-font, "system-ui", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif`)
    const findContainer = (retries = 5, delay = 100) => {
      const container = document.getElementById(containerId)
      if (container) {
        const isDark = options?.themeMode === `dark`

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
            container.replaceChildren(fixSvgGradientFromDom(svg))
            infographicCache.set(cacheKey, container.innerHTML)
            lastRenderedInfographic = container.innerHTML
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

export function getOrRenderInfographicSvg(el = `.infographic`) {
  const store = useStore()
  const { isDark } = storeToRefs(store)
  const options: InfographicOptions = { themeMode: isDark.value ? `dark` : `light` }

  document.querySelectorAll(el).forEach((el) => {
    const code = el.innerHTML
    const cacheKey = simpleHash(`${code}-${options?.themeMode || `light`}`)

    const cached = infographicCache.get(cacheKey)

    let html = ``
    if (cached) {
      const uniqueId = `infographic-instances-${Math.random().toString(36).slice(2)}`
      html = `<div id="${uniqueId}" style="width: 100%;" class="${infographicClassName}">${cached}</div>`
    }
    else {
      const id = `infographic-${cacheKey}`
      renderInfographic(id, code, cacheKey, options)
      if (lastRenderedInfographic) {
        html = `<div id="${id}" style="width: 100%;" class="${infographicClassName}">${lastRenderedInfographic}</div>`
      }
      html = `<div id="${id}" style="width: 100%;" class="${infographicClassName}">正在加载 Infographic...</div>`
    }
    el.outerHTML = html
  })
}
