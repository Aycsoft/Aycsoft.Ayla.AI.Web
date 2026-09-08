/** Vue/TypeScript 质量门禁；语法排版交给 Prettier，避免两套规则互相改写。 */
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.codex-artifacts/**',
      '.playwright-cli/**',
      'ui-audit/**',
      'output/**',
      'deploy/Host/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    // Vue 脚本中的 TS 类型名由 vue-tsc 校验，核心 no-undef 无法识别 DOM 类型。
    rules: { 'no-undef': 'off' },
  },
  {
    files: ['*.{ts,mjs}', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,vue,mjs}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'vue/require-default-prop': 'off',
      // 可选 prop 的 undefined 本身是有效契约，不强制添加改变含义的默认值。
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
    },
  },
  prettier,
)
