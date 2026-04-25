import type { Ref } from 'vue'
import { exportToSVG, Infographic, loadSVGResource, registerResourceLoader, setDefaultFont, setFontExtendFactor } from '@antv/infographic'
import { Marked } from 'marked'
import mermaid from 'mermaid'
import { infographicClassName } from '@/config/infographicConfig'
import { convertInfographicForeignObjects, fixInfographicGradientFromDom, sanitizeMermaidSvg, toHSLString } from '@/lib/utils'
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

interface mermaidOptions {
  themeMode?: `dark` | `light`
  backgroundColor?: string
  isSvgCompatibility?: boolean
}

async function renderMermaid(id: string, code: string, cacheKey: string, options: mermaidOptions): Promise<string | void> {
  if (typeof window === `undefined`)
    return

  try {
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
  const { isDark, isSvgCompatibility } = storeToRefs(store)

  const themeMode = isDark.value ? `dark` : `light`

  const root = document.documentElement
  const computedStyle = getComputedStyle(root)
  const backgroundColor = computedStyle.getPropertyValue(`--background`).trim()

  const setBackgroundColor = isDark.value ? `transparent` : toHSLString(backgroundColor)

  const options: mermaidOptions = {
    themeMode,
    backgroundColor: setBackgroundColor,
    isSvgCompatibility: isSvgCompatibility.value,
  }

  const elements = document.querySelectorAll(el)
  for (const node of elements) {
    const code = node.textContent ?? ``
    const cacheKey = simpleHash(`${code}-${options.themeMode || `light`}-${options.isSvgCompatibility}`)
    const cached = mermaidCache.get(cacheKey)

    node.parentElement!.style.background = setBackgroundColor

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
}

// Infographic

interface InfographicOptions {
  themeMode?: `dark` | `light`
  fontSize?: Ref<string | number>
  primaryColor?: Ref<string>
  isSvgCompatibility?: Ref<boolean>
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

async function renderInfographic(containerId: string, code: string, cacheKey: string, options?: InfographicOptions): Promise<void> {
  if (typeof window === `undefined`)
    return

  return new Promise((resolve, reject) => {
    try {
      setFontExtendFactor(1.1)
      setDefaultFont(`-apple-system-font, "system-ui", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif`)
      const findContainer = (retries = 5, delay = 100) => {
        const container = document.getElementById(containerId)

        if (container) {
          const isDark = options?.themeMode === `dark`
          const fontSize = options?.fontSize
          const primaryColor = options?.primaryColor
          const isSvgCompatibility = options?.isSvgCompatibility

          const root = document.documentElement
          const computedStyle = getComputedStyle(root)
          const backgroundColor = computedStyle.getPropertyValue(`--background`).trim()

          const instance = new Infographic({
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
                'font-size': fontSize?.value,
                'font-weight': `bold`,
              },
              desc: {
                'font-size': fontSize?.value ? Math.floor((typeof fontSize.value === `number` ? fontSize.value : Number.parseFloat(fontSize.value)) * 0.8) : undefined,
              },
            },
          })

          watch(
            () => fontSize?.value,
            (val) => {
              instance.update?.({
                themeConfig: {
                  title: {
                    'font-size': val ? typeof val === `number` ? val : Number.parseFloat(val) : undefined,
                  },
                  desc: {
                    'font-size': val ? Math.floor((typeof val === `number` ? val : Number.parseFloat(val)) * 0.8) : undefined,
                  },
                },
              })
            },
            { immediate: true },
          )

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
                container.replaceChildren(fixInfographicGradientFromDom(svg))
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

export async function getOrRenderInfographicSvg(html: string, el = `.infographic`) {
  const store = useStore()
  const { isDark, fontSize, primaryColor, isSvgCompatibility } = storeToRefs(store)
  const options: InfographicOptions = {
    themeMode: isDark.value ? `dark` : `light`,
    fontSize,
    primaryColor,
    isSvgCompatibility,
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, `text/html`)
  const infographicEl = doc.querySelectorAll(el)
  const rendered = document.querySelectorAll(`.infographic-diagram`)

  for (let i = 0; i < rendered.length; i++) {
    const code = infographicEl[i].innerHTML
    // const cacheKey = simpleHash(`${code}-${options?.themeMode || `light`}`)
    const cacheKey = simpleHash(`${code}-${options?.themeMode || `light`}-${options.isSvgCompatibility?.value}`)
    const cached = infographicCache.get(cacheKey)

    if (cached) {
      const uniqueId = `infographic-instances-${Math.random().toString(36).slice(2)}`
      rendered[i].outerHTML = `<section id="${uniqueId}" style="width: 100%;" class="${infographicClassName}">${cached}</section>`
      continue
    }

    let container: HTMLElement | null = null
    const id = `infographic-${cacheKey}`
    rendered[i].outerHTML = `<div id="${id}" style="width: 100%;" class="${infographicClassName}">正在加载 Infographic...</div>`

    container = document.getElementById(id)!

    try {
      await renderInfographic(id, code, cacheKey, options)

      if (!container.innerHTML) {
        container.innerHTML = `<div style="color:red">渲染失败</div>`
      }
    }
    catch (e) {
      console.error(e)
      container.innerHTML = `<div style="color:red">渲染失败</div>`
    }
  }

  const rendering = document.querySelectorAll(el)
  for (let i = 0; i < rendering.length; i++) {
    const code = rendering[i].innerHTML
    const cacheKey = simpleHash(`${code}-${options?.themeMode || `light`}-${options.isSvgCompatibility?.value}`)
    const cached = infographicCache.get(cacheKey)

    if (cached) {
      const uniqueId = `infographic-instances-${Math.random().toString(36).slice(2)}`
      rendering[i].outerHTML = `<div id="${uniqueId}" style="width: 100%;" class="${infographicClassName}">${cached}</div>`
      continue
    }

    const id = `infographic-${cacheKey}`
    rendering[i].outerHTML = `<div id="${id}" style="width: 100%;" class="${infographicClassName}">正在加载 Infographic...</div>`

    const container = document.getElementById(id)!

    try {
      await renderInfographic(id, code, cacheKey, options)

      if (!container.innerHTML) {
        container.innerHTML = `<div style="color:red">渲染失败</div>`
      }
    }
    catch (e) {
      console.error(e)
      container.innerHTML = `<div style="color:red">渲染失败</div>`
    }
  }
}
