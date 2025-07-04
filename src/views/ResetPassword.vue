<template>
  <div class="reset-password-container">
    <div class="reset-card">
      <div class="reset-header">
        <h2>🔐 重設密碼</h2>
        <p>請輸入您的新密碼</p>
      </div>
      
      <form @submit.prevent="handleResetPassword" class="reset-form">
        <div class="form-group">
          <label for="password">新密碼</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="請輸入新密碼"
            required
            :disabled="isLoading"
            class="form-input"
            minlength="6"
          />
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">確認密碼</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="請再次輸入新密碼"
            required
            :disabled="isLoading"
            class="form-input"
            minlength="6"
          />
        </div>
        
        <button type="submit" :disabled="isLoading || !isValidForm" class="reset-btn">
          <span v-if="isLoading">更新中...</span>
          <span v-else>🔄 更新密碼</span>
        </button>
      </form>
      
      <div v-if="message" class="message" :class="messageType">
        {{ message }}
      </div>
      
      <div class="back-section">
        <router-link to="/" class="back-btn">← 返回首頁</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { updatePassword } = useAuth()

const password = ref('')
const confirmPassword = ref('')
const message = ref('')
const messageType = ref('')
const isLoading = ref(false)

const isValidForm = computed(() => {
  return password.value.length >= 6 && 
         password.value === confirmPassword.value
})

const handleResetPassword = async () => {
  if (!isValidForm.value) {
    messageType.value = 'error'
    message.value = '密碼必須至少 6 位數且兩次輸入須一致'
    return
  }
  
  isLoading.value = true
  message.value = ''
  
  try {
    const result = await updatePassword(password.value)
    
    if (result.success) {
      messageType.value = 'success'
      message.value = result.message
      
      // 3秒後跳轉到首頁
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } else {
      messageType.value = 'error'
      message.value = result.error || '密碼更新失敗，請稍後再試'
    }
  } catch (error) {
    messageType.value = 'error'
    message.value = '密碼更新過程中發生錯誤，請稍後再試'
    console.error('密碼更新錯誤:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.reset-password-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.reset-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(10px);
}

.reset-header {
  text-align: center;
  margin-bottom: 2rem;
}

.reset-header h2 {
  color: #2d3748;
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.reset-header p {
  color: #718096;
  font-size: 0.875rem;
  line-height: 1.5;
}

.reset-form {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.form-input:disabled {
  background: #f7fafc;
  opacity: 0.6;
  cursor: not-allowed;
}

.reset-btn {
  width: 100%;
  padding: 0.875rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover:not(:disabled) {
  background: #3182ce;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

.reset-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.message {
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  text-align: center;
}

.message.success {
  background: #c6f6d5;
  color: #22543d;
  border: 1px solid #9ae6b4;
}

.message.error {
  background: #fed7d7;
  color: #742a2a;
  border: 1px solid #fc8181;
}

.back-section {
  text-align: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5rem;
}

.back-btn {
  color: #4299e1;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.back-btn:hover {
  color: #3182ce;
}

/* 響應式設計 */
@media (max-width: 640px) {
  .reset-card {
    padding: 1.5rem;
    margin: 0.5rem;
  }
  
  .reset-header h2 {
    font-size: 1.25rem;
  }
}
</style>
