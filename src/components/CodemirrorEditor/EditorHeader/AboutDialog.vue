<script setup lang="ts">
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([`close`])

function onUpdate(val: boolean) {
  if (!val) {
    emit(`close`)
  }
}

const links = [
  { label: `桌面应用`, url: `https://github.com/iniself/md/releases` },
  { label: `Github`, url: `https://github.com/iniself/md/` },
  { label: `了解更多`, url: `assets/doc/help.html` },
]

function onRedirect(url: string) {
  window.open(url, `_blank`)
}
</script>

<template>
  <Dialog :open="props.visible" @update:open="onUpdate">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Docs<sup style="color:red">+</sup></DialogTitle>
      </DialogHeader>
      <div class="text-center">
        <h3><b>一款多功能 Markdown 编辑器</b></h3>
        <p><i>forked from https://github.com/doocs/md</i></p>
        <img
          class="mx-auto my-5"
          src="/assets/images/auiwechat.png"
          alt="Docs+ Markdown 编辑器"
          style="width: 40%"
        >
      </div>
      <DialogFooter class="sm:justify-evenly">
        <Button
          v-for="link in links"
          :key="link.url"
          @click="onRedirect(link.url)"
        >
          {{ link.label }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
