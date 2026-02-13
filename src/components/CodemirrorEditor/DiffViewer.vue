<script setup lang="ts">
import type { Diff2HtmlUIConfig } from 'diff2html/lib/ui/js/diff2html-ui-slim.js'
import { ColorSchemeType } from 'diff2html/lib/types'
import { Diff2HtmlUI } from 'diff2html/lib/ui/js/diff2html-ui-slim.js'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from '@/stores'
import 'highlight.js/styles/github.css'
import 'diff2html/bundles/css/diff2html.min.css'

const props = defineProps<{
  diffContent: string
}>()

const store = useStore()

const containerRef = ref<HTMLDivElement | null>(null)
let diffUi: Diff2HtmlUI | null = null

function renderDiff(isDark: boolean) {
  if (!containerRef.value)
    return

  containerRef.value.innerHTML = ``

  const configuration: Diff2HtmlUIConfig = {
    drawFileList: false,
    matching: `lines`,
    highlight: true,
    fileContentToggle: false,
    colorScheme: isDark ? ColorSchemeType.DARK : ColorSchemeType.LIGHT,
    outputFormat: `side-by-side`, // 或 'line-by-line'
  }

  diffUi = new Diff2HtmlUI(containerRef.value, props.diffContent, configuration)

  diffUi.draw()
  diffUi.highlightCode()
}

const defaultCodeTheme = store.codeBlockTheme

onMounted(() => {
  if (store.isDark) {
    store.codeBlockThemeChanged(`assets/highlight-themes/github-dark.min.css`)
  }
  else {
    store.codeBlockThemeChanged(`assets/highlight-themes/github.min.css`)
  }
  renderDiff(store.isDark)
})

onBeforeUnmount(() => {
  diffUi = null
  store.codeBlockThemeChanged(defaultCodeTheme)
})
</script>

<template>
  <div ref="containerRef" class="overflow-auto" />
</template>
