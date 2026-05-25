export const useHTMLExportStore = defineStore(`export`, {
  state: () => ({
    exporting: false,
  }),
  actions: {
    start() {
      this.exporting = true
    },
    end() {
      this.exporting = false
    },
  },
})
