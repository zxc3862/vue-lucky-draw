<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>🔐 用戶登入</h2>
        <p>請輸入您的 Email 地址，我們將發送登入連結到您的信箱</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">Email 地址</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="請輸入您的 Email"
            required
            :disabled="isLoading"
            class="form-input"
          />
        </div>
        
        <button type="submit" :disabled="isLoading || !email" class="login-btn">
          <span v-if="isLoading">發送中...</span>
          <span v-else>🚀 發送登入連結</span>
        </button>
        
        <div class="login-options">
          <button type="button" @click="handleForgotPassword" class="forgot-password-btn" :disabled="isLoading || !email">
            🔑 忘記密碼？
          </button>
        </div>
      </form>
      
      <div v-if="message" class="message" :class="messageType">
        {{ message }}
      </div>
      
      <div class="info-section">
        <h3>🎯 角色說明</h3>
        <div class="role-info">
          <div class="role-item">
            <span class="role-badge admin">管理員</span>
            <p>可以管理玩家、執行抽球、設定權限</p>
          </div>
          <div class="role-item">
            <span class="role-badge participant">參加者</span>
            <p>可以查看排行榜和抽球歷史</p>
          </div>
        </div>
        <p class="note">
          💡 首次登入後，請聯繫管理員設定您的角色權限
        </p>
      </div>
      
      <div class="back-section">
        <router-link to="/" class="back-btn">← 返回首頁</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { login, resetPassword } = useAuth()

const email = ref('')
const message = ref('')
const messageType = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  if (!email.value) return
  
  isLoading.value = true
  message.value = ''
  
  try {
    const result = await login(email.value)
    
    if (result.success) {
      messageType.value = 'success'
      message.value = result.message
      
      // 3秒後跳轉到首頁
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } else {
      messageType.value = 'error'
      message.value = result.error || '登入失敗，請稍後再試'
    }
  } catch (error) {
    messageType.value = 'error'
    message.value = '登入過程中發生錯誤，請稍後再試'
    console.error('登入錯誤:', error)
  } finally {
    isLoading.value = false
  }
}

const handleForgotPassword = async () => {
  if (!email.value) {
    messageType.value = 'error'
    message.value = '請先輸入 Email 地址'
    return
  }
  
  isLoading.value = true
  message.value = ''
  
  try {
    const result = await resetPassword(email.value)
    
    if (result.success) {
      messageType.value = 'success'
      message.value = result.message
    } else {
      messageType.value = 'error'
      message.value = result.error || '重設密碼失敗，請稍後再試'
    }
  } catch (error) {
    messageType.value = 'error'
    message.value = '重設密碼過程中發生錯誤，請稍後再試'
    console.error('重設密碼錯誤:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h2 {
  color: #2d3748;
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.login-header p {
  color: #718096;
  font-size: 0.875rem;
  line-height: 1.5;
}

.login-form {
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

.login-btn {
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

.login-btn:hover:not(:disabled) {
  background: #3182ce;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
}

.login-btn:disabled {
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

.info-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.info-section h3 {
  color: #2d3748;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.role-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.role-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.role-badge.admin {
  background: #fbb6ce;
  color: #97266d;
}

.role-badge.participant {
  background: #bee3f8;
  color: #2b6cb0;
}

.role-item p {
  margin: 0;
  font-size: 0.875rem;
  color: #4a5568;
}

.note {
  font-size: 0.875rem;
  color: #718096;
  text-align: center;
  margin: 0;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 0.5rem;
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

.login-options {
  margin-top: 1rem;
  text-align: center;
}

.forgot-password-btn {
  background: none;
  border: none;
  color: #4299e1;
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: underline;
  transition: color 0.2s;
}

.forgot-password-btn:hover:not(:disabled) {
  color: #3182ce;
}

.forgot-password-btn:disabled {
  color: #a0aec0;
  cursor: not-allowed;
}

/* 響應式設計 */
@media (max-width: 640px) {
  .login-card {
    padding: 1.5rem;
    margin: 0.5rem;
  }
  
  .login-header h2 {
    font-size: 1.25rem;
  }
  
  .role-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
