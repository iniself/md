import path from 'node:path'
import process from 'node:process'

import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  base:
    process.env.SERVER_ENV === `NETLIFY_WEB`
      ? `/`
      : process.env.SERVER_ENV === `NETLIFY_ELECTRON` ? `./` : `/md/`,
  define: { process },
  envPrefix: [`VITE_`, `CF_`],
  plugins: [
    vue(),
    UnoCSS(),
    vueDevTools(),
    nodePolyfills({
      include: [`path`, `util`, `timers`, `stream`, `fs`],
      overrides: {
        // Since `fs` is not supported in browsers, we can use the `memfs` package to polyfill it.
        // fs: 'memfs',
      },
    }),
    process.env.ANALYZE === `true`
    && visualizer({ emitFile: true, filename: `stats.html` }),
    AutoImport({
      imports: [`vue`, `pinia`, `@vueuse/core`],
      dirs: [`./src/stores`, `./src/utils/toast`, `./src/composables`],
    }),
    Components({
      resolvers: [],
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, `./src`) },
  },
  css: { devSourcemap: true },
  build: {
    outDir:
      process.env.SERVER_ENV === `NETLIFY_WEB`
        ? `dist-web`
        : process.env.SERVER_ENV === `NETLIFY_ELECTRON` ? `dist-electron` : `dist-web-md/md`,
    rollupOptions: {
      output: {
        chunkFileNames: `static/js/md-[name]-[hash].js`,
        entryFileNames: `static/js/md-[name]-[hash].js`,
        assetFileNames: `static/[ext]/md-[name]-[hash].[ext]`,
        manualChunks(id) {
          if (id.includes(`node_modules`)) {
            if (id.includes(`katex`))
              return `katex`
            if (id.includes(`mermaid`))
              return `mermaid`
            if (id.includes(`cytoscape`))
              return `cytoscape`
            if (id.includes(`highlight.js`))
              return `hljs`
            const pkg = id
              .split(`node_modules/`)[1]
              .split(`/`)[0]
              .replace(`@`, `npm_`)
            return `vendor_${pkg}`
          }
        },
      },
    },
  },
})
