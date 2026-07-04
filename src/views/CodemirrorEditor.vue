<script setup lang="ts">
import type { Editor } from 'codemirror'
import type { Component, ComponentPublicInstance } from 'vue'
import imageCompression from 'browser-image-compression'
import { fromTextArea } from 'codemirror'
import { ChartCandlestick, Code, Eye, MessagesSquare, Pen, Sigma, Table, TriangleAlert, Workflow } from 'lucide-vue-next'
import { onMounted, onUnmounted, watch } from 'vue'
import {
  AIPolishButton,
  AIPolishPopover,
  useAIPolish,
} from '@/components/AIPolish'
import FolderSourcePanel from '@/components/CodemirrorEditor/FolderSourcePanel.vue'
import SaveAsFile from '@/components/CodemirrorEditor/SaveAsFile.vue'
import MathEditorDialog from '@/components/MathEditorDialog.vue'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { SearchTab } from '@/components/ui/search-tab'
import getImgHostOptions from '@/composables/imageHostOptions'
import { altKey, altSign, ctrlKey, ctrlSign } from '@/config'
import { infographicDSLStore, mathDSLStore, mermaidDSLStore } from '@/lib/utils'
import { useFolderSourceStore } from '@/stores/folderSource'
import { checkImage, formatFileSize, toBase64 } from '@/utils'
import { createExtraKeys, insertSnippet } from '@/utils/editor'
import fetch from '@/utils/fetch'
import { fileMigrate, fileUpload } from '@/utils/file'
import { svgToTransparentPng } from '@/utils/svg2png'

const store = useStore()
const folderSourceStore = useFolderSourceStore()
const displayStore = useDisplayStore()

const { isDark, output, editor, viewMode } = storeToRefs(store)
const { editorRefresh } = store

const { toggleShowUploadImgDialog, toggleShowUploadImgToAnotherHostDialog } = displayStore

const backLight = ref(false)
const isCoping = ref(false)
const triggerFocus = ref(false)

function startCopy() {
  backLight.value = true
  isCoping.value = true
}

// 拷贝结束
function endCopy() {
  backLight.value = false
  setTimeout(() => {
    isCoping.value = false
  }, 800)
}

const showEditor = ref(true)

// 切换编辑/预览视图（仅限移动端）
function toggleView() {
  showEditor.value = !showEditor.value
}

const {
  AIPolishBtnRef,
  AIPolishPopoverRef,
  selectedText,
  position,
  isDragging,
  startDrag,
  initPolishEvent,
  recalcPos,
} = useAIPolish()

const previewRef = useTemplateRef<HTMLDivElement>(`previewRef`)

const timeout = ref<NodeJS.Timeout>()

// 使浏览区与编辑区滚动条建立同步联系
function leftAndRightScroll() {
  const scrollCB = (text: string) => {
    // AIPolishBtnRef.value?.close()

    let source: HTMLElement
    let target: HTMLElement

    clearTimeout(timeout.value)
    if (text === `preview`) {
      source = previewRef.value!
      target = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!

      editor.value!.off(`scroll`, editorScrollCB)
      timeout.value = setTimeout(() => {
        editor.value!.on(`scroll`, editorScrollCB)
      }, 300)
    }
    else {
      source = document.querySelector<HTMLElement>(`.CodeMirror-scroll`)!
      target = previewRef.value!

      target.removeEventListener(`scroll`, previewScrollCB, false)
      timeout.value = setTimeout(() => {
        target.addEventListener(`scroll`, previewScrollCB, false)
      }, 300)
    }

    const percentage
      = source.scrollTop / (source.scrollHeight - source.offsetHeight)
    const height = percentage * (target.scrollHeight - target.offsetHeight)

    target.scrollTo(0, height)
  }

  function editorScrollCB() {
    scrollCB(`editor`)
  }

  function previewScrollCB() {
    scrollCB(`preview`)
  }

  previewRef.value!.addEventListener(`scroll`, previewScrollCB, false)
  editor.value!.on(`scroll`, editorScrollCB)
}

const migrateImg: MigrateContent = {
  file: null,
  order: -1,
  oldUrl: ``,
  type: 'image',
}

async function onPreviewIMGMenu(imgEl: HTMLImageElement) {
  const imgUrl = imgEl.getAttribute(`src`)
  if (!imgUrl) {
    return
  }
  try {
    const migrateImgBlob: Blob = await fetch.get(imgUrl!, {
      responseType: `blob`,
    })
    displayStore.migrateType = `image`
    displayStore.migrateSize = formatFileSize(migrateImgBlob.size)
    toggleShowUploadImgToAnotherHostDialog()
    if (migrateImgBlob) {
      const ext = migrateImgBlob.type.split(`/`)[1]
      const random = crypto.randomUUID()
      const filename = `${random}.${ext}`

      migrateImg.file = new File([migrateImgBlob], filename, {
        type: migrateImgBlob.type,
      })
      migrateImg.oldUrl = imgUrl
      migrateImg.type = 'image'
    }
    else {
      toast.error(`获取图片失败，请手动操作`)
    }
  }
  catch (err) {
    console.error(err)
    toast.error(`获取图片失败，请手动操作`)
  }
}

