import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { infographicClassName } from '@/config/infographicConfig'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hexToRgb(hex: string): string {
  let h = hex.replace(`#`, ``).trim()

  if (h.length === 3) {
    h = h.split(``).map(c => c + c).join(``)
  }

  const int = Number.parseInt(h, 16)

  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255

  return `${r}, ${g}, ${b}`
}

type PdfRuntime =
  | {
    type: `vivliostyle`
    print: any
  }
  | {
    type: `paged`
    code: string
  }

const pdfRuntimeMap = new Map<PdfLib, Promise<PdfRuntime>>()

async function loadPdfRuntime(pdfLib: PdfLib): Promise<PdfRuntime> {
  if (pdfLib === `vivliostyle`) {
    const { printHTML } = await import(`@vivliostyle/print`)
    return { type: `vivliostyle`, print: printHTML }
  }

  if (pdfLib === `paged`) {
    const mod = await import(`@/lib/paged.min@0.4.3.js?raw`)
    return { type: `paged`, code: mod.default }
  }

  throw new Error(`Unknown pdfLib: ${pdfLib}`)
}

export function getRuntime(pdfLib: PdfLib) {
  if (!pdfRuntimeMap.has(pdfLib)) {
    const promise = loadPdfRuntime(pdfLib).catch((err) => {
      pdfRuntimeMap.delete(pdfLib)
      throw err
    })
    pdfRuntimeMap.set(pdfLib, promise)
  }
  return pdfRuntimeMap.get(pdfLib)!
}

/**
 * create Tag
 *
 * createTag('script', code)
 * createTag('script', code, {type: 'module', defer: true})
 * createTag('div', 'hello', { class: 'box' })
 *
 *  createTag('style', `
 *  body {
 *    background: #fff;
 *  }
 *  `)
 *
 */

