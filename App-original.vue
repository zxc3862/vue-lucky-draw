
<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuth } from './src/composables/useAuth'

const { setupAuthListener, checkAuth } = useAuth()

onMounted(() => {
  setupAuthListener()
  checkAuth()
})
</script>

<style>
/* 全域樣式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f8fafc;
}

/* 響應式圖片 */
img {
  max-width: 100%;
  height: auto;
}

/* 響應式表格 */
table {
  width: 100%;
  border-collapse: collapse;
}

/* 無障礙聚焦樣式 */
*:focus {
  outline: 2px solid #4299e1;
  outline-offset: 2px;
}

/* 按鈕基本樣式 */
button {
  font-family: inherit;
  font-size: inherit;
}

/* 輸入框基本樣式 */
input, select, textarea {
  font-family: inherit;
  font-size: inherit;
}

/* 連結基本樣式 */
a {
  color: #4299e1;
  text-decoration: none;
}

a:hover {
  color: #3182ce;
  text-decoration: underline;
}

/* 響應式工具類別 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 手機優先的響應式設計 */
@media (max-width: 640px) {
  body {
    font-size: 14px;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  body {
    font-size: 15px;
  }
}

@media (min-width: 1025px) {
  body {
    font-size: 16px;
  }
}

/* 觸控友好的最小點擊區域 */
@media (hover: none) and (pointer: coarse) {
  button, 
  a, 
  input[type="button"], 
  input[type="submit"], 
  input[type="reset"] {
    min-height: 44px;
    min-width: 44px;
  }
}

/* 暗色模式支援 */
@media (prefers-color-scheme: dark) {
  body {
    background: #1a202c;
    color: #e2e8f0;
  }
}

/* 減少動畫偏好設定 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 高對比度模式 */
@media (prefers-contrast: high) {
  * {
    border-color: currentColor !important;
  }
}
</style>