async function onPreviewSVGMigrateIMGMenu(svgEl: SVGSVGElement, type: MigrateType) {
  const figureEl = svgEl.closest(`figure`)
  if (!figureEl || !figureEl.id)
    return

  let dsl = ``
  let order = -1

  if (type === 'infographic') {
    [order, dsl] = infographicDSLStore.getById(figureEl.id)
  }
  else if (type === 'mermaid') {
    [order, dsl] = mermaidDSLStore.getById(figureEl.id)
  }

  try {
    const migrateImgBlob = await svgToTransparentPng(svgEl)
    displayStore.migrateType = `svg`
    displayStore.migrateSize = formatFileSize(migrateImgBlob.size)
    toggleShowUploadImgToAnotherHostDialog()
    if (migrateImgBlob) {
      const ext = migrateImgBlob.type.split(`/`)[1]
      const random = crypto.randomUUID()
      const filename = `${random}.${ext}`

      migrateImg.file = new File([migrateImgBlob], filename, {
        type: migrateImgBlob.type,
      })
      migrateImg.oldUrl = dsl
      migrateImg.order = order
      migrateImg.type = type
    }
    else {
      toast.error(`获取图片失败，请手动操作`)
    }
  }
  catch (err) {
    console.error(err)
    toast.error(`获取图片失败，请手动操作`)
  }
}

const showMathDialog = ref(false)
const mathLatex = ref<LatexContent>({ initialDSL: '', modifyDSL: '', latexStyle: 'block', id: '', index: -1 })

async function onPreviewMathModifyMenu(mathEl: SVGSVGElement, type: string) {
  if (type !== 'math')
    return

  const latexStyle: LatexStyle = mathEl.classList.contains('math-span') ? 'inline' : 'block'
  const [index, latex] = mathDSLStore.getById(mathEl.id, latexStyle)
  mathLatex.value = {
    initialDSL: latex ?? '',
    modifyDSL: '',
    latexStyle,
    id: mathEl.id,
    index,
  }
  showMathDialog.value = true
}

async function onPreviewContextMenu(e: MouseEvent) {
  const svgElement = (e.target as HTMLElement).closest(`svg`)
  const imgEl = (e.target as HTMLElement).closest(`img`)

  if (!svgElement && !imgEl)
    return

  if (svgElement) {
    const id = svgElement.id

    if (id.startsWith('mermaid')) {
      e.preventDefault()
      onPreviewSVGMigrateIMGMenu(svgElement, 'mermaid')
    }

    if (id.startsWith('infographic')) {
      e.preventDefault()
      onPreviewSVGMigrateIMGMenu(svgElement, 'infographic')
    }

    if (id.startsWith('math')) {
      e.preventDefault()
      onPreviewMathModifyMenu(svgElement, 'math')
    }
  }

  if (imgEl) {
    e.preventDefault()
    onPreviewIMGMenu(imgEl)
  }
}

onMounted(() => {
  setTimeout(() => {
    leftAndRightScroll()
  }, 300)
  const el = previewRef.value
  if (!el)
    return
  el.addEventListener(`click`, onPreviewContextMenu)
})

onUnmounted(() => {
  const el = previewRef.value
  if (!el)
    return
  el.removeEventListener(`click`, onPreviewContextMenu)
})

const searchTabRef
  = useTemplateRef<InstanceType<typeof SearchTab>>(`searchTabRef`)

function openSearchWithSelection(cm: Editor) {
  const selected = cm.getSelection().trim()
  if (!searchTabRef.value)
    return

  if (selected) {
    // 自动带入选中文本
    searchTabRef.value.setSearchWord(selected)
  }
  else {
    // 仅打开面板
    searchTabRef.value.showSearchTab = true
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === `Escape` && searchTabRef.value?.showSearchTab) {
    searchTabRef.value.showSearchTab = false
    e.preventDefault()
    editor.value?.focus()
  }
  if (e.key === `Escape` && showMathDialog.value === true) {
    e.preventDefault()
    e.stopPropagation()
  }

  if (e.key === `Escape` && (e.metaKey || e.ctrlKey) && showMathDialog.value === true) {
    e.preventDefault()
    e.stopPropagation()
    showMathDialog.value = false
  }
}

onMounted(() => {
  document.addEventListener(`keydown`, handleGlobalKeydown)
})

function beforeUpload(file: File) {
  // validate image
  const checkResult = checkImage(file)
  if (!checkResult.ok) {
    toast.error(checkResult.msg)
    return false
  }

  // check image host
  const imgHost = localStorage.getItem(`imgHost`) || `github`
  localStorage.setItem(`imgHost`, imgHost)

  const config = localStorage.getItem(`${imgHost}Config`)
  const isValidHost = imgHost === `default` || config
  if (!isValidHost) {
    const imgHostLabel = getImgHostOptions().find(item => item.value === imgHost)?.label
    toast.error(`请先配置 ${imgHostLabel} 图床参数`)
    return false
  }

  return true
}

function beforeMigrate(file: File) {
  const checkResult = checkImage(file)
  if (!checkResult.ok) {
    toast.error(checkResult.msg)
    return false
  }

  const imgMigrateHost = localStorage.getItem(`imgMigrateHost`) || `github`
  localStorage.setItem(`imgMigrateHost`, imgMigrateHost)

  const config = localStorage.getItem(`${imgMigrateHost}Config`)
  const isValidHost = imgMigrateHost === `default` || config
  if (!isValidHost) {
    const imgHostLabel = getImgHostOptions().find(item => item.value === imgMigrateHost)?.label
    toast.error(`请先配置 ${imgHostLabel} 图床参数`)
    return false
  }

  return true
}

