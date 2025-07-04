<template>
  <div>
    <h1>測試 Vue 應用</h1>
    <router-view />
  </div>
</template>

<script setup>
// 先移除 useAuth 來測試基本 Vue 應用
console.log('App.vue 載入中...')
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
  cursor: pointer;
}

/* 輸入框基本樣式 */
input, select, textarea {
  font-family: inherit;
}

/* 鏈接樣式 */
a {
  color: inherit;
  text-decoration: none;
}

/* 列表樣式 */
ul, ol {
  list-style: none;
}

/* 標題樣式 */
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  line-height: 1.2;
}

/* 段落樣式 */
p {
  margin-bottom: 1rem;
}

/* 響應式容器 */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* 卡片樣式 */
.card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

/* 按鈕基本樣式 */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 響應式網格 */
.grid {
  display: grid;
  gap: 1rem;
}

.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

@media (max-width: 768px) {
  .grid-cols-2,
  .grid-cols-3 {
    grid-template-columns: 1fr;
  }
}

/* 間距工具 */
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }

.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-4 { padding: 1rem; }

/* 文字工具 */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }

/* 顏色工具 */
.text-gray-500 { color: #6b7280; }
.text-gray-700 { color: #374151; }
.text-blue-600 { color: #2563eb; }

/* 顯示工具 */
.hidden { display: none; }
.block { display: block; }
.flex { display: flex; }
.inline-flex { display: inline-flex; }

/* Flexbox 工具 */
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.flex-col { flex-direction: column; }

/* 寬度工具 */
.w-full { width: 100%; }
.w-auto { width: auto; }

/* 高度工具 */
.h-full { height: 100%; }
.min-h-screen { min-height: 100vh; }
</style>
