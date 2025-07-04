<template>
  <div class="home">
    <h1>🎯 抽球系統</h1>
    <p>系統正常運行中...</p>
  </div>
</template>

<script setup>
console.log('Home.vue 載入中...')
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
}

.home h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.home p {
  font-size: 1.25rem;
}
</style>
