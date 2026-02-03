import { h, ref } from 'vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  dialogType?: string
}

export function useConfirmDialog() {
  const open = ref(false)
  const options = ref<ConfirmOptions>({})

  let resolver: ((value: boolean) => void) | null = null

  function confirm(opts: ConfirmOptions = {}): Promise<boolean> {
    options.value = {
      confirmText: `确认`,
      cancelText: `取消`,
      dialogType: `confirm`,
      ...opts,
    }

    open.value = true

    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  function close(result: boolean) {
    open.value = false
    resolver?.(result)
    resolver = null
  }

  function returnActionButton(dialogType: string | undefined) {
    if (dialogType === `confirm`) {
      return [
        h(
          AlertDialogCancel,
          { onClick: () => close(false) },
          () => options.value.cancelText,
        ),
        h(
          AlertDialogAction,
          { onClick: () => close(true) },
          () => options.value.confirmText,
        ),
      ]
    }
    else if (dialogType === `alert`) {
      return [
        h(
          AlertDialogCancel,
          { onClick: () => close(false) },
          () => options.value.cancelText,
        ),
      ]
    }
  }

  const dialog = () =>
    h(
      AlertDialog,
      {
        'open': open.value,
        'onUpdate:open': (v: boolean) => {
          open.value = v
        },
      },
      () =>
        h(AlertDialogContent, {}, () => [
          h(AlertDialogHeader, {}, () => [
            h(AlertDialogTitle, {}, () => options.value.title),
            h(AlertDialogDescription, {}, () => options.value.description),
          ]),
          h(AlertDialogFooter, {}, () => returnActionButton(options.value.dialogType)),
        ]),
    )

  return {
    confirm,
    dialog,
  }
}
