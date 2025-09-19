import type { EmitFn } from 'vue'
import { processClipboardContent } from '@/utils'

const { copy: copyContent } = useClipboard({
  legacy: true,
})

function convertHighlightToInlineStyles(container: HTMLElement) {
  const elements = container.querySelectorAll(`[class*="hljs"]`)

  elements.forEach((el) => {
    const computedStyle = window.getComputedStyle(el)

    const propsToKeep = [
      `color`,
      `background`,
      `font-weight`,
      `font-style`,
      `text-decoration`,
      `font-size`,
      `font-family`,
      `line-height`,
      `white-space`,
      `overflow`,
      `display`,
      `padding`,
      `margin`,
      `border-radius`,
    ]

    const inlineStyle = propsToKeep
      .map((prop) => {
        const val = computedStyle.getPropertyValue(prop)
        return val ? `${prop}: ${val};` : ``
      })
      .join(` `)

    // 合并现有 style 属性（如有）
    el.setAttribute(`style`, `${el.getAttribute(`style`) || ``}; ${inlineStyle}`)
  })
}

function inlineAdmonitionForWechat(container: HTMLElement) {
  const admonitions = container.querySelectorAll<HTMLElement>(`.admonition`)
  admonitions.forEach((adm) => {
    const title = adm.querySelector<HTMLElement>(`.admonition-title`)
    if (!title)
      return

    const computed = window.getComputedStyle(title)
    // 这里应该给这个 title 的 margin-top 用 compute 赋值
    const propsToKeep = [
      `color`,
      `background`,
      `font-weight`,
      `font-style`,
      `text-decoration`,
      `font-size`,
      `font-family`,
      `line-height`,
      `white-space`,
      `overflow`,
      `display`,
      `padding`,
      `margin`,
      `border-radius`,
    ]

    const inlineStyle = propsToKeep
      .map((prop) => {
        const val = computed.getPropertyValue(prop)
        return val ? `${prop}: ${val};` : ``
      })
      .join(` `)
    title.setAttribute(`style`, `${title.getAttribute(`style`) || ``}; ${inlineStyle}`)

    // 获取 --icon 值
    const iconValue = computed.getPropertyValue(`--icon`)
    if (!iconValue || !iconValue.startsWith(`url`))
      return

    let iconData = iconValue.trim()
    iconData = iconData.replace(/^url\((['"]?)(.*)\1\)$/, `$2`)

    if (!iconData.startsWith(`data:image/svg+xml`))
      return

    const svgText = decodeURIComponent(
      iconData.replace(/^data:image\/svg\+xml(?:;charset=[^,]+|;utf8)?,/, ``),
    )

    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgText, `image/svg+xml`)
    const svgEl = svgDoc.documentElement

    // 查找已有的 juice span（第一个 span）
    let iconSpan = title.querySelector(`span`)
    if (iconSpan) {
      // 获取原背景色
      const bgColor = iconSpan.style.backgroundColor || ``

      // 清空内容，保留 style
      const style = iconSpan.getAttribute(`style`) || ``
      iconSpan.innerHTML = ``
      iconSpan.setAttribute(`style`, style)
      iconSpan.style.removeProperty(`background-color`)

      iconSpan.style.removeProperty(`-webkit-mask-image`)
      iconSpan.style.removeProperty(`-webkit-mask-repeat`)
      iconSpan.style.removeProperty(`-webkit-mask-size`)

      iconSpan.appendChild(svgEl)

      // 把背景色应用到 SVG 的 path 上
      if (bgColor && !adm.classList.contains(`admonition-hint`)) {
        svgEl.querySelectorAll(`path`).forEach((path) => {
          path.setAttribute(`fill`, bgColor)
        })
      }
      else {
        // 如果是 hint
        svgEl.innerHTML = `<title></title><path d='M24,13.1a8,8,0,1,0-13.6,5.7A5.07,5.07,0,0,1,12,22.4V23h8v-.53a5.23,5.23,0,0,1,1.63-3.69A8,8,0,0,0,24,13.1Z' fill='none' stroke='${bgColor}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/><line x1='12' y1='26' x2='20' y2='26' fill='none' stroke='${bgColor}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/><line x1='13' y1='27' x2='19' y2='27' fill='none' stroke='${bgColor}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/><line x1='16' y1='28' x2='16' y2='27' fill='none' stroke='${bgColor}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/><polyline points='16 12.42 15 15.25 17 15.25 16 18.17' fill='none' stroke='${bgColor}' stroke-linecap='round' stroke-linejoin='round'/>`
      }
    }
    else {
      // 没有 span 时新增
      iconSpan = document.createElement(`span`)
      iconSpan.appendChild(svgEl)
      title.prepend(iconSpan)
    }
    title.removeAttribute(`class`)
    title.setAttribute(`admonition`, `title`)
    adm.removeAttribute(`class`)
    adm.setAttribute(`admonition`, `container`)
  })
}

function inlineAdmonitionForZhihu(container: Document) {
  const admonitions = container.querySelectorAll<HTMLElement>(`[admonition="container"]`)
  admonitions.forEach((adm) => {
    const titleText = adm.querySelector(`[admonition="title"] span:last-child`)?.textContent?.trim() || ``
    const contentText = adm.querySelector(`p:not([admonition="title"])`)?.textContent?.trim() || ``
    const p = container.createElement(`p`)
    const strong = container.createElement(`strong`)
    strong.textContent = titleText
    p.appendChild(strong)
    p.append(`：${contentText}`)
    adm.replaceWith(p)
  })
}

function cleanEmptyParas(container: Document | HTMLElement) {
  container.querySelectorAll(`p`).forEach((p) => {
    if (
      p.innerHTML.trim() === `&nbsp;`
      && (p.style.fontSize === `0px` || p.style.lineHeight === `0`)
    ) {
      p.remove()
    }
  })
}

function cleanSection(container: Document) {
  const section = container.querySelector(`body > section`)
  if (section) {
    while (section.firstChild) {
      container.body.insertBefore(section.firstChild, section)
    }
    section.remove()
  }
}

// 复制到微信公众号
let changeCiteStatusWhenCopy = false
export default async function copy(mode: string, emit: EmitFn): Promise<void | string> {
  // 如果是 Markdown 源码，直接复制并返回
  emit(`startCopy`)
  const store = useStore()
  const {
    isDark,
    isCiteStatus,
    output,
    primaryColor,
    editor,
  } = storeToRefs(store)

  const {
    toggleDark,
    editorRefresh,
    citeStatusChanged,
  } = store
  if (mode === `md`) {
    const mdContent = editor.value?.getValue() || ``
    await copyContent(mdContent)
    toast.success(`已复制 Markdown 源码到剪贴板。`)
    return
  }

  // 以下处理非 Markdown 的复制流程
  emit(`startCopy`)
  return new Promise((resolve) => {
    setTimeout(() => {
      // 如果是深色模式，复制之前需要先切换到白天模式
      const isBeforeDark = isDark.value
      if (isBeforeDark) {
        toggleDark()
      }

      nextTick(async () => {
        processClipboardContent(primaryColor.value)
        const clipboardDiv = document.getElementById(`output`)!
        clipboardDiv.focus()
        window.getSelection()!.removeAllRanges()
        // 新增：把 hljs 相关的 class 样式变成 inline 样式
        convertHighlightToInlineStyles(clipboardDiv)
        // 新增：修正Admonition的图标。内联样式已经通过 utils/index.ts mergeCss 中的 juice 进行了处理
        inlineAdmonitionForWechat(clipboardDiv)

        if (mode === `txt` || mode === `zhihu` || mode === `html` || mode === `outhtml`) {
          const rawHtml = clipboardDiv.innerHTML
          const parser = new DOMParser()
          const doc = parser.parseFromString(rawHtml, `text/html`)

          const cleanedHtml = doc.body.innerHTML

          const tempDoc = new DOMParser().parseFromString(cleanedHtml, `text/html`)
          let cleanedHtmlFinal = ``

          if (mode === `txt` || mode === `html` || mode === `outhtml`) {
            if (mode === `txt`) {
              tempDoc.querySelectorAll(`a`).forEach((a) => {
                const href = a.getAttribute(`href`)
                if (href && href.startsWith(`#`)) {
                  a.setAttribute(`data-anchor-id`, href.slice(1))
                  a.removeAttribute(`href`)
                }
                else if (href && href.startsWith(`http`) && !href.startsWith(`https://mp.weixin.qq.com`)) {
                  const span = tempDoc.createElement(`span`)
                  span.className = a.className
                  span.style.cssText = a.style.cssText

                  Array.from(a.attributes).forEach((attr) => {
                    if (attr.name.startsWith(`data-`)) {
                      span.setAttribute(attr.name, attr.value)
                    }
                  })
                  while (a.firstChild) {
                    span.appendChild(a.firstChild)
                  }
                  a.replaceWith(span)
                }
              })
            }

            cleanedHtmlFinal = tempDoc.body.innerHTML
            if (mode === `html`) {
              // 仅编辑器部分的 html 代码，你可以拷贝到你其他 html 代码中
              // 需要恢复正常的链接！
              if (isCiteStatus.value) {
                citeStatusChanged()
                changeCiteStatusWhenCopy = true
                await copy(mode, emit)
                return
              }
            }
            if (mode === `outhtml`) {
              // 给 html 加上宽度否则视觉上太宽。移动端不加
              // 这里运行了两次，导致citeStatusChanged()生成了一次，然后又调回去生成了一次
              if (isCiteStatus.value) {
                citeStatusChanged()
                changeCiteStatusWhenCopy = true
                const exportHtmlFile = await copy(mode, emit)
                toast.success(`已导出 HTML`)
                resolve(exportHtmlFile)
              }
              if (!isCiteStatus.value) {
                const head = tempDoc.head
                const metaCharset = tempDoc.createElement(`meta`)
                metaCharset.setAttribute(`charset`, `UTF-8`)
                head.appendChild(metaCharset)
                const metaViewport = tempDoc.createElement(`meta`)
                metaViewport.setAttribute(`name`, `viewport`)
                metaViewport.setAttribute(`content`, `width=device-width, initial-scale=1.0`)
                head.appendChild(metaViewport)
                const style = tempDoc.createElement(`style`)
                style.textContent = `
                  body {
                    margin: 0 auto;
                    padding: 1rem;
                  }
                  @media (min-width: 768px) {
                    body {
                    max-width: 700px;
                    margin: 0 auto;
                    }
                  }
                  `
                head.appendChild(style)
                cleanedHtmlFinal = tempDoc.documentElement.outerHTML
                resolve(cleanedHtmlFinal)
              }
            }
          }
          else if (mode === `zhihu`) {
            if (isCiteStatus.value) {
              citeStatusChanged()
              changeCiteStatusWhenCopy = true
              await copy(mode, emit)
              return
            }
            tempDoc.querySelectorAll(`a`).forEach((a) => {
              const href = a.getAttribute(`href`)
              if (href && href.startsWith(`#`)) {
                // 处理锚点
                a.setAttribute(`data-anchor-id`, href.slice(1))
                a.removeAttribute(`href`)
              }
              if (a.getAttribute(`data-linkcard`) !== null) {
                // 处理知乎链接卡片
                transformAnchorsToZhihuCards(a, tempDoc)
              }
            })

            // 处理admonition适配知乎
            inlineAdmonitionForZhihu(tempDoc)
            // 清理多余的空行
            cleanEmptyParas(tempDoc)
            // 清理顶层<section>
            cleanSection(tempDoc)

            tempDoc.querySelectorAll(`sup`).forEach((sup) => {
              const a = sup.querySelector(`a[id][data-anchor-id]`)
              if (a) {
                const id = a.getAttribute(`id`) || ``
                const anchorId = a.getAttribute(`data-anchor-id`) || ``
                const newSup = tempDoc.createElement(`sup`)
                newSup.id = id
                newSup.className = `Reference isEditable`
                newSup.setAttribute(`data-ref-key`, anchorId)
                const link = document.querySelector(`a#${anchorId}`)
                if (link && link.previousElementSibling && link.previousElementSibling.tagName.toLowerCase() === `span`) {
                  const span = link.previousElementSibling
                  const text = span.innerHTML
                  newSup.setAttribute(`data-text`, text)
                }

                newSup.setAttribute(`data-url`, ``)
                newSup.setAttribute(`data-draft-node`, `inline`)
                newSup.setAttribute(`data-draft-type`, `reference`)
                // newSup.setAttribute('style', 'counter-reset: zh-ref 1;');

                const outerSpan = tempDoc.createElement(`span`)
                outerSpan.setAttribute(`data-offset-key`, `eds3i-1-0`)

                const innerSpan = tempDoc.createElement(`span`)
                innerSpan.setAttribute(`data-text`, `true`)
                innerSpan.textContent = ` `

                outerSpan.appendChild(innerSpan)
                newSup.appendChild(outerSpan)

                sup.replaceWith(newSup)
              }
            })
            // 删除标准注释区，因为知乎有自己的注释区
            const h4 = tempDoc.querySelector(`h4[data-heading="true"]`)
            if (h4) {
              const p = h4.nextElementSibling
              h4.remove()
              if (p && p.tagName.toLowerCase() === `p`) {
                p.remove()
              }
            }
            // 第三个正则处理知乎卡片之间多余的<br>
            cleanedHtmlFinal = tempDoc.body.innerHTML.replace(/(<li\b[^>]*>\s*)\d+\.\s*/gi, `$1`).replace(/(<li\b[^>]*>\s*)•\s*/gi, `$1`).replace(/(<span[^>]+RichText-LinkCardContainer[^>]*>.*?<\/span>)(?:\s*<br\s*\/?>\s*(?=<span[^>]+RichText-LinkCardContainer[^>]*>.*?<\/span>))+/gis, `$1`)
          }
          const plainText = doc.body.textContent || ``

          // start copy
          if (mode === `txt`) {
            if (navigator.clipboard && navigator.clipboard.write) {
              navigator.clipboard.write([
                new ClipboardItem({
                  'text/html': new Blob([cleanedHtmlFinal], { type: `text/html` }),
                  'text/plain': new Blob([plainText], { type: `text/plain` }),
                }),
              ]).then(() => {
              }).catch((err) => {
                fallbackCopyWithExecCommand()
                console.error(err)
              })
            }
            else {
              fallbackCopyWithExecCommand()
            }
            // 输出提示
            toast.success(`已复制渲染后的内容到剪贴板，可直接到公众号后台粘贴。`)
          }
          else if (mode === `zhihu`) {
            if (navigator.clipboard && navigator.clipboard.write) {
              navigator.clipboard.write([
                new ClipboardItem({
                  'text/html': new Blob([cleanedHtmlFinal], { type: `text/html` }),
                  'text/plain': new Blob([plainText], { type: `text/plain` }),
                }),
              ]).then(() => {
              }).catch((err) => {
                fallbackCopyWithExecCommand()
                console.error(err)
              })
            }
            else {
              fallbackCopyWithExecCommand()
            }
            toast.success(`已复制渲染后的内容到剪贴板，可直接到知乎文章中粘贴。`)
          }
          else if (mode === `html`) {
            await copyContent(cleanedHtmlFinal)
            toast.success(`已复制 HTML 源码，请进行下一步操作。`)
          }

          function fallbackCopyWithExecCommand() {
            const range = document.createRange()
            range.setStartBefore(clipboardDiv.firstChild!)
            range.setEndAfter(clipboardDiv.lastChild!)
            window.getSelection()!.addRange(range)
            document.execCommand(`copy`)
            window.getSelection()!.removeAllRanges()
          }
        }

        clipboardDiv.innerHTML = output.value

        if (isBeforeDark) {
          nextTick(() => toggleDark())
        }

        window.dispatchEvent(
          new CustomEvent(`copyToMp`, {
            detail: {
              content: output.value,
            },
          }),
        )
        if (changeCiteStatusWhenCopy) {
          citeStatusChanged()
          changeCiteStatusWhenCopy = false
        }
        editorRefresh()
        emit(`endCopy`)
      })
    }, 350)
  })
}

function transformAnchorsToZhihuCards(a: HTMLAnchorElement | HTMLElement, container: Document | HTMLElement) {
  const doc = container instanceof Document ? container : container.ownerDocument!
  const href = a.getAttribute(`href`) || ``
  if (!href.startsWith(`http`))
    return

  const displayText = a.textContent?.trim() || href
  const encodedHref = encodeURIComponent(href)

  //   const cardDiv = doc.createElement('div');
  const cardDiv = doc.createElement(`span`)
  cardDiv.className = `RichText-LinkCardContainer`

  const cardA = doc.createElement(`a`)
  cardA.setAttribute(`target`, `_blank`)
  cardA.setAttribute(`href`, `https://link.zhihu.com/?target=${encodedHref}`)
  cardA.setAttribute(`data-draft-node`, `block`)
  cardA.setAttribute(`data-draft-type`, `link-card`)
  cardA.setAttribute(`data-text`, displayText)
  cardA.className = `LinkCard new css-nctz4i`

  const spanContents = doc.createElement(`span`)
  spanContents.className = `LinkCard-contents`

  const spanTitle = doc.createElement(`span`)
  spanTitle.className = `LinkCard-title two-line`
  spanTitle.textContent = displayText

  const spanDesc = doc.createElement(`span`)
  spanDesc.className = `LinkCard-desc`

  const spanInlineFlex = doc.createElement(`span`)
  spanInlineFlex.style.cssText = `display: inline-flex; align-items: center;`
  spanInlineFlex.innerHTML = `&ZeroWidthSpace;`
    + `<svg width="14" height="14" viewBox="0 0 24 24" class="Zi Zi--InsertLink" fill="currentColor">
       <path fill-rule="evenodd" clip-rule="evenodd" d="M5.327 18.883a3.005 3.005 0 0 1 0-4.25l2.608-2.607a.75.75 0 1 0-1.06-1.06l-2.608 2.607a4.505 4.505 0 0 0 6.37 6.37l2.608-2.607a.75.75 0 0 0-1.06-1.06l-2.608 2.607a3.005 3.005 0 0 1-4.25 0Zm5.428-11.799a.75.75 0 0 0 1.06 1.06L14.48 5.48a3.005 3.005 0 0 1 4.25 4.25l-2.665 2.665a.75.75 0 0 0 1.061 1.06l2.665-2.664a4.505 4.505 0 0 0-6.371-6.372l-2.665 2.665Zm5.323 2.117a.75.75 0 1 0-1.06-1.06l-7.072 7.07a.75.75 0 0 0 1.061 1.06l7.071-7.07Z"></path>
     </svg>`

  spanDesc.appendChild(spanInlineFlex)
  spanDesc.appendChild(doc.createTextNode(href))

  spanContents.appendChild(spanTitle)
  spanContents.appendChild(spanDesc)

  cardA.appendChild(spanContents)
  cardDiv.appendChild(cardA)

  a.replaceWith(cardDiv)
}
