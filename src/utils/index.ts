import type { PropertiesHyphen } from 'csstype'
import type { ReadTimeResults } from 'reading-time'

import fontawesome_css from '@fortawesome/fontawesome-free/css/all.min.css?inline'
import DOMPurify from 'isomorphic-dompurify'
import juice from 'juice'
import { Marked, marked } from 'marked'

import * as prettierPluginBabel from 'prettier/plugins/babel'
import * as prettierPluginEstree from 'prettier/plugins/estree'
import * as prettierPluginMarkdown from 'prettier/plugins/markdown'
import * as prettierPluginCss from 'prettier/plugins/postcss'
import { format } from 'prettier/standalone'
import { prefix } from '@/config/prefix'
import pagedjs from '@/lib/paged.min.js?raw'
import type { Block, ExtendedProperties, Inline, Theme } from '@/types'
import type { RendererAPI } from '@/types/renderer-types'
import { addSpacingToMarkdown } from '@/utils/autoSpace'
import admonition_css from './admonition/index.css?inline'
import chatMessage_css from './chatMessage/index.css?inline'
import markedAlert from './MDAlert'

import { MDKatex } from './MDKatex'

import { getOrRenderInfographicSvg, getOrRenderMermaidSvg } from './svgResolver'

export function addPrefix(str: string) {
  return `${prefix}__${str}`
}

export function customizeTheme(theme: Theme, options: {
  fontSize?: number
  color?: string
}) {
  const newTheme = JSON.parse(JSON.stringify(theme))
  const { fontSize, color } = options
  if (fontSize) {
    for (let i = 1; i <= 6; i++) {
      const v = newTheme.block[`h${i}`][`font-size`]
      newTheme.block[`h${i}`][`font-size`] = `${fontSize * Number.parseFloat(v)}px`
    }
  }
  if (color) {
    newTheme.base[`--md-primary-color`] = color
  }
  return newTheme as Theme
}

export function customCssWithTemplate(jsonString: Partial<Record<Block | Inline, PropertiesHyphen>>, color: string, theme: Theme) {
  const newTheme = customizeTheme(theme, { color })

  const mergeProperties = <T extends Block | Inline = Block>(target: Record<T, PropertiesHyphen>, source: Partial<Record<Block | Inline, PropertiesHyphen>>, keys: T[]) => {
    keys.forEach((key) => {
      if (source[key]) {
        target[key] = Object.assign(target[key] || {}, source[key])
      }
    })
  }

  const blockKeys: Block[] = [
    `container`,
    `h1`,
    `h2`,
    `h3`,
    `h4`,
    `h5`,
    `h6`,
    `code`,
    `code_pre`,
    `p`,
    `hr`,
    `blockquote`,
    `blockquote_note`,
    `blockquote_tip`,
    `blockquote_important`,
    `blockquote_warning`,
    `blockquote_caution`,
    `blockquote_p`,
    `blockquote_p_note`,
    `blockquote_p_tip`,
    `blockquote_p_important`,
    `blockquote_p_warning`,
    `blockquote_p_caution`,
    `blockquote_title`,
    `blockquote_title_note`,
    `blockquote_title_tip`,
    `blockquote_title_important`,
    `blockquote_title_warning`,
    `blockquote_title_caution`,
    `image`,
    `ul`,
    `ol`,
    `block_katex`,
  ]
  const inlineKeys: Inline[] = [`listitem`, `codespan`, `link`, `wx_link`, `strong`, `table`, `thead`, `td`, `footnote`, `figcaption`, `em`, `inline_katex`]

  mergeProperties(newTheme.block, jsonString, blockKeys)
  mergeProperties(newTheme.inline, jsonString, inlineKeys)
  return newTheme
}

/**
 * 将 CSS 字符串转换为 JSON 对象
 *
 * @param {string} css - CSS 字符串
 * @returns {object} - JSON 格式的 CSS
 */
