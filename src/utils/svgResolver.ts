import { exportToSVG, Infographic, loadSVGResource, registerResourceLoader, setDefaultFont, setFontExtendFactor } from '@antv/infographic'
import { Marked } from 'marked'
import mermaid from 'mermaid'
import { infographicClassName } from '@/config/infographicConfig'
import { convertInfographicForeignObjects, extractInfographicDefsFromDom, infographicDSLStore, mermaidDSLStore, sanitizeMermaidSvg, toHSLString } from '@/lib/utils'
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

async function renderMermaid(id: string, code: string, cacheKey: string, options: mermaidOptions): Promise<string | void> {
  if (typeof window === `undefined`)
    return

  try {
    const isValid = async (code: string) => {
      try {
        await mermaid.parse(code)
        return true
      }
      catch {
        return false
      }
    }

    if (!(await isValid(code))) {
      return ``
    }

    const result = await mermaid.render(`mermaid-svg-${cacheKey}`, code)
    let finalSvg = result.svg
    if (options.isSvgCompatibility) {
      finalSvg = sanitizeMermaidSvg(result.svg, options)
    }
    else {
      finalSvg = result.svg.replace(
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
    }
    mermaidCache.set(cacheKey, finalSvg)
    return finalSvg
  }
  catch (error) {
    console.error(`Failed to render Mermaid:`, error)
    const el = document.getElementById(id)
    if (el) {
      el.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red;">Mermaid 渲染失败: ${error instanceof Error ? error.message : String(error)}</div>`
    }
  }
}

export async function getOrRenderMermaidSvg(el = `.mermaid`) {
  const store = useStore()
  const { isDark, isSvgCompatibility, primaryColor, isSvgBackgroundless } = storeToRefs(store)
  const themeMode = isDark.value ? `dark` : `light`

  const root = document.documentElement
  const computedStyle = getComputedStyle(root)
  const backgroundColor = computedStyle.getPropertyValue(`--background`).trim()

  const setBackgroundColor = isDark.value ? `transparent` : toHSLString(backgroundColor)

  const options: mermaidOptions = {
    themeMode,
    backgroundColor: setBackgroundColor,
    isSvgCompatibility: isSvgCompatibility.value,
    isSvgBackgroundless: isSvgBackgroundless.value,
  }

  const elements = document.querySelectorAll(el)
  for (const node of elements) {
    const figureEl = node.parentElement
    if (!figureEl || figureEl.tagName.toLowerCase() !== `figure`)
      return
    let code = ``
    if (options.isSvgCompatibility) {
      code = node.textContent ?? ``
    }
    else {
      code = mermaidDSLStore.get(figureEl.id) ?? ``
    }
    const cacheKey = simpleHash(`${code}-${options.themeMode || `light`}-${primaryColor.value}-${options.isSvgCompatibility}-${options.isSvgBackgroundless}`)
    const cached = mermaidCache.get(cacheKey)

    if (cached) {
      const uniqueId = `mermaid-instances-${Math.random().toString(36).slice(2)}`
      node.outerHTML = `<section id="${uniqueId}" class="${mermaidClassName}" style="margin:0 auto">${cached}</section>`
      continue
    }

    const id = `mermaid-${cacheKey}`
    let container: HTMLElement | null = null
    try {
      node.outerHTML = `<section id="${id}" class="${mermaidClassName}" style="margin:0 auto">正在加载 Mermaid...</section>`
      container = document.getElementById(id)!
      const svg = await renderMermaid(id, code, cacheKey, options)
      if (svg) {
        container.innerHTML = svg
      }
    }
    catch (e) {
      console.error(e)
      if (container) {
        container.innerHTML = `<div style="color:red">渲染失败</div>`
      }
    }
  }
  mermaidDSLStore.clear()
}

// Infographic

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

setFontExtendFactor(1.1)
setDefaultFont(`-apple-system-font, "system-ui", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif`)

async function renderInfographic(containerId: string, code: string, cacheKey: string, options?: InfographicOptions): Promise<void> {
  if (typeof window === `undefined`)
    return

  return new Promise((resolve, reject) => {
    try {
      const findContainer = (retries = 5, delay = 100) => {
        const container = document.getElementById(containerId)

        if (container) {
          const isDark = options?.themeMode === `dark`
          const fontSize = options?.fontSize
          const primaryColor = options?.primaryColor
          const isSvgCompatibility = options?.isSvgCompatibility
          const isSvgBackgroundless = options?.isSvgBackgroundless

          const root = document.documentElement
          const computedStyle = getComputedStyle(root)
          const backgroundColor = computedStyle.getPropertyValue(`--background`).trim()
          const instance = isSvgCompatibility?.value && isSvgBackgroundless?.value
            ? new Infographic({
              container,
              svg: {
                style: {
                  width: `100%`,
                  height: `100%`,
                },
              },
              themeConfig: {
                colorBg: `transparent`,
                colorPrimary: primaryColor?.value || undefined,
                base: {
                  shape: {
                    stroke: primaryColor?.value,
                  },
                  text: {
                    fill: primaryColor?.value,
                  },
                },
                item: {
                  shape: {
                    fill: `white`,
                  },
                },
                title: {
                  'font-size': fontSize?.value ? typeof fontSize?.value === `number` ? fontSize?.value : Number.parseFloat(fontSize?.value) : undefined,
                  'font-weight': `bold`,
                },
                desc: {
                  'font-size': fontSize?.value ? Math.floor((typeof fontSize.value === `number` ? fontSize.value : Number.parseFloat(fontSize.value)) * 0.8) : undefined,
                },
              },
            })
            : new Infographic({
              container,
              svg: {
                style: {
                  width: `100%`,
                  height: `100%`,
                },
              },
              theme: isDark ? `dark` : `default`,
              themeConfig: {
                colorPrimary: primaryColor?.value || undefined,
                colorBg: isDark ? `transparent` : toHSLString(backgroundColor) || undefined,
                title: {
                  'font-size': fontSize?.value ? typeof fontSize?.value === `number` ? fontSize?.value : Number.parseFloat(fontSize?.value) : undefined,
                  'font-weight': `bold`,
                },
                desc: {
                  'font-size': fontSize?.value ? Math.floor((typeof fontSize.value === `number` ? fontSize.value : Number.parseFloat(fontSize.value)) * 0.8) : undefined,
                },
              },
            })

          let resolved = false
          const timeoutId = setTimeout(() => {
            if (!resolved) {
              resolved = true
              reject(new Error(`Infographic render timeout`))
            }
          }, 3000)

          instance.on(`loaded`, async ({ node }) => {
            if (resolved)
              return
            resolved = true

            try {
              const svg = await exportToSVG(node, { removeIds: true })
              if (isSvgCompatibility?.value) {
                convertInfographicForeignObjects(svg)
                container.replaceChildren(extractInfographicDefsFromDom(svg))
              }
              else {
                container.replaceChildren(svg)
              }
              infographicCache.set(cacheKey, container.innerHTML)
              clearTimeout(timeoutId)
              resolve()
            }
            catch (err) {
              clearTimeout(timeoutId)
              reject(err)
            }
          })

          try {
            instance.render(code)
          }
          catch (err) {
            clearTimeout(timeoutId)
            reject(err)
          }

          return
        }

        if (retries > 0) {
          setTimeout(() => findContainer(retries - 1, delay), delay)
        }
        else {
          reject(new Error(`Container not found`))
        }
      }

      findContainer()
    }
    catch (error) {
      reject(error)
    }
  })
}

export async function getOrRenderInfographicSvg(el = `.infographic`) {
  const store = useStore()
  const { isDark, fontSize, primaryColor, isSvgCompatibility, isSvgBackgroundless } = storeToRefs(store)
  const options: InfographicOptions = {
    themeMode: isDark.value ? `dark` : `light`,
    fontSize,
    primaryColor,
    isSvgCompatibility,
    isSvgBackgroundless,
  }

  const elements = document.querySelectorAll(el)
  for (const node of elements) {
    const figureEl = node.parentElement
    if (!figureEl || figureEl.tagName.toLowerCase() !== `figure`)
      return
    let code = ``
    if (options.isSvgCompatibility?.value) {
      code = node.textContent ?? ``
    }
    else {
      code = infographicDSLStore.get(figureEl.id) ?? ``
    }

    const cacheKey = simpleHash(`${code}-${options?.themeMode || `light`}-${options.isSvgCompatibility?.value}-${options.fontSize?.value}-${options.primaryColor?.value}`)
    const cached = infographicCache.get(cacheKey)

    if (cached) {
      const uniqueId = `infographic-instances-${Math.random().toString(36).slice(2)}`
      node.outerHTML = `<section id="${uniqueId}" style="display: flex; justify-content: center;" class="${infographicClassName}">${cached}</section>`
      continue
    }

    const id = `infographic-${cacheKey}`
    let container: HTMLElement | null = null

    try {
      node.outerHTML = `<section id="${id}" style="display: flex; justify-content: center;" class="${infographicClassName}">正在加载 Infographic...</section>`
      container = document.getElementById(id)!
      await renderInfographic(id, code, cacheKey, options)

      if (!container.innerHTML) {
        container.innerHTML = `<div style="color:red">渲染失败</div>`
      }
    }
    catch (e) {
      console.error(e)
      if (container) {
        container.innerHTML = `<div style="color:red">渲染失败</div>`
      }
    }
  }
  infographicDSLStore.clear()
}

/**
 * Legacy fallback alignment logic.
 * CSS-based layout is now the primary implementation.
 * Kept for potential future use.
 */

export function adjustFullWidthBlocksAlignmentInChat(selectors = [`.chat-block-mermaid`, `.chat-block-infographic`, `.chat-block-image`]) {
  const elements = document.querySelectorAll(selectors.join(`, `))
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.width = `100%`

    Array.from(htmlEl.children).forEach((child) => {
      if (htmlEl.classList.contains(`chat-block-right`)) {
        (child as HTMLElement).style.margin = `0 0 0 auto`
      }
      else if (htmlEl.classList.contains(`chat-block-left`)) {
        (child as HTMLElement).style.margin = `0 auto 0 0`
      }
    })
  })
}
