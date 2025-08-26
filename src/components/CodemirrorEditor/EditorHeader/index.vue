<script setup lang="ts">
import {
  ChevronDownIcon,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
} from 'lucide-vue-next'
import { altKey, altSign, ctrlKey, ctrlSign, shiftSign } from '@/config'
import { useStore } from '@/stores'
import { addPrefix, processClipboardContent } from '@/utils'

const emit = defineEmits([`startCopy`, `endCopy`])

const store = useStore()

const {
  isDark,
  isCiteStatus,
  isCountStatus,
  output,
  primaryColor,
  isOpenPostSlider,
  editor,
} = storeToRefs(store)

const {
  toggleDark,
  editorRefresh,
  citeStatusChanged,
  countStatusChanged,
  formatContent,
} = store

// 工具函数，添加格式
function addFormat(cmd: string) {
  (editor.value as any).options.extraKeys[cmd](editor.value)
}

const formatItems = [
  {
    label: `加粗`,
    kbd: [ctrlSign, `B`],
    cmd: `${ctrlKey}-B`,
  },
  {
    label: `斜体`,
    kbd: [ctrlSign, `I`],
    cmd: `${ctrlKey}-I`,
  },
  {
    label: `颜色`,
    kbd: [ctrlSign, `J`],
    cmd: `${ctrlKey}-J`,
  },
  {
    label: `删除线`,
    kbd: [ctrlSign, `D`],
    cmd: `${ctrlKey}-D`,
  },
  {
    label: `下划线`,
    kbd: [ctrlSign, `U`],
    cmd: `${ctrlKey}-U`,
  },
  {
    label: `超链接`,
    kbd: [ctrlSign, `K`],
    cmd: `${ctrlKey}-K`,
  },
  {
    label: `知乎卡片链接`,
    kbd: [ctrlSign, altSign, `K`],
    cmd: `${ctrlKey}-${altKey}-K`,
  },
  {
    label: `Admonition`,
    kbd: [ctrlSign, altSign, `A`],
    cmd: `${ctrlKey}-${altKey}-A`,
  },
  {
    label: `行内代码`,
    kbd: [ctrlSign, `E`],
    cmd: `${ctrlKey}-E`,
  },
  {
    label: `标题`,
    kbd: [ctrlSign, `H`],
    cmd: `${ctrlKey}-H`,
  },
  {
    label: `无序列表`,
    kbd: [ctrlSign, altSign, `U`],
    cmd: `${ctrlKey}-${altKey}-U`,
  },
  {
    label: `有序列表`,
    kbd: [ctrlSign, altSign, `O`],
    cmd: `${ctrlKey}-${altKey}-O`,
  },
  {
    label: `格式化`,
    kbd: [altSign, shiftSign, `F`],
    cmd: `formatContent`,
  },
] as const

const copyMode = useStorage(addPrefix(`copyMode`), `txt`)

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
      iconSpan.appendChild(svgEl)

      // 把背景色应用到 SVG 的 path 上
      if (bgColor) {
        svgEl.querySelectorAll(`path`).forEach((path) => {
          path.setAttribute(`fill`, bgColor) // 或者 stroke
        })
      }
    }
    else {
      // 没有 span 时新增
      iconSpan = document.createElement(`span`)
      iconSpan.appendChild(svgEl)
      title.prepend(iconSpan)
    }
  })
}