// 图片上传结束
function uploaded(imageUrl: string) {
  if (!imageUrl) {
    toast.error(`上传图片未知异常`)
    return
  }
  setTimeout(() => {
    toggleShowUploadImgDialog(false)
  }, 1000)
  // 上传成功，获取光标
  const cursor = editor.value!.getCursor()
  const markdownImage = `![](${imageUrl})`
  // 将 Markdown 形式的 URL 插入编辑框光标所在位置
  toRaw(store.editor!).replaceSelection(`\n${markdownImage}\n`, cursor as any)
  toast.success(`图片上传成功`)
}

// 图片迁移结束
function migrated(newUrl: string, oldUrl: string, type: string, order: number) {
  if (!newUrl) {
    toast.error(`上传图片未知异常`)
    return
  }
  setTimeout(() => {
    toggleShowUploadImgToAnotherHostDialog(false)
  }, 1000)

  const cm = editor.value!

  if (type === 'infographic' || type === 'mermaid') {
    const oldContent = cm!.getValue()
    if (order === -1) {
      toast.error('SVG 转图片出现问题！')
      return
    }

    const infographicRegex
      = /^```(infographic)([^\r\n]*)\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm

    const mermaidRegex
      = /^```(mermaid)([^\r\n]*)\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm

    const matches = [...oldContent.matchAll(type === 'infographic' ? infographicRegex : mermaidRegex)]

    const match = matches[order]

    const fullBlock = match[0]

    const headerLine = match[2].trim()
    const code = match[3]

    const parts = headerLine.split(/\s+/)

    const size = parts.length >= 1 ? parts[0] : null
    const caption = parts.length >= 2 ? parts.slice(1).join(` `) : null

    if (code.trim() === oldUrl.trim()) {
      const start = match.index!

      const sizeStr = size ? `=${size}` : ``
      const captionStr = caption || ``
      const replacement = `![${captionStr}](${newUrl} ${sizeStr})`

      const from = cm.posFromIndex(start)
      const to = cm.posFromIndex(start + fullBlock.length)

      cm.replaceRange(replacement, from, to)
      toast.success(`${type} 转图片成功`)
    }
    else {
      toast.error('SVG 转图片出现问题！')
    }
  }
  else if (type === 'image') {
    const indices: number[] = []
    let startIndex = 0
    while (true) {
      const oldContent = cm!.getValue()
      const index = oldContent.indexOf(oldUrl, startIndex)
      if (index === -1)
        break
      indices.push(index)
      startIndex = index + newUrl.length

      const from = cm.posFromIndex(index)
      const to = cm.posFromIndex(index + oldUrl.length)

      cm.replaceRange(newUrl, from, to)
    }

    toast.success(`${indices.length} 张图片迁移成功`)
  }
}

const isImgLoading = ref(false)

async function compressImage(file: File) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  }
  if (file.type === 'image/gif') {
    toast.warning('压缩对 gif 无效')
    return file
  }
  const compressedFile = await imageCompression(file, options)
  return compressedFile
}

const isUploadWithDefaultImageHostConfirmDialog = ref(false)
const pendingFile = ref<File | null>(null)
const pendingCb = ref<((url: any) => void) | undefined>()
const pendingApplyUrl = ref<boolean | undefined>(true)

async function uploadImage(
  file: File,
  cb?: { (url: any, data: string): void, (arg0: unknown): void } | undefined,
  applyUrl?: boolean,
) {
  const imgHost = localStorage.getItem(`imgHost`)
  if (imgHost === `default`) {
    pendingFile.value = file
    pendingCb.value = cb
    pendingApplyUrl.value = applyUrl
    isUploadWithDefaultImageHostConfirmDialog.value = true
  }
  else {
    await uploadImageReal(file, cb, applyUrl)
  }
}

async function migrateImage(
  cb?: { (url: any, data: string): void, (arg0: unknown): void } | undefined,
  applyUrl?: boolean,
) {
  const imgHost = localStorage.getItem(`imgHost`)
  if (!migrateImg.file) {
    return
  }
  if (beforeMigrate(migrateImg.file)) {
    if (imgHost === `default`) {
      pendingFile.value = migrateImg.file
      pendingCb.value = cb
      pendingApplyUrl.value = applyUrl
      isUploadWithDefaultImageHostConfirmDialog.value = true
    }
    else {
      await migrateImageReal(migrateImg.file, migrateImg.oldUrl, migrateImg.type, migrateImg.order, cb, applyUrl)
    }
  }
}

async function confirmUploadWithDefaultHost() {
  if (pendingFile.value) {
    await uploadImageReal(pendingFile.value, pendingCb.value, pendingApplyUrl.value)
  }
  isUploadWithDefaultImageHostConfirmDialog.value = false
  pendingFile.value = null
  pendingCb.value = undefined
}

async function uploadImageReal(
  file?: File,
  cb?: { (url: any, data: string): void, (arg0: unknown): void } | undefined,
  applyUrl?: boolean,
) {
  try {
    if (!file)
      return
    isImgLoading.value = true

    // compress image if useCompression is true
    const useCompression = localStorage.getItem(`useCompression`) === `true`
    if (useCompression) {
      file = await compressImage(file)
    }

    const base64Content = await toBase64(file)
    const url = await fileUpload(base64Content, file)
    if (cb) {
      cb(url, base64Content)
    }
    else {
      uploaded(url)
    }
    if (applyUrl) {
      return uploaded(url)
    }
  }
  catch (err) {
    toast.error((err as any).message)
    if (cb) {
      cb('', '')
    }
  }
  finally {
    isImgLoading.value = false
    pendingFile.value = null
    pendingCb.value = undefined
    isUploadWithDefaultImageHostConfirmDialog.value = false
  }
}