function escapeAttr(value: string) {
  return value
    .replace(/&/g, `&amp;`)
    .replace(/"/g, `&quot;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`)
    .replace(/'/g, `&#39;`)
}

export function createTag(
  tag: string,
  content = ``,
  attrs: Record<string, string | boolean | undefined> = {},
) {
  const attrString = Object.entries(attrs)
    .filter(([, v]) => v !== false && v != null)
    .map(([k, v]) => (v === true ? k : `${k}="${escapeAttr(String(v))}"`))
    .join(` `)

  const openTag = attrString ? `<${tag} ${attrString}>` : `<${tag}>`

  return `${openTag}\n${content.trim()}\n</${tag}>`
}

/**
 * svg utils
 *
 * toHSLString : 转换 HSL 格式
 * getTextMetrics：用 canvas 精确测量 baseline
 *
 */

export function toHSLString(variant: string): string {
  const vars = variant.split(` `)
  if (vars.length === 3)
    return `hsl(${vars.join(`, `)})`
  if (vars.length === 4)
    return `hsla(${vars.join(`, `)})`
  return ``
}

function hasVisibleBackground(style: CSSStyleDeclaration): boolean {
  const bg = style.backgroundColor

  if (!bg)
    return false

  if (bg === `transparent`)
    return false

  if (bg.startsWith(`rgba`)) {
    const alpha = Number.parseFloat(bg.split(`,`)[3])
    if (alpha === 0)
      return false
  }

  return true
}

// TODO: may be used for SVG text layout fallback in future
// function getTextMetrics(text: string, fontSize: number, fontFamily: string = `sans-serif`): {
//   ascent: number
//   descent: number
// } {
//   const canvas: HTMLCanvasElement = document.createElement(`canvas`)
//   const ctx = canvas.getContext(`2d`)

//   if (!ctx) {
//     return {
//       ascent: fontSize * 0.8,
//       descent: fontSize * 0.2,
//     }
//   }

//   ctx.font = `${fontSize}px ${fontFamily}`

//   const metrics = ctx.measureText(text)

//   return {
//     ascent: metrics.actualBoundingBoxAscent || fontSize * 0.8,
//     descent: metrics.actualBoundingBoxDescent || fontSize * 0.2,
//   }
// }

export function convertInfographicForeignObjects(svg: SVGSVGElement): void {
  const foreignObjects: NodeListOf<SVGForeignObjectElement> = svg.querySelectorAll(`foreignObject`)
  document.body.appendChild(svg)
  foreignObjects.forEach((fo) => {
    const span: HTMLSpanElement | null = fo.querySelector(`span`)
    if (!span)
      return

    const textContent: string = (span.textContent ?? ``).trim()
    if (!textContent)
      return

    const x: number = Number.parseFloat(fo.getAttribute(`x`) || `0`)
    const y: number = Number.parseFloat(fo.getAttribute(`y`) || `0`)
    const height = Number.parseFloat(fo.getAttribute(`height`) || `0`)
    const width: number = Number.parseFloat(fo.getAttribute(`width`) || `0`)

    const style: CSSStyleDeclaration = window.getComputedStyle(span)

    const fontSize: number = Number.parseFloat(style.fontSize || `16`)
    const color: string = style.color || `#000`
    const fontWeight: string = style.fontWeight || `normal`
    const fontFamily = style.fontFamily

    let lineHeight: number | string = style.lineHeight
    if (lineHeight.includes(`px`)) {
      lineHeight = Number.parseFloat(lineHeight)
    }
    else if (!Number.isNaN(Number.parseFloat(lineHeight))) {
      lineHeight = Number.parseFloat(lineHeight) * fontSize
    }
    else {
      lineHeight = fontSize * 1.4
    }

    const finalX: number = x + width / 2
    const finalY: number = y + height / 2

    const textEl: SVGTextElement = document.createElementNS(
      `http://www.w3.org/2000/svg`,
      `text`,
    )

    textEl.setAttribute(`x`, String(finalX))
    textEl.setAttribute(`y`, String(finalY))
    textEl.setAttribute(`dominant-baseline`, `middle`)
    textEl.setAttribute(`alignment-baseline`, `middle`)

    textEl.setAttribute(`font-size`, String(fontSize))
    textEl.setAttribute(`font-weight`, String(fontWeight))
    textEl.setAttribute(`font-family`, fontFamily)
    textEl.setAttribute(`fill`, color)
    textEl.setAttribute(`text-anchor`, `middle`)

    const tspan = document.createElementNS(
      `http://www.w3.org/2000/svg`,
      `tspan`,
    )
    tspan.textContent = textContent

    textEl.appendChild(tspan)

    const hasBg = hasVisibleBackground(style)
    let group: SVGGElement | SVGTextElement

    if (hasBg) {
      const rect = document.createElementNS(
        `http://www.w3.org/2000/svg`,
        `rect`,
      )
      const backgroundColor: string = style.backgroundColor
      const paddingLeft = Number.parseFloat(style.paddingLeft || `0`)
      const paddingRight = Number.parseFloat(style.paddingRight || `0`)
      const paddingTop = Number.parseFloat(style.paddingTop || `0`)
      const paddingBottom = Number.parseFloat(style.paddingBottom || `0`)

      svg.appendChild(textEl)
      const box = textEl.getBBox()
      textEl.remove()

      rect.setAttribute(`x`, `${box.x - paddingLeft}`)
      rect.setAttribute(`y`, `${box.y - paddingTop}`)
      rect.setAttribute(`width`, `${box.width + paddingLeft + paddingRight}`)
      rect.setAttribute(`height`, `${box.height + paddingTop + paddingBottom}`)

      rect.setAttribute(`fill`, backgroundColor || `transparent`)
      rect.setAttribute(`opacity`, `1`)
      rect.style.fill = backgroundColor || `transparent`
      rect.style.opacity = `1`
      rect.setAttribute(`rx`, `4`)

      const g = document.createElementNS(
        `http://www.w3.org/2000/svg`,
        `g`,
      )

      g.appendChild(rect)
      g.appendChild(textEl)

      group = g
    }
    else {
      group = textEl
    }

    fo.parentNode?.replaceChild(group, fo)
  })
  svg.remove()
}

export function extractInfographicDefsFromDom(svgEl: SVGSVGElement): SVGSVGElement {
  const defMap = new Map<string, boolean>()

  let defs = svgEl.querySelector(`defs`) as SVGDefsElement | null

  if (!defs) {
    defs = document.createElementNS(
      `http://www.w3.org/2000/svg`,
      `defs`,
    ) as SVGDefsElement

    svgEl.insertBefore(defs, svgEl.firstChild)
  }

  const elements = svgEl.querySelectorAll<SVGElement>(`[stroke],[fill],[filter]`)

  elements.forEach((el: SVGElement) => {
    ;([`stroke`, `fill`, `filter`] as const).forEach((attr) => {
      const val = el.getAttribute(attr)
      if (!val)
        return

      const urlMatch = val.match(/url\((['"]?)(.*?)\1\)/)

      if (!urlMatch)
        return

      const urlContent = urlMatch[2]
      const hashIndex = urlContent.lastIndexOf(`#`)

      if (hashIndex === -1)
        return

      const encodedSvg = urlContent.slice(0, hashIndex)

      const refId = decodeURIComponent(
        urlContent.slice(hashIndex + 1),
      )

      if (!refId)
        return

      const decoded = decodeURIComponent(encodedSvg)

      const defsMatches = decoded.match(
        /<(linearGradient|filter)[\s\S]*?<\/\1>/g,
      )

      if (defsMatches) {
        defsMatches.forEach((def) => {
          const idMatch = def.match(/id="([^"]+)"/)
          if (!idMatch)
            return

          const id = idMatch[1]

          if (!defMap.has(id)) {
            defMap.set(id, true)

            const temp = document.createElementNS(
              `http://www.w3.org/2000/svg`,
              `g`,
            )
            temp.innerHTML = def

            const node = temp.firstElementChild

            if (node) {
              const defEl = node as SVGElement

              const originalId = defEl.getAttribute(`id`)
              if (originalId) {
                defEl.setAttribute(`data-origin-id`, originalId)
              }
              defEl.setAttribute(`id`, id)
              defEl.setAttribute(`data-fixed-def`, defEl.tagName.toLowerCase())
              defs!.appendChild(defEl.cloneNode(true))
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

function convertMermaidForeignObjects(svg: SVGSVGElement): SVGSVGElement {
  const foreignObjects: NodeListOf<SVGForeignObjectElement> = svg.querySelectorAll(`foreignObject`)
  document.body.appendChild(svg)
  foreignObjects.forEach((fo) => {
    const span: HTMLSpanElement | null = fo.querySelector(`span`)
    if (!span)
      return

    const textContent: string = (span.textContent ?? ``).trim()
    if (!textContent)
      return

    const x: number = Number.parseFloat(fo.getAttribute(`x`) || `0`)
    const y: number = Number.parseFloat(fo.getAttribute(`y`) || `0`)
    const height = Number.parseFloat(fo.getAttribute(`height`) || `0`)
    const width: number = Number.parseFloat(fo.getAttribute(`width`) || `0`)

    const style: CSSStyleDeclaration = window.getComputedStyle(span)

    const fontSize: number = Number.parseFloat(style.fontSize || `16`)
    const color: string = style.color || `#000`
    const fontWeight: string = style.fontWeight || `normal`
    const fontFamily = style.fontFamily

    let lineHeight: number | string = style.lineHeight
    if (lineHeight.includes(`px`)) {
      lineHeight = Number.parseFloat(lineHeight)
    }
    else if (!Number.isNaN(Number.parseFloat(lineHeight))) {
      lineHeight = Number.parseFloat(lineHeight) * fontSize
    }
    else {
      lineHeight = fontSize * 1.4
    }

    const finalX: number = x + width / 2
    const finalY: number = y + height / 2

    const textEl: SVGTextElement = document.createElementNS(
      `http://www.w3.org/2000/svg`,
      `text`,
    )

    textEl.setAttribute(`x`, String(finalX))
    textEl.setAttribute(`y`, String(finalY))
    textEl.setAttribute(`dominant-baseline`, `middle`)
    textEl.setAttribute(`alignment-baseline`, `middle`)

    textEl.setAttribute(`font-size`, String(fontSize))
    textEl.setAttribute(`font-weight`, String(fontWeight))
    textEl.setAttribute(`font-family`, fontFamily)
    textEl.setAttribute(`fill`, color)
    textEl.setAttribute(`text-anchor`, `middle`)

    const tspan = document.createElementNS(
      `http://www.w3.org/2000/svg`,
      `tspan`,
    )
    tspan.textContent = textContent

    textEl.appendChild(tspan)

    const hasBg = hasVisibleBackground(style)
    let group: SVGGElement | SVGTextElement

    if (hasBg) {
      const rect = document.createElementNS(
        `http://www.w3.org/2000/svg`,
        `rect`,
      )
      const backgroundColor: string = style.backgroundColor
      const paddingLeft = Number.parseFloat(style.paddingLeft || `0`)
      const paddingRight = Number.parseFloat(style.paddingRight || `0`)
      const paddingTop = Number.parseFloat(style.paddingTop || `0`)
      const paddingBottom = Number.parseFloat(style.paddingBottom || `0`)

      svg.appendChild(textEl)
      const box = textEl.getBBox()
      textEl.remove()

      rect.setAttribute(`x`, `${box.x - paddingLeft}`)
      rect.setAttribute(`y`, `${box.y - paddingTop}`)
      rect.setAttribute(`width`, `${box.width + paddingLeft + paddingRight}`)
      rect.setAttribute(`height`, `${box.height + paddingTop + paddingBottom}`)

      rect.setAttribute(`fill`, backgroundColor || `transparent`)
      rect.setAttribute(`opacity`, `1`)
      rect.style.fill = backgroundColor || `transparent`
      rect.style.opacity = `1`
      rect.setAttribute(`rx`, `4`)

      const g = document.createElementNS(
        `http://www.w3.org/2000/svg`,
        `g`,
      )

      g.appendChild(rect)
      g.appendChild(textEl)

      group = g
    }
    else {
      group = textEl
    }

    fo.parentNode?.replaceChild(group, fo)
  })
  svg.remove()
  return svg
}

export function sanitizeMermaidSvg(svgStr: string, options: mermaidOptions) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgStr, `image/svg+xml`)
  let svg = doc.querySelector(`svg`)
  if (!svg)
    return svgStr

  svg = convertMermaidForeignObjects(svg)

  svg.style.display = `block`
  svg.style.margin = `0 auto`
  document.body.appendChild(svg)

  if (!options.isSvgBackgroundless) {
    const vb = svg.viewBox.baseVal

    const bg = doc.createElementNS(`http://www.w3.org/2000/svg`, `rect`)
    bg.setAttribute(`x`, String(vb.x))
    bg.setAttribute(`y`, String(vb.y))
    bg.setAttribute(`width`, String(vb.width))
    bg.setAttribute(`height`, String(vb.height))
    bg.setAttribute(`fill`, options.backgroundColor || `currentColor`)

    svg.insertBefore(bg, svg.firstChild)
  }

  const paths = Array.from(svg.querySelectorAll(`path, line, polyline`)) as SVGGraphicsElement[]

  function getDirection(el: SVGGraphicsElement) {
    // path
    if (el instanceof SVGPathElement) {
      const len = el.getTotalLength()
      if (len < 2)
        return null

      const p2 = el.getPointAtLength(len)
      const p1 = el.getPointAtLength(len - 1)

      return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
    }

    // line
    if (el instanceof SVGLineElement) {
      return {
        x1: el.x1.baseVal.value,
        y1: el.y1.baseVal.value,
        x2: el.x2.baseVal.value,
        y2: el.y2.baseVal.value,
      }
    }

    // polyline
    if (el instanceof SVGPolylineElement) {
      const points = el.points
      if (points.length < 2)
        return null

      const p1 = points.getItem(points.length - 2)
      const p2 = points.getItem(points.length - 1)

      return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
    }

    return null
  }

  function drawArrow(type: string, x: number, y: number, angle: number, color: string, size: number) {
    const el = doc.createElementNS(`http://www.w3.org/2000/svg`, `path`)

    if (type === `point`) {
      el.setAttribute(`d`, `M0 0 L-${size} ${-size / 2} L-${size} ${size / 2} Z`)
      el.setAttribute(`fill`, color)
    }
    else if (type === `circle`) {
      const r = size / 2
      el.setAttribute(`d`, `M0 0 m -${r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0`)
      el.setAttribute(`fill`, color)
    }
    else if (type === `cross`) {
      const r = size / 2
      el.setAttribute(`d`, `M-${r} -${r} L${r} ${r} M${r} -${r} L-${r} ${r}`)
      el.setAttribute(`stroke`, color)
      el.setAttribute(`stroke-width`, `1`)
      el.setAttribute(`fill`, `none`)
    }

    el.setAttribute(`transform`, `translate(${x},${y}) rotate(${angle})`)
    svg!.appendChild(el)
  }

  paths.forEach((path) => {
    const end = path.getAttribute(`marker-end`)
    const start = path.getAttribute(`marker-start`)
    if (!end && !start)
      return

    const vec = getDirection(path)
    if (!vec)
      return

    const angle = Math.atan2(vec.y2 - vec.y1, vec.x2 - vec.x1) * 180 / Math.PI
    const stroke = window.getComputedStyle(path).stroke || `#333`
    const strokeWidth = Math.max(2, Number.parseFloat(path.getAttribute(`stroke-width`) || `2`))
    const size = Math.max(4, strokeWidth * 6)

    let endType: string | null = null

    if (end?.includes(`circleEnd`)) {
      endType = `circle`
    }
    else if (end?.includes(`crossEnd`)) {
      endType = `cross`
    }
    else if (
      end?.includes(`arrowhead`)
      || end?.includes(`pointEnd`)
    ) {
      endType = `point`
    }
    else if (end) {
      endType = `point`
    }

    if (endType) {
      drawArrow(endType, vec.x2, vec.y2, angle, stroke, size)
    }

    if (start?.includes(`pointStart`) || start) {
      drawArrow(`point`, vec.x1, vec.y1, angle + 180, stroke, size)
    }

    path.removeAttribute(`marker-end`)
    path.removeAttribute(`marker-start`)
  })

  svg.querySelectorAll(`marker`).forEach(m => m.remove())
  const sanitizedSvg = new XMLSerializer().serializeToString(svg)
  svg.remove()
  return sanitizedSvg
}

export function replaceGradientsWithSolidColors(doc: Document, mode: string) {
  const infographicsContainer = doc.querySelectorAll(`.${infographicClassName}`)

  if (mode !== `txt` && mode !== `pdf`)
    return

  infographicsContainer.forEach((container) => {
    const svgList = container.querySelectorAll<SVGSVGElement>(`svg`)

    svgList.forEach((svg) => {
      const defs = svg.querySelector(`defs`)
      const gradients = svg.querySelectorAll<SVGLinearGradientElement>(`linearGradient`)

      const gradientColorMap = new Map<string, { stroke: string, fill: string }>()

      gradients.forEach((g) => {
        const id = g.getAttribute(`id`)
        if (!id)
          return

        const stops = Array.from(g.querySelectorAll(`stop`))

        if (!stops.length)
          return

        const midIndex = Math.floor(stops.length / 2)

        const midStop = stops[midIndex] || stops[0]

        const baseColor = midStop.getAttribute(`stop-color`) || `#000`
        const opacity = midStop.getAttribute(`stop-opacity`)

        const strokeColor = baseColor

        const fillOpacity
          = opacity !== null
            ? Math.min(Number.parseFloat(opacity), 0.25)
            : 0.18

        gradientColorMap.set(id, {
          stroke: strokeColor,
          fill: `rgba(${hexToRgb(baseColor)}, ${fillOpacity})`,
        })
      })
      if (gradientColorMap.size === 0) {
        return
      }

      const targets = svg.querySelectorAll<SVGElement>(`[stroke],[fill]`)

      targets.forEach((el) => {
        ([`stroke`, `fill`] as const).forEach((attr) => {
          const val = el.getAttribute(attr)
          if (!val)
            return

          const match = val.match(/url\(#([^)]+)\)/)
          if (!match)
            return

          const id = match[1]

          let mapped = gradientColorMap.get(id)
          if (!mapped) {
            for (const key of gradientColorMap.keys()) {
              if (id.includes(key)) {
                mapped = gradientColorMap.get(key)
              }
            }
          }

          if (!mapped) {
            return
          }

          if (attr === `stroke`) {
            el.setAttribute(`stroke`, mapped.stroke)
          }

          if (attr === `fill`) {
            el.setAttribute(`fill`, mapped.fill)
          }
        })
      })

      if (defs) {
        defs.remove()
      }
    })
  })
}

export function fixGradientIDChangedByVivliostyle(iframeWin: Window) {
  iframeWin.document.documentElement.querySelectorAll(`[data-fixed-ref]`).forEach((el) => {
    const which = el.getAttribute(`data-fixed-ref`) || ``
    if (!which) {
      return
    }

    const origin = el.getAttribute(`data-origin-${which}`)
    el.setAttribute(which, `url(#${origin})`)
  })
}

export function replaceSvgId(
  svg: string,
  oldId: string,
  newId: string,
) {
  return (svg as any).replaceAll(oldId, newId)
}

const mermaidDSLCache = new Map<string, string>()
const mermaidOrder: string[] = []

export const mermaidDSLStore = {
  set: (id: string, text: string) => {
    mermaidOrder.push(id)
    mermaidDSLCache.set(id, text)
  },
  getById: (id: string): [number, string] => {
    return [
      mermaidOrder.indexOf(id),
      mermaidDSLCache.get(id) ?? '',
    ]
  },
  deleteById: (id: string) => {
    mermaidDSLCache.delete(id)

    const index = mermaidOrder.indexOf(id)
    if (index !== -1) {
      mermaidOrder.splice(index, 1)
    }
  },
  clear: () => {
    mermaidDSLCache.clear()
    mermaidOrder.length = 0
  },
  getAll: () => {
    return mermaidOrder.map((id, index) => ({
      id,
      text: mermaidDSLCache.get(id),
      index,
    }))
  },
}

const infographicDSLCache = new Map<string, string>()
const infographicOrder: string[] = []

export const infographicDSLStore = {
  set: (id: string, text: string) => {
    infographicOrder.push(id)
    infographicDSLCache.set(id, text)
  },
  getById: (id: string): [number, string] => {
    return [
      infographicOrder.indexOf(id),
      infographicDSLCache.get(id) ?? '',
    ]
  },
  deleteById: (id: string) => {
    infographicDSLCache.delete(id)

    const index = infographicOrder.indexOf(id)
    if (index !== -1) {
      infographicOrder.splice(index, 1)
    }
  },
  clear: () => {
    infographicDSLCache.clear()
    infographicOrder.length = 0
  },
  getAll: () => {
    return infographicOrder.map((id, index) => ({
      id,
      text: infographicDSLCache.get(id),
      index,
    }))
  },
}

const mathDSLCache = new Map<string, string>()
const mathOrder: string[] = []

export const mathDSLStore = {
  set: (id: string, text: string) => {
    mathOrder.push(id)
    mathDSLCache.set(id, text)
  },
  getById: (id: string): [number, string] => {
    return [
      mathOrder.indexOf(id),
      mathDSLCache.get(id) ?? '',
    ]
  },
  getByDSL: (dsl: string): { id: string, text: string, index: number }[] => {
    return mathOrder.flatMap((id, index) => {
      const text = mathDSLCache.get(id)

      if (text !== dsl) {
        return []
      }

      return [{
        id,
        text,
        index,
      }]
    })
  },
  getIncludeDSL: (dsl: string): { id: string, text: string, index: number }[] => {
    return mathOrder.flatMap((id, index) => {
      const text = mathDSLCache.get(id)

      if (!text || !text.includes(dsl)) {
        return []
      }

      return [{
        id,
        text,
        index,
      }]
    })
  },
  deleteById: (id: string) => {
    mathDSLCache.delete(id)
    const index = mathOrder.indexOf(id)
    if (index !== -1) {
      mathOrder.splice(index, 1)
    }
  },
  clear: () => {
    mathDSLCache.clear()
    mathOrder.length = 0
  },
  getAll: () => {
    return mathOrder.map((id, index) => ({
      id,
      text: mathDSLCache.get(id),
      index,
    }))
  },
}
