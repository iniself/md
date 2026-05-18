<script setup lang="ts">
import { ref } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { altSign, ctrlSign } from '@/config'

import 'mathlive'
import 'mathlive/static.css'

const emit = defineEmits<{
  confirm: [latex: string]
}>()

const open = defineModel<boolean>(`open`)

const mf = ref()

const useTextExtension = ref(false)
const useBlockLatex = ref(false)

function handleDSL(dsl: string): string {
  const safeDsl = dsl.replace(/\$/g, `\\$`)
  let mathLatex = useBlockLatex.value
    ? `$$
${safeDsl}${useTextExtension.value ? `` : `⟦cursor⟧`}
$$`
    : `$${safeDsl}${useTextExtension.value ? `` : `⟦cursor⟧`}$`

  if (useTextExtension.value && !useBlockLatex.value) {
    mathLatex = `=⟦cursor⟧:: ${mathLatex} ::=`
  }

  return mathLatex
}

function save() {
  const mathLatex = handleDSL(mf.value.getValue())
  emit(`confirm`, mathLatex)
  open.value = false
}

function handleOutside(e: Event) {
  e.preventDefault()
}

const isVirtualKeyboardOpened = ref(false)

window.mathVirtualKeyboard.addEventListener(
  `before-virtual-keyboard-toggle`,
  (evt) => {
    const e = evt as CustomEvent<{ visible: boolean }>
    if (e.detail.visible) {
      isVirtualKeyboardOpened.value = true
    }
    else {
      isVirtualKeyboardOpened.value = false
    }
  },
)

function onPressDown(e: KeyboardEvent) {
  if (!e.target)
    return

  if (!(e.target instanceof HTMLElement) || e.target.tagName.toLowerCase() !== `math-field`)
    return

  if ((e.key === `ArrowDown` && (e.ctrlKey || e.metaKey)) && !isVirtualKeyboardOpened.value) {
    e.preventDefault()
    window.mathVirtualKeyboard.show()
  }

  if ((e.key === `ArrowUp` && (e.ctrlKey || e.metaKey)) && isVirtualKeyboardOpened.value) {
    e.preventDefault()
    window.mathVirtualKeyboard.hide()
  }

  if ((e.key === `Enter` && (e.metaKey || e.ctrlKey) && e.altKey) && open.value) {
    save()
  }
}

watch(useBlockLatex, (val) => {
  if (val) {
    useTextExtension.value = false
  }
})

watch(open, async (v) => {
  if (v) {
    await nextTick()
    mf.value?.focus()
  }
})

const shortCutsTips = [
  {
    label: `提交`,
    kbd: [ctrlSign, altSign, `Enter`],
  },
  {
    label: `退出`,
    kbd: [ctrlSign, `Esc`],
  },
  {
    label: `打开虚拟键盘`,
    kbd: [ctrlSign, altSign, `↑`],
  },
  {
    label: `关闭虚拟键盘`,
    kbd: [ctrlSign, altSign, `↓`],
  },

]
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent :class="isVirtualKeyboardOpened ? 'top-[10px] translate-y-0' : ''" @interact-outside="handleOutside">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <DialogTitle>插入公式</DialogTitle>
          <div class="flex items-center gap-1 text-xs text-gray-500">
            <kbd
              v-for="key in [ctrlSign, altSign, `Enter`]"
              :key="key"
              class="border rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono shadow-sm"
            >
              {{ key }}
            </kbd>
            <div class="text-muted-foreground">
              <Popover>
                <PopoverTrigger as-child>
                  <button @pointerdown.prevent>
                    💡 更多
                  </button>
                </PopoverTrigger>
                <PopoverContent class="w-64 text-sm">
                  <div class="space-y-2" @pointerdown.prevent>
                    <div class="font-bold">
                      快捷键：
                    </div>
                    <div
                      v-for="item in shortCutsTips"
                      :key="item.label"
                      class="w-full flex items-center justify-between rounded-lg px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div class="flex items-center gap-2">
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
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogDescription>支持手写和虚拟键盘</DialogDescription>
      </DialogHeader>
      <math-field
        ref="mf"
        math-virtual-keyboard-policy="auto"
        smart-fence
        style="border: 1px solid #ccc; border-radius: 4px; padding: 2px 4px;"
        @keydown="onPressDown"
      />
      <DialogFooter class="items-center !flex !flex-row">
        <div class="mr-auto flex items-center gap-5">
          <div class="flex items-center gap-2">
            <Label class="text-muted-foreground text-sm">{{ useBlockLatex ? '块级公式' : '行内公式' }}</Label>
            <Switch v-model:checked="useBlockLatex" name="UseCompression" class="h-5 w-10" />
          </div>
          <div class="flex items-center gap-2">
            <Label for="latex-textstyle" class="text-muted-foreground text-sm" :class="useBlockLatex ? 'opacity-30 cursor-not-allowed line-through' : ''">额外样式
              <Popover>
                <PopoverTrigger as-child>
                  <button>
                    ?
                  </button>
                </PopoverTrigger>
                <PopoverContent class="w-64 text-sm">
                  <div class="space-y-2">
                    <div class="font-bold">
                      额外样式：
                    </div>
                    <p>把公式放入 <span class="rounded bg-black/5 px-1 py-0.5 text-[0.85em] text-red-600 font-mono dark:bg-white/10 dark:text-red-400"> =:: ::= </span>，像文本那样控制公式样式。包括颜色大小等。</p>
                    <p>💡 仅对行内公式有效</p>
                  </div>
                </PopoverContent>
              </Popover>
            </Label>
            <Checkbox
              id="latex-textstyle"
              v-model="useTextExtension"
              class="bg-background border-foreground/50 data-[state=checked]:bg-foreground data-[state=checked]:text-background h-5 h-5 w-5 w-5 border data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
              :disabled="useBlockLatex"
            />
          </div>
        </div>
        <Button variant="outline" @click="open = false">
          退 出
        </Button>
        <Button @click="save">
          确 定
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