async function migrateImageReal(
  file?: File,
  oldUrl?: string,
  type?: MigrateType,
  order?: number,
  cb?: { (url: any, data: string): void, (arg0: unknown): void } | undefined,
  applyUrl?: boolean,
) {
  try {
    if (!file)
      return
    isImgLoading.value = true

    const useMigrateCompression = localStorage.getItem(`useMigrateCompression`) === `true`
    if (useMigrateCompression) {
      file = await compressImage(file)
    }

    const base64Content = await toBase64(file)
    const url = await fileMigrate(base64Content, file)
    if (cb) {
      cb(url, base64Content)
    }
    else {
      migrated(url, oldUrl!, type!, order!)
    }
    if (applyUrl) {
      return migrated(url, oldUrl!, type!, order!)
    }
  }
  catch (err) {
    toast.error((err as any).message)
    if (cb) {
      cb('', '')
    }
  }
  finally {
    isImgLoading.value = false
    pendingFile.value = null
    pendingCb.value = undefined
    isUploadWithDefaultImageHostConfirmDialog.value = false
  }
}

function cancelUpload() {
  pendingFile.value = null
  pendingCb.value = undefined
  isUploadWithDefaultImageHostConfirmDialog.value = false
}

// 从文件列表中查找一个 md 文件并解析
async function getMd({ list }: { list: { path: string, file: File }[] }) {
  return new Promise<{ str: string, file: File, path: string }>((resolve) => {
    const { path, file } = list.find(item => item.path.match(/\.md$/))!
    const reader = new FileReader()
    reader.readAsText(file!, `UTF-8`)
    reader.onload = (evt) => {
      resolve({
        str: evt.target!.result as string,
        file,
        path,
      })
    }
  })
}

// 转换文件系统句柄中的文件为文件列表
async function showFileStructure(root: any) {
  const result = []
  let cwd = ``
  try {
    const dirs = [root]
    for (const dir of dirs) {
      cwd += `${dir.name}/`
      for await (const [, handle] of dir) {
        if (handle.kind === `file`) {
          result.push({
            path: cwd + handle.name,
            file: await handle.getFile(),
          })
        }
        else {
          result.push({
            path: `${cwd + handle.name}/`,
          })
          dirs.push(handle)
        }
      }
    }
  }
  catch (err) {
    console.error(err)
  }
  return result
}