function inlineAdmonitionForZhihu(container: Document) {
  const admonitions = container.querySelectorAll<HTMLElement>(`.admonition`)
  admonitions.forEach((adm) => {
    const titleText = adm.querySelector(`.admonition-title span:last-child`)?.textContent?.trim() || ``
    const contentText = adm.querySelector(`p:not(.admonition-title)`)?.textContent?.trim() || ``
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
async function copy() {
  // 如果是 Markdown 源码，直接复制并返回
  if (copyMode.value === `md`) {
    const mdContent = editor.value?.getValue() || ``
    await copyContent(mdContent)
    toast.success(`已复制 Markdown 源码到剪贴板。`)
    return
  }

  // 以下处理非 Markdown 的复制流程
  emit(`startCopy`)

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
      const temp = clipboardDiv.innerHTML

      if (copyMode.value === `txt` || copyMode.value === `zhihu`) {
        const rawHtml = clipboardDiv.innerHTML
        const parser = new DOMParser()
        const doc = parser.parseFromString(rawHtml, `text/html`)

        const cleanedHtml = doc.body.innerHTML

        const tempDoc = new DOMParser().parseFromString(cleanedHtml, `text/html`)
        let cleanedHtmlFinal = ``

        if (copyMode.value === `txt`) {
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
          cleanedHtmlFinal = tempDoc.body.innerHTML
        }
        else if (copyMode.value === `zhihu`) {
          if (store.isCiteStatus) {
            store.citeStatusChanged()
            changeCiteStatusWhenCopy = true
            await copy()
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

      if (copyMode.value === `html`) {
        await copyContent(temp)
      }

      // 输出提示
      toast.success(
        copyMode.value === `html`
          ? `已复制 HTML 源码，请进行下一步操作。`
          : `已复制渲染后的内容到剪贴板，可直接到公众号后台粘贴。`,
      )
      window.dispatchEvent(
        new CustomEvent(`copyToMp`, {
          detail: {
            content: output.value,
          },
        }),
      )
      if (changeCiteStatusWhenCopy) {
        store.citeStatusChanged()
        changeCiteStatusWhenCopy = false
      }
      editorRefresh()
      emit(`endCopy`)
    })
  }, 350)
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
</script>

<template>
  <header
    class="header-container h-15 flex flex-wrap items-center justify-between px-5 dark:bg-[#191c20]"
  >
    <!-- 左侧菜单：移动端隐藏 -->
    <div class="space-x-2 hidden sm:flex">
      <Menubar class="menubar">
        <FileDropdown />

        <MenubarMenu>
          <MenubarTrigger> 格式</MenubarTrigger>
          <MenubarContent class="w-60" align="start">
            <MenubarCheckboxItem
              v-for="{ label, kbd, cmd } in formatItems"
              :key="label"
              @click="
                cmd === 'formatContent' ? formatContent() : addFormat(cmd)
              "
            >
              {{ label }}
              <MenubarShortcut>
                <kbd
                  v-for="item in kbd"
                  :key="item"
                  class="mx-1 bg-gray-2 dark:bg-stone-9"
                >
                  {{ item }}
                </kbd>
              </MenubarShortcut>
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarCheckboxItem
              :checked="isCiteStatus"
              @click="citeStatusChanged()"
            >
              微信外链转底部引用
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarCheckboxItem
              :checked="isCountStatus"
              @click="countStatusChanged()"
            >
              统计字数和阅读时间
            </MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
        <EditDropdown />
        <StyleDropdown />
        <HelpDropdown />
      </Menubar>
    </div>

    <!-- 右侧操作区：移动端保留核心按钮 -->
    <div class="space-x-2 flex flex-wrap">
      <!-- 展开/收起左侧内容栏 -->
      <Button
        variant="outline"
        size="icon"
        @click="isOpenPostSlider = !isOpenPostSlider"
      >
        <PanelLeftOpen v-show="!isOpenPostSlider" class="size-4" />
        <PanelLeftClose v-show="isOpenPostSlider" class="size-4" />
      </Button>

      <!-- 暗色切换 -->
      <Button variant="outline" size="icon" @click="toggleDark()">
        <Moon v-show="isDark" class="size-4" />
        <Sun v-show="!isDark" class="size-4" />
      </Button>

      <!-- 复制按钮组 -->
      <div
        class="space-x-1 bg-background text-background-foreground mx-2 flex items-center border rounded-md"
      >
        <Button variant="ghost" class="shadow-none" @click="copy">
          复制
        </Button>
        <Separator orientation="vertical" class="h-5" />
        <DropdownMenu v-model="copyMode">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" class="px-2 shadow-none">
              <ChevronDownIcon class="text-secondary-foreground h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" :align-offset="-5" class="w-[200px]">
            <DropdownMenuRadioGroup v-model="copyMode">
              <DropdownMenuRadioItem value="txt">
                公众号格式
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="zhihu">
                知乎格式
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="html">
                HTML 格式
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="md">
                MD 格式
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- 文章信息（移动端隐藏） -->
      <PostInfo class="hidden sm:inline-flex" />

      <!-- 设置按钮 -->
      <Button
        variant="outline"
        size="icon"
        @click="store.isOpenRightSlider = !store.isOpenRightSlider"
      >
        <Settings class="size-4" />
      </Button>
    </div>
  </header>
</template>

<style lang="less" scoped>
.menubar {
  user-select: none;
}

kbd {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #a8a8a8;
  padding: 1px 4px;
  border-radius: 2px;
}
</style>
