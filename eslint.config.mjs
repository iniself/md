import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  unocss: true,
  typescript: true,
  formatters: true,
  ignores: [`.github`, `scripts`, `docker`, `md-cli`, `src/assets`, `src/lib/paged*.js`, `example`, `node_modules/**`, `dist/**`, `md-cli/dist/**`],
}, {
  rules: {
    'semi': [`error`, `never`],
    'no-unused-vars': `off`,
    'no-console': `off`,
    'no-debugger': `off`,
    'ts/no-namespace': `off`,
  },
})