// 上传 md 中的图片
async function uploadMdImg({
  md,
  list,
}: {
  md: { str: string, path: string, file: File }
  list: { path: string, file: File }[]
}) {
  // 获取所有相对地址的图片
  const mdImgList = [...(md.str.matchAll(/!\[(.*?)\]\((.*?)\)/g) || [])].filter(item => item)
  const root = md.path.match(/.+?\//)![0]
  const resList = await Promise.all<{ matchStr: string, url: string }>(
    mdImgList.map((item) => {
      return new Promise((resolve) => {
        let [, , matchStr] = item
        matchStr = matchStr.replace(/^.\//, ``) // 处理 ./img/ 为 img/ 统一相对路径风格
        const { file }
          = list.find(f => f.path === `${root}${matchStr}`) || {}

        beforeUpload(file!) && uploadImage(file!, url => resolve({ matchStr, url }))
      })
    }),
  )
  resList.forEach((item) => {
    md.str = md.str
      .replace(`](./${item.matchStr})`, `](${item.url})`)
      .replace(`](${item.matchStr})`, `](${item.url})`)
  })
  editor.value!.setValue(md.str)
}

const codeMirrorWrapper = useTemplateRef<ComponentPublicInstance<HTMLDivElement>>(`codeMirrorWrapper`)

// 转换 markdown 中的本地图片为线上图片
// todo 处理事件覆盖
function mdLocalToRemote() {
  const dom = codeMirrorWrapper.value!

  dom.ondragover = evt => evt.preventDefault()
  dom.ondrop = async (evt) => {
    evt.preventDefault()
    if (evt.dataTransfer == null) {
      return
    }
    const items = [...evt.dataTransfer.items]
    if (!Array.isArray(items)) {
      return
    }

    for (const item of items.filter(item => item.kind === `file`)) {
      (item as any)
        .getAsFileSystemHandle()
        .then(async (handle: { kind: string, getFile: () => any }) => {
          if (handle.kind === `directory`) {
            const list = (await showFileStructure(handle)) as {
              path: string
              file: File
            }[]
            const md = await getMd({ list })
            uploadMdImg({ md, list })
          }
          else {
            const file = await handle.getFile()
            beforeUpload(file) && uploadImage(file)
          }
        })
    }
  }
}

const changeTimer = ref<NodeJS.Timeout>()

const editorRef = useTemplateRef<HTMLTextAreaElement>(`editorRef`)
const progressValue = ref(0)
function tableToMarkdown(text: string): string {
  const rows = text.split(`\n`).map(row => row.split(`\t`))
  let markdown = ``

  // 标记第一列是否有表头
  const hasFirstColHeader = rows[0][0]?.trim() !== ``

  rows.forEach((cells, rowIndex) => {
    const line = cells.map((cell, colIndex) => {
      const trimmed = cell.trim()

      if (trimmed !== ``) {
        return trimmed
      }
      else {
        if (colIndex === 0 && hasFirstColHeader && rowIndex > 0) {
          return `^`
        }
        return ``
      }
    }).join(`|`)

    markdown += `|${line}|\n`

    if (rowIndex === 0) {
      const sep = cells.map(() => `---`).join(`|`)
      markdown += `|${sep}|\n`
    }
  })

  return markdown
}

async function modifyMath(type: MigrateType) {
  const cleanNewDSL = mathLatex.value.modifyDSL.trim()
  const cleanOldDSL = mathLatex.value.initialDSL.trim()
  const order = mathLatex.value.index
  const cm = editor.value!

  if (!cleanOldDSL || (type !== 'math') || (mathLatex.value.index === -1) || !cm) {
    toast.error('公式修改出现问题')
    return
  }

  if (cleanNewDSL === cleanOldDSL) {
    toast.info('公式没有变动')
    return
  }

  const oldContent = cm.getValue()

  const inlineLatexRegex = /(\${1,2})(?!\$)((?:\\.|[^\\\r\n])*?(?:\\.|[^\\\r\n$]))\1(?=[\s?!.,:？！。，：]|$)/g

  const blockLatexRegex = /^\s{0,3}(\${1,2})[ \t]*\r?\n([\s\S]+?)\r?\n\s{0,3}\1[ \t]*(?:\r?\n|$)/gm

  const matches = [...oldContent.matchAll(mathLatex.value.latexStyle === 'inline' ? inlineLatexRegex : blockLatexRegex)]

  const match = matches[order]

  const fullBlock = match[0]
  const code = match[2].trim()

  if (code.trim() === cleanOldDSL) {
    const contentStartInBlock = fullBlock.indexOf(code)

    const start = match.index!
    const from = cm.posFromIndex(start + contentStartInBlock)
    const to = cm.posFromIndex(start + contentStartInBlock + code.length)

    cm.replaceRange(cleanNewDSL, from, to)
    toast.success(`公式修改成功`)
  }
}

async function insertMath() {
  if (!editor.value)
    return
  if (mathLatex.value.initialDSL) {
    await modifyMath('math')
  }
  else {
    insertSnippet(editor.value as CodeMirror.Editor, {
      template: `${mathLatex.value.modifyDSL}⟦cursor⟧`,
    })
  }
}

const showSlashMenu = ref(false)

const slashMenuPosition = reactive({
  left: 0,
  top: 0,
})

const slashIndex = ref(0)
const menuRef = ref<HTMLElement | null>(null)

interface SlashItem {
  label: string
  kbd?: string[]
  icon?: Component
  cmd?: string
  action?: () => void
}

function openBlankMathlive() {
  mathLatex.value.initialDSL = ''
  showMathDialog.value = true
}

const slashItems: SlashItem[] = [
  {
    label: `公式`,
    icon: Sigma,
    kbd: [ctrlSign, altSign, `L`],
    action: () => {
      openBlankMathlive()
    },
  },
  {
    label: `表格`,
    icon: Table,
    action: () => {
      if (!editor.value)
        return

      insertSnippet(editor.value as CodeMirror.Editor, {
        template:
`| 成员 | 性别 | 年龄 |⟦cursor⟧
| --- | --- | --- |
| 张三 | 男 | 28 |
| 李四 | 男 | 33 |
`,
      })
    },
  },
  {
    label: `代码`,
    icon: Code,
    action: () => {
      if (!editor.value)
        return
      insertSnippet(editor.value as CodeMirror.Editor, {
        template:
`\`\`\`js
⟦selection⟧⟦cursor⟧
\`\`\``,
        defaultSelection: `console.log("Hello, You!");⟦cursor⟧`,
      })
    },
  },
  {
    label: `Mermaid`,
    icon: Workflow,
    action: () => {
      if (!editor.value)
        return
      insertSnippet(editor.value as CodeMirror.Editor, {
        template:
`\`\`\`mermaid 70% 横向流程图
graph LR⟦cursor⟧
  A[GraphCommand] --> B[update]
  A --> C[goto]
  A --> D[send]
  
  B --> B1[更新状态]
  C --> C1[流程控制]
  D --> D1[消息传递]
\`\`\``,
      })
    },
  },
  {
    label: `Infographic`,
    icon: ChartCandlestick,
    action: () => {
      if (!editor.value)
        return

      insertSnippet(editor.value as CodeMirror.Editor, {
        template:
`\`\`\`infographic 70% 客户增长引擎
infographic list-row-horizontal-icon-arrow⟦cursor⟧
data
  title 客户增长引擎
  desc 多渠道触达与复购提升
  items
    - label 线索获取
      value 18.6
      desc 渠道投放与内容获客
      icon =:: {fa-solid fa-rocket} ::=
    - label 转化提效
      value 12.4
      desc 线索评分与自动跟进
      icon =:: {fa-solid fa-list-check} ::=
    - label 复购提升
      value 9.8
      desc 会员体系与权益运营
      icon =:: {fa-solid fa-arrows-spin} ::=
    - label 口碑传播
      value 6.2
      desc 社群激励与推荐裂变
      icon =:: {fa-solid fa-user-group} ::=
\`\`\``,
      })
    },
  },
  {
    label: `GFM Alerts`,
    icon: TriangleAlert,
    kbd: [ctrlSign, altSign, `A`],
    cmd: `${ctrlKey}-${altKey}-A`,
  },

  {
    label: `Chat`,
    icon: MessagesSquare,
    kbd: [ctrlSign, altSign, `C`],
    cmd: `${ctrlKey}-${altKey}-C`,
  },
]

function slashAction(item: SlashItem) {
  if (item.cmd) {
    (editor.value as any).options.extraKeys[item.cmd](editor.value)
    return
  }

  if (item.action) {
    item.action()
  }
  showSlashMenu.value = false
}

function createFormTextArea(dom: HTMLTextAreaElement) {
  const textArea = fromTextArea(dom, {
    mode: `text/x-markdown`,
    theme: isDark.value ? `darcula` : `xq-light`,
    lineNumbers: false,
    lineWrapping: true,
    styleActiveLine: true,
    autoCloseBrackets: true,
    extraKeys: {
      ...createExtraKeys(openSearchWithSelection),

      Tab(cm) {
        cm.replaceSelection('    ', 'end')
      },
    },
    tabSize: 4,
    indentUnit: 4,
    indentWithTabs: false,
    undoDepth: 200,
  })

  textArea.on(`keydown`, (_editor, e) => {
    if (e.key === `Escape` && showSlashMenu.value === true) {
      showSlashMenu.value = false
    }

    if (e.key === `ArrowDown` && showSlashMenu.value === true) {
      e.preventDefault()
      slashIndex.value = (slashIndex.value + 1) % slashItems.length
    }

    if (e.key === `ArrowUp` && showSlashMenu.value === true) {
      e.preventDefault()
      slashIndex.value = (slashIndex.value - 1 + slashItems.length) % slashItems.length
    }

    if (e.key === `Enter` && showSlashMenu.value) {
      e.preventDefault()
      slashAction(slashItems[slashIndex.value])
      showSlashMenu.value = false
    }

    if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === `KeyL` && !showSlashMenu.value) {
      e.preventDefault()
      openBlankMathlive()
    }
  })

  textArea.on(`change`, (editor) => {
    clearTimeout(changeTimer.value)
    changeTimer.value = setTimeout(() => {
      editorRefresh()

      const currentPost = store.posts[store.currentPostIndex]
      const content = editor.getValue()
      if (content === currentPost.content) {
        return
      }

      currentPost.updateDatetime = new Date()
      currentPost.content = content
    }, 300)
  })

  // textArea.on(`drop`, async (_editor, event) => {
  // 拖动图片上传的处理逻辑
  // })

  textArea.on(`focus`, async (_editor, _event) => {
    triggerFocus.value = true
  })

  textArea.on(`blur`, async (_editor, _event) => {
    setTimeout(() => {
      const active = document.activeElement
      if (!menuRef.value || !menuRef.value.contains(active)) {
        showSlashMenu.value = false
      }
    }, 0)
  })

  textArea.on(`beforeChange`, async (editor, change) => {
    let text = change.text?.join(``)
    if (!text)
      return

    if (showSlashMenu.value && text !== `/`) {
      showSlashMenu.value = false
    }

    if (text === `/`) {
      requestAnimationFrame(async () => {
        const cursor = editor.getCursor()
        const slashTriggerCursor = {
          line: cursor.line,
          ch: cursor.ch - 1,
        }

        const line = editor.getLine(cursor.line)

        const beforeText = line.slice(0, cursor.ch)

        const shouldOpen
          = beforeText.trim() === `/`

        if (!shouldOpen) {
          return
        }

        const coords = editor.cursorCoords(cursor, `page`)

        showSlashMenu.value = true

        await nextTick()

        const menuHeight = menuRef.value?.offsetHeight ?? 160
        const viewportHeight = window.innerHeight
        const spaceBelow = viewportHeight - coords.bottom
        const shouldOpenUp = spaceBelow < menuHeight
        slashMenuPosition.left = coords.left
        slashMenuPosition.top = shouldOpenUp ? coords.top - menuHeight - 6 : coords.bottom + 6

        if (!slashTriggerCursor) {
          return
        }

        editor.replaceRange(
          ``,
          slashTriggerCursor,
          {
            line: slashTriggerCursor.line,
            ch: slashTriggerCursor.ch + 1,
          },
        )
      })
    }

    const PAIRS: Record<string, string> = {
      '“': `”`,
      '”': `“`,
      '「': `」`,
      '《': `》`,
      '【': `】`,
      '（': `）`,
    }

    let close = PAIRS[text]
    if (!close)
      return
    if (close === `“`) {
      text = `“`
      close = `”`
    }
    const selection = editor.getSelection()

    change.cancel()

    if (selection) {
      editor.replaceSelection(`${text}${selection}${close}`)
      return
    }

    if (change.origin === `+input`) {
      const cursor = editor.getCursor()
      editor.replaceRange(`${text}${close}`, cursor)
      editor.setCursor({ line: cursor.line, ch: cursor.ch + 1 })
    }
  })

  // 粘贴上传图片并插入
  textArea.on(`paste`, async (_editor, event) => {
    if (!(event.clipboardData?.items) || isImgLoading.value) {
      return
    }
    const tableContent = event.clipboardData.getData(`text/plain`)
    if (tableContent && tableContent.includes(`\t`)) {
      // 是表格
      const markdownTable = tableToMarkdown(tableContent)
      const cursor = editor.value!.getCursor()
      event.preventDefault()
      toRaw(store.editor!).replaceSelection(`${markdownTable}\n`, cursor as any)
    }
    else {
      const items = [...event.clipboardData.items].map(item => item.getAsFile()).filter(item => item != null && beforeUpload(item)) as File[]
      if (items.length === 0) {
        return
      }
      // start progress
      const intervalId = setInterval(() => {
        const newProgress = progressValue.value + 1
        if (newProgress >= 100) {
          return
        }
        progressValue.value = newProgress
      }, 100)
      for (const item of items) {
        event.preventDefault()
        await uploadImage(item)
      }
      const cleanup = () => {
        clearInterval(intervalId)
        progressValue.value = 100 // 设置完成状态
        // 可选：延迟一段时间后重置进度
        setTimeout(() => {
          progressValue.value = 0
        }, 1000)
      }
      cleanup()
    }
  })

  return textArea
}

// 初始化编辑器
onMounted(() => {
  const editorDom = editorRef.value

  if (editorDom == null) {
    return
  }

  editorDom.value = store.posts[store.currentPostIndex].content

  nextTick(() => {
    editor.value = createFormTextArea(editorDom)

    initPolishEvent(editor.value)
    editorRefresh()
    mdLocalToRemote()
  })
})

// 监听暗色模式变化并更新编辑器主题
watch(isDark, () => {
  const theme = isDark.value ? `darcula` : `xq-light`
  toRaw(editor.value)?.setOption?.(`theme`, theme)
})

// 监控显示模式的改变
watch(viewMode, async (val) => {
  if (val === 'preview')
    return

  await nextTick()

  editor.value?.refresh()
  editor.value?.focus()
})

// 历史记录的定时器
const historyTimer = ref<NodeJS.Timeout>()
onMounted(() => {
  // 定时，30 秒记录一次文章的历史记录
  historyTimer.value = setInterval(() => {
    const currentPost = store.posts[store.currentPostIndex]

    // 与最后一篇记录对比
    const pre = (currentPost.history || [])[0]?.content
    if (pre === currentPost.content) {
      return
    }

    currentPost.history ??= []
    currentPost.history.unshift({
      content: currentPost.content,
      datetime: new Date().toLocaleString(`zh-CN`),
    })

    currentPost.history.length = Math.min(currentPost.history.length, 10)
  }, 30 * 1000)
})

// 销毁，清理定时器
onUnmounted(() => {
  clearTimeout(historyTimer.value)
  clearTimeout(timeout.value)
  clearTimeout(changeTimer.value)

  // 清理全局事件监听器 - 防止全局事件触发已销毁的组件
  document.removeEventListener(`keydown`, handleGlobalKeydown)
})
</script>

<template>
  <div class="container flex flex-col">
    <Progress v-model="progressValue" class="absolute left-0 right-0 rounded-none" style="height: 2px;" />
    <EditorHeader
      @start-copy="startCopy"
      @end-copy="endCopy"
    />

    <main class="container-main flex flex-1 flex-col">
      <div
        class="container-main-section border-radius-10 relative flex flex-1 overflow-hidden border-1"
      >
        <SaveAsFile v-model:open="folderSourceStore.showDialogWhenSaveAsFile" :post="store.posts[store.currentPostIndex]" />
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            :default-size="10"
            :max-size="store.isOpenLeftSlider && store.isOpenPostSlider ? 30 : 0"
            :min-size="store.isOpenLeftSlider && store.isOpenPostSlider ? 10 : 0"
          >
            <PostSlider :trigger-focus="triggerFocus" />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            :default-size="10"
            :max-size="store.isOpenLeftSlider && store.isOpenTocSlider ? 30 : 0"
            :min-size="store.isOpenLeftSlider && store.isOpenTocSlider ? 10 : 0"
          >
            <div class="overflow-auto p-4" style="max-height: 100%;">
              <h3 class="mb-2 font-bold">
                目录
              </h3>
              <ul>
                <li
                  v-for="(item, index) in store.titleList"
                  :key="index"
                  class="line-clamp-1 py-1 leading-6 hover:bg-gray-200 dark:hover:bg-gray-700"
                  :style="{ paddingLeft: `${item.level - 0.5}em` }"
                >
                  <a :href="item.url">{{ item.title }}</a>
                </li>
              </ul>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            :default-size="store.isOpenFolderPanel ? 15 : 0"
            :max-size="store.isOpenFolderPanel ? 25 : 0"
            :min-size="store.isOpenFolderPanel ? 10 : 0"
          >
            <FolderSourcePanel />
          </ResizablePanel>
          <ResizableHandle v-if="store.isOpenFolderPanel" class="hidden md:block" />
          <ResizablePanel class="flex">
            <div
              v-show="(!store.isMobile || (store.isMobile && showEditor)) && (viewMode !== 'preview')"
              ref="codeMirrorWrapper"
              class="codeMirror-wrapper relative flex-1"
              :class="{
                'order-1 border-l': !store.isEditOnLeft,
                'border-r': store.isEditOnLeft,
              }"
            >
              <SearchTab v-if="editor" ref="searchTabRef" :editor="editor" />
              <AIFixedBtn
                :is-mobile="store.isMobile"
                :show-editor="showEditor"
              />

              <EditorContextMenu>
                <textarea
                  id="editor"
                  ref="editorRef"
                  type="textarea"
                  placeholder="Your markdown text here."
                />
              </EditorContextMenu>
            </div>
            <div
              v-show="(!store.isMobile || (store.isMobile && !showEditor)) && (viewMode !== 'edit')"
              class="relative flex-1 overflow-x-hidden transition-width"
              :class="[store.isOpenRightSlider ? 'w-0' : 'w-100']"
            >
              <div
                id="preview"
                ref="previewRef"
                class="preview-wrapper w-full p-5"
              >
                <div
                  id="output-wrapper"
                  class="w-full"
                  :class="{ output_night: !backLight }"
                >
                  <div
                    class="preview border-x-1 shadow-xl"
                    :class="[store.previewWidth]"
                  >
                    <section id="output" :class="viewMode !== 'preview' ? 'w-full' : 'mx-auto w-full md:max-w-[80ch]'" v-html="output" />
                    <div v-if="isCoping" class="loading-mask">
                      <div class="loading-mask-box">
                        <div class="loading__img" />
                        <span>正在生成</span>
                      </div>
                    </div>
                  </div>
                </div>
                <BackTop
                  target="preview"
                  :right="store.isMobile ? 24 : 20"
                  :bottom="store.isMobile ? 90 : 20"
                />
              </div>
            </div>
            <CssEditor class="order-2 flex-1" />
            <RightSlider class="order-2" />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <!-- 移动端浮动按钮组 -->
      <div v-if="store.isMobile" class="fixed bottom-16 right-6 z-50 flex flex-col gap-2">
        <!-- 切换编辑/预览按钮 -->
        <button
          class="bg-primary flex items-center justify-center rounded-full p-3 text-white shadow-lg transition active:scale-95 hover:scale-105 dark:bg-gray-700 dark:text-white dark:ring-2 dark:ring-white/30"
          aria-label="切换编辑/预览"
          @click="toggleView"
        >
          <component :is="showEditor ? Eye : Pen" class="h-5 w-5" />
        </button>
      </div>

      <AIPolishButton
        v-if="store.showAIToolbox"
        ref="AIPolishBtnRef"
        :position="position"
        @click="AIPolishPopoverRef?.show"
      />

      <AIPolishPopover
        v-if="store.showAIToolbox"
        ref="AIPolishPopoverRef"
        :position="position"
        :selected-text="selectedText"
        :is-dragging="isDragging"
        :is-mobile="store.isMobile"
        @close-btn="AIPolishBtnRef?.close"
        @recalc-pos="recalcPos"
        @start-drag="startDrag"
      />

      <UploadImgDialog @upload-image="uploadImage" />
      <UploadImgToAnotherHostDialog @migrate-image="migrateImage" />

      <InsertFormDialog />

      <InsertMpCardDialog />

      <AlertDialog v-model:open="store.isOpenConfirmDialog">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>提示</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将丢失本地自定义样式，是否继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction @click="store.resetStyle()">
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog v-model:open="isUploadWithDefaultImageHostConfirmDialog">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>提示</AlertDialogTitle>
            <AlertDialogDescription>你将上传图片到公开的 Github 仓库，你确定吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel @click="cancelUpload">
              取消
            </AlertDialogCancel>
            <AlertDialogAction @click="confirmUploadWithDefaultHost">
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MathEditorDialog v-model:open="showMathDialog" v-model:math-latex="mathLatex" @confirm="insertMath" />
    </main>

    <Footer />
  </div>
  <div class="relative">
    <div
      v-if="showSlashMenu"
      ref="menuRef"
      class="fixed z-[9999] w-52 border rounded-xl bg-white p-2 shadow-xl dark:bg-gray-800"
      :style="{
        left: `${slashMenuPosition.left}px`,
        top: `${slashMenuPosition.top}px`,
      }"
    >
      <div class="space-y-1">
        <button
          v-for="(item, i) in slashItems"
          :key="item.label"
          class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          :class="slashIndex === i ? 'bg-gray-200 dark:bg-gray-600' : ''"
          @click="slashAction(item)"
        >
          <div class="flex items-center gap-2">
            <component :is="item.icon" class="h-4 w-4" />
            <span>{{ item.label }}</span>
          </div>
          <div class="flex items-center gap-1 text-xs text-gray-500">
            <kbd
              v-for="key in item.kbd"
              :key="key"
              class="border rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono shadow-sm"
            >
              {{ key }}
            </kbd>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import url('../assets/less/app.less');
</style>

<style lang="less" scoped>
.container {
  height: 100vh;
  min-width: 100%;
  padding: 0;
}

.container-main {
  overflow: hidden;
}

#output-wrapper {
  position: relative;
  user-select: text;
  height: 100%;
}

.loading-mask {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  text-align: center;
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));

  .loading-mask-box {
    position: sticky;
    top: 50%;
    transform: translateY(-50%);

    .loading__img {
      width: 75px;
      height: 75px;
      background: url('../assets/images/auilog.png') no-repeat;
      margin: 1em auto;
      background-size: cover;
    }
  }
}

:deep(.preview-table) {
  border-spacing: 0;
}

.codeMirror-wrapper,
.preview-wrapper {
  height: 100%;
}

.codeMirror-wrapper {
  overflow-x: auto;
  height: 100%;
}

#preview :deep(img) {
  cursor: pointer;
}

#preview :deep(.infographic-diagram svg) {
  cursor: pointer;
}

#preview :deep(.mermaid-diagram svg) {
  cursor: pointer;
}

#preview :deep(.math-section),
#preview :deep(.math-span) {
  cursor: pointer;
}
</style>
