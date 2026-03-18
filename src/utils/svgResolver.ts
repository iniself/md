import mermaid from 'mermaid'

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

const className = `mermaid-diagram`
const svgCache = new Map<string, string>()
let lastRenderedSvg: string | null = null

function renderMermaid(id: string, code: string, cacheKey: string) {
  if (typeof window === `undefined`)
    return

  const handleResult = (svg: string) => {
    svgCache.set(cacheKey, svg)
    lastRenderedSvg = svg

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
    handleResult(result.svg)
  }).catch(handleError)
}

export function getOrRenderSvg(el: string) {
  document.querySelectorAll(el).forEach((el) => {
    const code = el.textContent
    const cacheKey = simpleHash(code)
    const cached = svgCache.get(cacheKey)
    if (cached) {
      const uniqueId = `mermaid-instances-${Math.random().toString(36).slice(2)}`
      el.outerHTML = `<div id="${uniqueId}" class="${className}">${cached}</div>`
    }
    else {
      const id = `mermaid-${cacheKey}`
      renderMermaid(id, code, cacheKey)
      if (lastRenderedSvg) {
        el.outerHTML = `<div id="${id}" class="${className}">${lastRenderedSvg}</div>`
      }
      el.outerHTML = `<div id="${id}" class="${className}">正在加载 Mermaid...</div>`
    }
  })
}