export function css2json(css: string): Partial<Record<Block | Inline, PropertiesHyphen>> {
  // 去除所有 CSS 注释
  css = css.replace(/\/\*[\s\S]*?\*\//g, ``)

  const json: Partial<Record<Block | Inline, PropertiesHyphen>> = {}

  // 辅助函数：将声明数组转换为对象
  const toObject = (array: any[]) =>
    array.reduce<{ [k: string]: string }>((obj, item) => {
      const [property, ...value] = item.split(`:`).map((part: string) => part.trim())
      if (property)
        obj[property] = value.join(`:`)
      return obj
    }, {})

  while (css.includes(`{`) && css.includes(`}`)) {
    const lbracket = css.indexOf(`{`)
    const rbracket = css.indexOf(`}`)

    // 获取声明块并转换为对象
    const declarations = css.substring(lbracket + 1, rbracket)
      .split(`;`)
      .map(e => e.trim())
      .filter(Boolean)

    // 获取选择器并去除空格
    const selectors = css.substring(0, lbracket)
      .split(`,`)
      .map(selector => selector.trim()) as (Block | Inline)[]

    const declarationObj = toObject(declarations)

    // 将声明对象关联到相应的选择器
    selectors.forEach((selector) => {
      json[selector] = { ...(json[selector] || {}), ...declarationObj }
    })

    // 处理下一个声明块
    css = css.slice(rbracket + 1).trim()
  }

  return json
}

/**
 * 将样式对象转换为 CSS 字符串
 * @param {ExtendedProperties} style - 样式对象
 * @returns {string} - CSS 字符串
 */
export function getStyleString(style: ExtendedProperties): string {
  return Object.entries(style ?? {}).map(([key, value]) => `${key}: ${value}`).join(`; `)
}

/**
 * 格式化内容
 * @param {string} content - 要格式化的内容
 * @param {'markdown' | 'css'} [type] - 内容类型，决定使用的解析器，默认为 'markdown'
 * @returns {Promise<string>} - 格式化后的内容
 */
export async function formatDoc(content: string, type: `markdown` | `css` = `markdown`): Promise<string> {
  const plugins = {
    markdown: [prettierPluginMarkdown, prettierPluginBabel, prettierPluginEstree],
    css: [prettierPluginCss],
  }
  const addSpaceContent = await addSpacingToMarkdown(content)

  const parser = type in plugins ? type : `markdown`
  const md = await format(addSpaceContent, {
    parser,
    plugins: plugins[parser],
  })
  return md.replace(/\\([!()[\]_`*~=])/g, `$1`)
}

export function sanitizeTitle(title: string) {
  const MAX_FILENAME_LENGTH = 100

  // Windows 禁止字符，包含所有平台非法字符合集
  const INVALID_CHARS = /[\\/:*?"<>|]/g

  if (!INVALID_CHARS.test(title) && title.length <= MAX_FILENAME_LENGTH) {
    return title.trim() || `untitled`
  }

  const replaced = title.replace(INVALID_CHARS, `_`).trim()
  const safe = replaced.length > MAX_FILENAME_LENGTH
    ? replaced.slice(0, MAX_FILENAME_LENGTH)
    : replaced

  return safe || `untitled`
}

/**
 * 导出原始 Markdown 文档
 * @param {string} doc - 文档内容
 * @param {string} title - 文档标题
 */
export function downloadMD(doc: string, title: string = `untitled`) {
  const safeTitle = sanitizeTitle(title)
  downloadFile(doc, `${safeTitle}.md`, `text/markdown;charset=utf-8`)
}

/**
 * 设置元素样式，确保导出时的样式正确
 * @param {Element} element - 要设置样式的元素
 */
function setStyles(element: Element) {
  /**
   * 获取一个 DOM 元素的所有样式，
   * @param {DOM 元素} element DOM 元素
   * @param {排除的属性} excludes 如果某些属性对结果有不良影响，可以使用这个参数来排除
   * @returns 行内样式拼接结果
   */
  function getElementStyles(element: Element, excludes = [`width`, `height`, `inlineSize`, `webkitLogicalWidth`, `webkitLogicalHeight`]) {
    const styles = getComputedStyle(element, null)
    return Object.entries(styles)
      .filter(
        ([key]) => {
          // 将驼峰转换为短横线格式
          const kebabKey = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
          return styles.getPropertyValue(kebabKey) && !excludes.includes(key)
        },
      )
      .map(([key, value]) => {
        // 将驼峰转换为短横线格式
        const kebabKey = key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
        return `${kebabKey}:${value};`
      })
      .join(``)
  }

  switch (true) {
    case isPre(element):
    case isCode(element):
    case isSpan(element):
      element.setAttribute(`style`, getElementStyles(element))
  }
  if (element.children.length) {
    Array.from(element.children).forEach(child => setStyles(child))
  }

  // 判断是否是包裹代码块的 pre 元素
  function isPre(element: Element) {
    return (
      element.tagName === `PRE`
      && Array.from(element.classList).includes(`code__pre`)
    )
  }

  // 判断是否是包裹代码块的 code 元素
  function isCode(element: Element | null) {
    if (element == null) {
      return false
    }
    return element.tagName === `CODE`
  }

  // 判断是否是包裹代码字符的 span 元素
  function isSpan(element: Element) {
    return (
      element.tagName === `SPAN`
      && (isCode(element.parentElement)
        || isCode((element.parentElement!).parentElement))
    )
  }
}

/**
 * 处理HTML内容，应用样式和颜色变量
 * @param {string} primaryColor - 主色调
 * @returns {string} 处理后的HTML字符串
 */
function processHtmlContent(primaryColor: string): string {
  const element = document.querySelector(`#output`)!
  setStyles(element)

  return element.innerHTML
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/--md-primary-color:.+?;/g, ``)
}

/**
 * 导出 HTML 生成内容
 */
export function exportHTML(primaryColor: string, title: string = `untitled`) {
  const htmlStr = processHtmlContent(primaryColor)
  const fullHtml = `<html><head><meta charset="utf-8" /></head><body><div style="width: 750px; margin: auto;">${htmlStr}</div></body></html>`

  downloadFile(fullHtml, `${sanitizeTitle(title)}.html`, `text/html`)
}

export async function exportPureHTML(raw: string, title: string = `untitled`) {
  const safeTitle = sanitizeTitle(title)

  const marked = new Marked()
  marked.use(markedAlert({ withoutStyle: true }))
  marked.use(
    MDKatex({ nonStandard: true }, ``, ``),
  )
  const pureHtml = await marked.parse(raw)
  nextTick().then(() => {
    requestAnimationFrame(() => {
      getOrRenderMermaidSvg()
      getOrRenderInfographicSvg()
      downloadFile(pureHtml, `${safeTitle}.html`, `text/html`)
    })
  })
}

/**
 * 通用文件下载函数
 * @param content - 文件内容
 * @param filename - 文件名
 * @param mimeType - MIME 类型，默认为 text/plain
 */
export function downloadFile(content: string, filename: string, mimeType: string = `text/plain`) {
  const downLink = document.createElement(`a`)
  downLink.download = filename
  downLink.style.display = `none`

  // 检查是否是 base64 data URL
  if (content.startsWith(`data:`)) {
    downLink.href = content
  }
  else if (mimeType === `text/html`) {
    downLink.href = `data:text/html;charset=utf-8,${encodeURIComponent(content)}`
  }
  else {
    const blob = new Blob([content], { type: mimeType })
    downLink.href = URL.createObjectURL(blob)
  }

  document.body.appendChild(downLink)
  downLink.click()
  document.body.removeChild(downLink)

  // 如果是 blob URL，释放内存
  if (!content.startsWith(`data:`) && mimeType !== `text/html`) {
    URL.revokeObjectURL(downLink.href)
  }
}

/**
 * 根据数据生成 Markdown 表格
 *
 * @param {object} options - 选项
 * @param {object} options.data - 表格数据
 * @param {number} options.rows - 行数
 * @param {number} options.cols - 列数
 * @returns {string} 生成的 Markdown 表格
 */
export function createTable({ data, rows, cols }: { data: { [k: string]: string }, rows: number, cols: number }): string {
  let table = ``
  for (let i = 0; i < rows + 2; ++i) {
    table += `| `
    const currRow = []
    for (let j = 0; j < cols; ++j) {
      const rowIdx = i > 1 ? i - 1 : i
      currRow.push(i === 1 ? `---` : data[`k_${rowIdx}_${j}`] || `     `)
    }
    table += currRow.join(` | `)
    table += ` |\n`
  }

  return table
}

export function toBase64(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve((reader.result as string).split(`,`).pop()!)
    reader.onerror = error => reject(error)
  })
}

export function extractAllCSSVariables(cssText: string) {
  const blocks = cssText.split(`}`)
  let result = ``

  for (const block of blocks) {
    const parts = block.split(`{`)
    if (parts.length !== 2)
      continue

    const selector = parts[0].trim()
    const body = parts[1]

    const vars = body
      .split(`;`)
      .map(line => line.trim())
      .filter(line => line.startsWith(`--`))

    if (vars.length > 0) {
      result += `${selector} {\n`
      result += vars.map(v => `  ${v};`).join(`\n`)
      result += `\n}\n\n`
    }
  }

  return result
}

/**
 * 导出 PDF 文档
 * @param {string} content
 */
export function exportPDF(content: string) {
  const store = useStore()
  const htmlStr = content
  const hasChat = htmlStr.includes(`chat-container`)
  const chatVarCss = hasChat ? extractAllCSSVariables(chatMessage_css) : ``

  let safeTitle = ``

  if (store.currentPdfTitle) {
    safeTitle = sanitizeTitle(store.currentPdfTitle)
  }

  // 创建新窗口用于打印
  const printWindow = window.open(``, `_blank`)
  if (!printWindow) {
    console.error(`无法打开打印窗口`)
    return
  }

  const printMargin = store.printMargin ? store.printMargin : `0px`

  let topCenter = ``
  if (safeTitle) {
    topCenter = `
      @top-center {
        content: "${safeTitle}";
        font-size: 10px;
        color: #666;
        font-style: italic;
      }
    `
  }

  let topLeft = ``
  if (store.topLeft) {
    topLeft = `
      @top-left {
        content: "${store.topLeft}";
        font-size: 10px;
        color: #666;
        font-style: italic;
      }
    `
  }

  let pdfchapter = ``

  let topRight = ``
  if (store.topRight) {
    if (store.topRight === `h1` || store.topRight === `h2`) {
      pdfchapter = `
        ${store.topRight} {
          string-set: chapter content();
        }
      `
      topRight = `
        @top-right {
          content: string(chapter);
          font-size: 10px;
          color: #666;
          font-style: italic;
        }
      `
    }
    else {
      topRight = `
        @top-right {
          content: "${store.topRight}";
          font-size: 10px;
          color: #666;
          font-style: italic;
        }
      `
    }
  }

  let bottomLeft = ``
  if (store.bottomLeft) {
    bottomLeft = `
      @bottom-left {
        content: "${store.bottomLeft}";
        font-size: 10px;
        color: #999;
      }
    `
  }

  let pageAutoBreak = ``
  if (store.isPageBreak) {
    pageAutoBreak = `
        h1 {
          break-after: avoid;
          break-inside: avoid;
          break-before: page;
          page-break-after: avoid;
          page-break-inside: avoid;
          page-break-before: always;
        }
        h1:first-child {
          break-before: auto;
          page-break-before: auto;
        }
    `
  }

  let bottomRight = ``
  if (store.bottomRight) {
    bottomRight = `
      @bottom-right {
        content: ${store.bottomRight};
        font-size: 10px;
        color: #999;
      }
    `
  }

  // 写入HTML内容，包含自定义页眉页脚
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${safeTitle}</title>
      <style>
        ${pdfchapter}
        ${chatVarCss}
        pre::before {
            content: "\u200B";
        }
        .chat-container::before {
            content: "\u200B";
        }
        pre {
            overflow: visible !important;
            break-inside: auto;
            page-break-inside: auto;
        }
        pre,
        code {
            overflow: visible !important;
            white-space: pre-wrap !important;
            overflow-wrap: anywhere !important;
        }
        @page {
          size: A4;
          margin: ${printMargin};
          ${topLeft}
          ${topRight}
          ${topCenter}
          ${bottomLeft}
          ${bottomRight}
        }
        @page :blank {
          @top-left { content: none; }
          @top-center { content: none; }
          @top-right { content: none; }
          @bottom-left { content: none; }
          @bottom-center { content: none; }
          @bottom-right { content: none; }
        }          
        @media print {
          html, body {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
          }
          body { 
            margin: 0; 
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print, nav, footer, .buttons, .ads {
            display: none !important;
          }
          a[href]:not([href^="#"]):after {
            content: " (" attr(href) ")";
            font-size: 10pt;
          }
          img {
            max-width: 100%;
            page-break-inside: avoid;
          }
          table {
            page-break-inside: avoid;
          }
          tr, td, th {
            page-break-inside: avoid;
          }
          tfoot {
            display: table-footer-group;
          }
          thead {
            display: table-header-group;
          }
          ${pageAutoBreak}
          .page-break {
            break-before: page;
            page-break-before: always;
          }
          p {
            text-align-last: left;
          }
          .chat-container .message:not(:has(.avatar)) .message-content-left {
            padding-left: calc(var(--chat-avatar) + 6px);
          }
          .chat-container .message:not(:has(.avatar)) .message-content-right {
            padding-right: calc(var(--chat-avatar) + 6px);
          }
        }
      </style>
    </head>
    <body>
      <div style="width: 100%; max-width: 750px; margin: auto;">
        ${htmlStr}
      </div>
    </body>
    <script>
      ${pagedjs}
      document.addEventListener("DOMContentLoaded", async () => {
        const previewer = new PagedModule.Previewer()
        await previewer.preview()
        if(${store.isElectron}){
          if(window.electronAPI){
            await window.electronAPI.printToPdf("${store.posts[store.currentPostIndex].title}")
            window.close()
          }else{
            console.warn('⚠️ electronAPI 不存在，执行原生打印');
            window.onafterprint = () => window.close()
            window.print()
            setTimeout(() => {
              try { window.close() } catch (e) {}
            }, 50)
          }
        }else{
          window.onafterprint = () => window.close()
          window.print()
          setTimeout(() => {
            try { window.close() } catch (e) {}
          }, 50)
        }
      })
    </script>
    </html>
  `)

  printWindow.document.close()
}

export function exportPDFByTauri(content: string) {
  const store = useStore()
  const htmlStr = content
  const hasChat = htmlStr.includes(`chat-container`)
  const chatVarCss = hasChat ? extractAllCSSVariables(chatMessage_css) : ``

  let safeTitle = ``

  if (store.currentPdfTitle) {
    safeTitle = sanitizeTitle(store.currentPdfTitle)
  }

  const printMargin = store.printMargin ? store.printMargin : `0px`

  let topCenter = ``
  if (safeTitle) {
    topCenter = `
      @top-center {
        content: "${safeTitle}";
        font-size: 10px;
        color: #666;
        font-style: italic;
      }
    `
  }

  let topLeft = ``
  if (store.topLeft) {
    topLeft = `
      @top-left {
        content: "${store.topLeft}";
        font-size: 10px;
        color: #666;
        font-style: italic;
      }
    `
  }

  let pdfchapter = ``

  let topRight = ``
  if (store.topRight) {
    if (store.topRight === `h1` || store.topRight === `h2`) {
      pdfchapter = `
        ${store.topRight} {
          string-set: chapter content();
        }
      `
      topRight = `
        @top-right {
          content: string(chapter);
          font-size: 10px;
          color: #666;
          font-style: italic;
        }
      `
    }
    else {
      topRight = `
        @top-right {
          content: "${store.topRight}";
          font-size: 10px;
          color: #666;
          font-style: italic;
        }
      `
    }
  }

  let bottomLeft = ``
  if (store.bottomLeft) {
    bottomLeft = `
      @bottom-left {
        content: "${store.bottomLeft}";
        font-size: 10px;
        color: #999;
      }
    `
  }

  let pageAutoBreak = ``
  if (store.isPageBreak) {
    pageAutoBreak = `
        h1 {
          break-after: avoid;
          break-inside: avoid;
          break-before: page;
          page-break-after: avoid;
          page-break-inside: avoid;
          page-break-before: always;
        }
        h1:first-child {
          break-before: auto;
          page-break-before: auto;
        }
    `
  }

  let bottomRight = ``
  if (store.bottomRight) {
    bottomRight = `
      @bottom-right {
        content: ${store.bottomRight};
        font-size: 10px;
        color: #999;
      }
    `
  }

  // 写入HTML内容，包含自定义页眉页脚
  const printHtml = (`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${safeTitle}</title>
      <style>
        ${pdfchapter}
        ${chatVarCss}
        pre::before {
            content: "\u200B";
        }
        .chat-container::before {
            content: "\u200B";
        }
        pre {
            overflow: visible !important;
            break-inside: auto;
            page-break-inside: auto;
        }
        pre,
        code {
            overflow: visible !important;
            white-space: pre-wrap !important;
            overflow-wrap: anywhere !important;
        }
        @page {
          size: A4;
          margin: ${printMargin};
          ${topLeft}
          ${topRight}
          ${topCenter}
          ${bottomLeft}
          ${bottomRight}
        }
        @page :blank {
          @top-left { content: none; }
          @top-center { content: none; }
          @top-right { content: none; }
          @bottom-left { content: none; }
          @bottom-center { content: none; }
          @bottom-right { content: none; }
        }          
        @media print {
          html, body {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
          }
          body { 
            margin: 0; 
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print, nav, footer, .buttons, .ads {
            display: none !important;
          }
          a[href]:not([href^="#"]):after {
            content: " (" attr(href) ")";
            font-size: 10pt;
          }
          img {
            max-width: 100%;
            page-break-inside: avoid;
          }
          table {
            page-break-inside: avoid;
          }
          tr, td, th {
            page-break-inside: avoid;
          }
          tfoot {
            display: table-footer-group;
          }
          thead {
            display: table-header-group;
          }
          ${pageAutoBreak}
          .page-break {
            break-before: page;
            page-break-before: always;
          }
          p {
            text-align-last: left;
          }
          .chat-container .message:not(:has(.avatar)) .message-content-left {
            padding-left: calc(var(--chat-avatar) + 6px);
          }
          .chat-container .message:not(:has(.avatar)) .message-content-right {
            padding-right: calc(var(--chat-avatar) + 6px);
          }
        }
      </style>
    </head>
    <body>
      <div style="width: 100%; max-width: 750px; margin: auto;">
        ${htmlStr}
      </div>
    </body>
    <script>
      ${pagedjs}
      document.addEventListener("DOMContentLoaded", async () => {
        const previewer = new PagedModule.Previewer()
        await previewer.preview()
        window.onafterprint = () => window.close()
        window.print()
        setTimeout(() => {
          try { window.close() } catch (e) {}
        }, 50)
      })
    </script>
    </html>
  `);
  (window as any).__TAURI__.core.invoke(`print_html`, { html: printHtml })
}

export function checkImage(file: File) {
  // 先检查 MIME type
  const isImageType = /^image\/(?:png|jpeg|jpg|gif)$/i.test(file.type)

  // 检查文件名后缀
  const isValidSuffix = /\.(?:gif|jpe?g|png)$/i.test(file.name)
  if (!isImageType && !isValidSuffix) {
    return {
      ok: false,
      msg: `请上传 JPG/PNG/GIF 格式的图片`,
    }
  }

  // 检查文件大小
  const maxSizeMB = 10
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      ok: false,
      msg: `由于公众号限制，图片大小不能超过 ${maxSizeMB}M`,
    }
  }

  return { ok: true, msg: `` }
}

/**
 * 移除左边多余空格
 * @param {string} str
 * @returns string
 */
export function removeLeft(str: string) {
  const lines = str.split(`\n`)
  // 获取应该删除的空白符数量
  const minSpaceNum = lines
    .filter(item => item.trim())
    .map(item => (item.match(/(^\s+)?/)!)[0].length)
    .sort((a, b) => a - b)[0]
  // 删除空白符
  return lines.map(item => item.slice(minSpaceNum)).join(`\n`)
}

export function solveWeChatImage(doc: Document, mode: string) {
  const images = doc.getElementsByTagName(`img`)
  if (mode === `txt`) {
    Array.from(images).forEach((image) => {
      const src = image.getAttribute(`src`) || ``
      if (src.includes(`wsrv.nl`) && src.includes(`url=`) && src.includes(`qpic`)) {
        try {
          const urlParam = new URL(src).searchParams.get(`url`)
          if (urlParam) {
            const decoded = decodeURIComponent(urlParam)
            image.setAttribute(`src`, decoded)
          }
        }
        catch (err) {
          console.warn(`无法解析图片 URL:`, src, err)
        }
      }
    })
  }
}

const ALL_CSS = `
${admonition_css}
${chatMessage_css}
`

function mergeCss(html: string, needFontawesomeClass: boolean): string {
  let css = ALL_CSS
  if (needFontawesomeClass) {
    css += fontawesome_css
  }

  return juice(`<style>${css}</style>\n${html}`, {
    inlinePseudoElements: true,
    preserveImportant: true,
    preserveFontFaces: false,
  })
}

function mergeCssWhenToHtmlFile(html: string, needFontawesomeClass: boolean): string {
  if (needFontawesomeClass) {
    html = juice(`<style>${fontawesome_css}</style>\n${html}`, {
      inlinePseudoElements: true,
      preserveImportant: true,
      preserveFontFaces: false,
    })
  }
  return html
}

function modifyHtmlStructure(htmlString: string): string {
  const tempDiv = document.createElement(`div`)
  tempDiv.innerHTML = htmlString

  // 移动 `li > ul` 和 `li > ol` 到 `li` 后面
  tempDiv.querySelectorAll(`li > ul, li > ol`).forEach((originalItem) => {
    originalItem.parentElement!.insertAdjacentElement(`afterend`, originalItem)
  })

  return tempDiv.innerHTML
}

function createEmptyNode(): HTMLElement {
  const node = document.createElement(`p`)
  node.style.fontSize = `0`
  node.style.lineHeight = `0`
  node.style.margin = `0`
  node.innerHTML = `&nbsp;`
  return node
}

function checkNeedFontawesomeClass(doc: HTMLElement) {
  const svgs = doc.querySelectorAll(`svg.svg-inline--fa`)
  if (!svgs.length) {
    return false
  }
  return [...svgs].some(el => el.classList.length > 2)
}

export function processClipboardContent(primaryColor: string) {
  const clipboardDiv = document.getElementById(`output`)!

  // 先合并 CSS 和修改 HTML 结构
  clipboardDiv.innerHTML = modifyHtmlStructure(mergeCss(clipboardDiv.innerHTML, checkNeedFontawesomeClass(clipboardDiv)))

  // 处理样式和颜色变量
  clipboardDiv.innerHTML = clipboardDiv.innerHTML
    .replace(/([^-])top:(.*?)em/g, `$1transform: translateY($2em)`)
    .replace(/hsl\(var\(--foreground\)\)/g, `#3f3f3f`)
    .replace(/var\(--blockquote-background\)/g, `#f7f7f7`)
    .replace(/var\(--md-primary-color\)/g, primaryColor)
    .replace(/--md-primary-color:.+?;/g, ``)
    .replace(
      /<span class="nodeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
      `<span class="nodeLabel"$1>$2</span>`,
    )
    .replace(
      /<span class="edgeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
      `<span class="edgeLabel"$1>$2</span>`,
    )

  // 添加空白节点用于兼容 SVG 复制
  const beforeNode = createEmptyNode()
  const afterNode = createEmptyNode()
  clipboardDiv.insertBefore(beforeNode, clipboardDiv.firstChild)
  clipboardDiv.appendChild(afterNode)

  // 兼容 Mermaid
  const nodes = clipboardDiv.querySelectorAll(`.nodeLabel`)
  nodes.forEach((node) => {
    const parent = node.parentElement!
    const xmlns = parent.getAttribute(`xmlns`)!
    const style = parent.getAttribute(`style`)!
    const section = document.createElement(`section`)
    section.setAttribute(`xmlns`, xmlns)
    section.setAttribute(`style`, style)
    section.innerHTML = parent.innerHTML

    const grand = parent.parentElement!
    // 清空父元素
    grand.innerHTML = ``
    grand.appendChild(section)
  })

  // fix: mermaid 部分文本颜色被 stroke 覆盖
  clipboardDiv.innerHTML = clipboardDiv.innerHTML
    .replace(
      /<tspan([^>]*)>/g,
      `<tspan$1 style="fill: #333333 !important; color: #333333 !important; stroke: none !important;">`,
    )
}

export function processClipboardToHtmlFile(_primaryColor: string) {
  const clipboardDiv = document.getElementById(`output`)!

  const hljsStyle = document.getElementById(`hljs`)
  const hljsCssText = hljsStyle ? hljsStyle.innerHTML : ``

  clipboardDiv.innerHTML = modifyHtmlStructure(mergeCssWhenToHtmlFile(clipboardDiv.innerHTML, checkNeedFontawesomeClass(clipboardDiv)))

  clipboardDiv.innerHTML = clipboardDiv.innerHTML
    .replace(/([^-])top:(.*?)em/g, `$1transform: translateY($2em)`)
    .replace(
      /<span class="nodeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
      `<span class="nodeLabel"$1>$2</span>`,
    )
    .replace(
      /<span class="edgeLabel"([^>]*)><p[^>]*>(.*?)<\/p><\/span>/g,
      `<span class="edgeLabel"$1>$2</span>`,
    )

  const beforeNode = createEmptyNode()
  const afterNode = createEmptyNode()
  clipboardDiv.insertBefore(beforeNode, clipboardDiv.firstChild)
  clipboardDiv.appendChild(afterNode)

  const nodes = clipboardDiv.querySelectorAll(`.nodeLabel`)
  nodes.forEach((node) => {
    const parent = node.parentElement!
    const xmlns = parent.getAttribute(`xmlns`)!
    const style = parent.getAttribute(`style`)!
    const section = document.createElement(`section`)
    section.setAttribute(`xmlns`, xmlns)
    section.setAttribute(`style`, style)
    section.innerHTML = parent.innerHTML

    const grand = parent.parentElement!
    grand.innerHTML = ``
    grand.appendChild(section)
  })

  clipboardDiv.innerHTML = clipboardDiv.innerHTML
    .replace(
      /<tspan([^>]*)>/g,
      `<tspan$1 style="fill: #333333 !important; color: #333333 !important; stroke: none !important;">`,
    )
  const hasAdmonition = clipboardDiv.querySelector(`.admonition`)
  const hasChat = clipboardDiv.querySelector(`.chat-container`)

  return [
    hasAdmonition && admonition_css,
    hasChat && chatMessage_css,
    hljsCssText,
  ].filter(Boolean).join(``)
}

export function renderMarkdown(raw: string, renderer: RendererAPI) {
  // 解析 front-matter 和正文
  const { markdownContent, readingTime }
    = renderer.parseFrontMatterAndContent(raw)

  // marked -> html
  let html = marked.parse(markdownContent) as string

  nextTick().then(() => {
    requestAnimationFrame(() => {
      getOrRenderMermaidSvg()
      getOrRenderInfographicSvg()
    })
  })

  // XSS 处理
  html = DOMPurify.sanitize(html, { ADD_TAGS: [`mp-common-profile`], ADD_ATTR: [`target`, `rel`] })

  return { html, readingTime }
}

export function postProcessHtml(baseHtml: string, reading: ReadTimeResults, renderer: RendererAPI): string {
  // 阅读时间及字数统计
  let html = baseHtml
  html = renderer.buildReadingTime(reading) + html
  // 去除第一行的 margin-top
  html = html.replace(/(style=".*?)"/, `$1;margin-top: 0"`)
  // 引用脚注
  html += renderer.buildFootnotes()
  // 附加的一些 style
  html += renderer.buildAddition()
  if (renderer.getOpts().isMacCodeBlock) {
    html += `
        <style>
          .hljs.code__pre > .mac-sign {
            display: flex;
          }
        </style>
      `
  }
  html += `
    <style>
      .code__pre {
        padding: 0 !important;
      }

      .hljs.code__pre code {
        display: -webkit-box;
        padding: 0.5em 1em 1em;
        overflow-x: auto;
        text-indent: 0;
      }
      h2 strong {
        color: inherit !important;
      }
    </style>
  `
  // 包裹 HTML
  return renderer.createContainer(html)
}

export function modifyHtmlContent(content: string, renderer: RendererAPI): string {
  const {
    markdownContent,
    readingTime: readingTimeResult,
  } = renderer.parseFrontMatterAndContent(content)

  let html = marked.parse(markdownContent) as string
  html = DOMPurify.sanitize(html, {
    ADD_TAGS: [`mp-common-profile`],
    ADD_ATTR: [`target`, `rel`],
  })
  return postProcessHtml(html, readingTimeResult, renderer)
}

export function delwsrv(src: string): string {
  if (src.includes(`wsrv.nl`) && src.includes(`url=`)) {
    try {
      const urlParam = new URL(src).searchParams.get(`url`)
      if (urlParam) {
        const decoded = decodeURIComponent(urlParam)
        return decoded
      }
    }
    catch (err) {
      console.warn(`无法解析图片 URL:`, src, err)
    }
  }
  return src
}

export async function withMinDuration<T>(
  task: Promise<T>,
  minMs = 300,
): Promise<T> {
  const start = Date.now()
  const result = await task
  const elapsed = Date.now() - start

  if (elapsed < minMs) {
    await new Promise(resolve => setTimeout(resolve, minMs - elapsed))
  }

  return result
}

export function splitPath(p: string, sep: string) {
  const isDir = p.endsWith(sep)

  const normalized = p.replace(new RegExp(`${sep}+$`), ``)
  const parts: string[] = normalized.split(sep).filter(Boolean)

  if (isDir) {
    return {
      type: `dir`,
      parentFolder: parts,
      filename: null,
    }
  }

  return {
    type: `file`,
    parentFolder: parts.slice(0, -1),
    filename: parts.at(-1) ?? null,
  }
}

/**
 * 转义 HTML 特殊字符
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, `&amp;`) // 转义 &
    .replace(/</g, `&lt;`) // 转义 <
    .replace(/>/g, `&gt;`) // 转义 >
    .replace(/"/g, `&quot;`) // 转义 "
    .replace(/'/g, `&#39;`) // 转义 '
}

/**
 * 首字母大写
 */
export function ucfirst(str: string) {
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase()
}

export function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
