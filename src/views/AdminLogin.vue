<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>🔐 {{ isRegisterMode ? '用戶註冊' : '用戶登入' }}</h2>
        <p>{{ isRegisterMode ? '創建新帳號來參與抽球系統' : '請輸入您的帳號密碼登入系統' }}</p>
      </div>
      
      <form @submit.prevent="handleSubmit" class="login-form">
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
        
        <div class="form-group">
          <label for="password">密碼</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="請輸入密碼"
            required
            :disabled="isLoading"
            class="form-input"
            minlength="6"
          />
        </div>
        
        <div v-if="isRegisterMode" class="form-group">
          <label for="confirmPassword">確認密碼</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="請再次輸入密碼"
            required
            :disabled="isLoading"
            class="form-input"
            minlength="6"
          />
        </div>
        
        <div v-if="isRegisterMode" class="form-group">
          <label for="displayName">顯示名稱</label>
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            placeholder="請輸入您的顯示名稱"
            required
            :disabled="isLoading"
            class="form-input"
          />
        </div>
        
        <div v-if="!isRegisterMode" class="form-group checkbox-group">
          <label class="checkbox-label">
            <input
              id="rememberEmail"
              v-model="rememberEmail"
              type="checkbox"
              class="checkbox-input"
            />
            <span class="checkbox-text">記住帳號</span>
          </label>
        </div>
        
        <button type="submit" :disabled="isLoading || !isValidForm" class="login-btn">
          <span v-if="isLoading">{{ isRegisterMode ? '註冊中...' : '登入中...' }}</span>
          <span v-else>{{ isRegisterMode ? '🚀 註冊帳號' : '🚀 登入系統' }}</span>
        </button>
        
        <div class="login-options">
          <button type="button" @click="toggleMode" class="toggle-mode-btn" :disabled="isLoading">
            {{ isRegisterMode ? '已有帳號？點此登入' : '沒有帳號？點此註冊' }}
          </button>
          
          <button v-if="!isRegisterMode" type="button" @click="handleForgotPassword" class="forgot-password-btn" :disabled="isLoading || !email">
            🔑 忘記密碼？
          </button>
          
          <!-- 調試按鈕 -->
          <button type="button" @click="testLocalStorage" class="test-btn" style="background: #ffa500; color: white; margin-top: 0.5rem;">
            🧪 測試記住帳號
          </button>
          <button type="button" @click="testSaveEmail" class="test-btn" style="background: #28a745; color: white; margin-top: 0.5rem; margin-left: 0.5rem;">
            💾 手動保存帳號
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
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { login, register, resetPassword, checkAuth } = useAuth()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const displayName = ref('')
const rememberEmail = ref(false)
const message = ref('')
const messageType = ref('')
const isLoading = ref(false)
const isRegisterMode = ref(false)

const isValidForm = computed(() => {
  if (isRegisterMode.value) {
    return email.value && password.value.length >= 6 && password.value === confirmPassword.value && displayName.value.trim()
  }
  return email.value && password.value.length >= 6
})

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value
  message.value = ''
  password.value = ''
  confirmPassword.value = ''
}

const clearForm = () => {
  // 如果在登入模式且勾選記住帳號，則不清除 email
  if (!isRegisterMode.value && rememberEmail.value) {
    // 只清除密碼相關欄位
    password.value = ''
  } else {
    // 清除所有欄位
    email.value = ''
    password.value = ''
  }
  confirmPassword.value = ''
  displayName.value = ''
}

const handleSubmit = async () => {
  if (!isValidForm.value) return
  
  isLoading.value = true
  message.value = ''
  
  try {
    if (isRegisterMode.value) {
      // 註冊流程
      console.log('🚀 AdminLogin.vue: 開始註冊流程')
      console.log('📧 Email:', email.value)
      console.log('👤 顯示名稱:', displayName.value)
      
      const result = await register(email.value, password.value, displayName.value)
      
      console.log('📊 AdminLogin.vue: 註冊結果:', result)
      
      if (result.success) {
        messageType.value = 'success'
        message.value = result.message
        
        console.log('✅ AdminLogin.vue: 註冊成功，準備切換到登入模式')
        
        // 註冊成功後自動切換到登入模式
        setTimeout(() => {
          isRegisterMode.value = false
          clearForm()
          message.value = '註冊成功！請用剛才的帳號密碼登入'
          messageType.value = 'success'
        }, 2000)
      } else {
        console.error('❌ AdminLogin.vue: 註冊失敗:', result.error)
        messageType.value = 'error'
        message.value = result.error || '註冊失敗，請稍後再試'
      }
    } else {
      // 登入流程
      console.log('🔄 開始登入流程...', email.value)
      const result = await login(email.value, password.value)
      
      console.log('📊 登入結果:', result)
      
      if (result.success) {
        messageType.value = 'success'
        message.value = '登入成功！正在跳轉...'
        
        // 如果勾選記住帳號，則保存到 localStorage
        console.log('🔍 檢查記住帳號狀態:')
        console.log('  - rememberEmail.value:', rememberEmail.value)
        console.log('  - email.value:', email.value)
        
        if (rememberEmail.value) {
          try {
            localStorage.setItem('rememberedEmail', email.value)
            console.log('💾 已保存帳號到 localStorage:', email.value)
            
            // 立即驗證保存結果
            const saved = localStorage.getItem('rememberedEmail')
            console.log('✅ 驗證保存結果:', saved)
          } catch (error) {
            console.error('❌ 保存到 localStorage 失敗:', error)
          }
        } else {
          localStorage.removeItem('rememberedEmail')
          console.log('🗑️ 已清除保存的帳號')
        }
        
        console.log('✅ 登入成功，準備跳轉到首頁')
        
        // 使用多種方式確保跳轉成功
        try {
          // 方式1: 使用 Vue Router
          console.log('🔄 嘗試使用 Vue Router 跳轉...')
          await router.replace('/')
          console.log('✅ Vue Router 跳轉成功')
        } catch (routeError) {
          console.error('❌ Vue Router 跳轉失敗:', routeError)
          
          // 方式2: 直接修改 window.location.hash
          console.log('🔄 使用 hash 跳轉備用方案...')
          window.location.hash = '#/'
          
          // 方式3: 如果 hash 也不行，使用 window.location.href
          setTimeout(() => {
            if (window.location.hash !== '#/') {
              console.log('🔄 使用 href 跳轉備用方案...')
              window.location.href = '/#/'
            }
          }, 500)
        }
      } else {
        console.error('❌ 登入失敗:', result.error)
        messageType.value = 'error'
        message.value = result.error || '登入失敗，請檢查帳號密碼'
      }
    }
  } catch (error) {
    messageType.value = 'error'
    message.value = '操作過程中發生錯誤，請稍後再試'
    console.error('操作錯誤:', error)
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

// 初始化時載入已保存的帳號
const loadRememberedEmail = () => {
  try {
    const savedEmail = localStorage.getItem('rememberedEmail')
    console.log('🔍 載入已保存的帳號:', savedEmail)
    
    if (savedEmail) {
      email.value = savedEmail
      rememberEmail.value = true
      console.log('✅ 已載入保存的帳號:', savedEmail)
    } else {
      console.log('📝 沒有保存的帳號')
    }
  } catch (error) {
    console.error('❌ 載入保存帳號時發生錯誤:', error)
  }
}

// 在組件掛載後執行
onMounted(() => {
  console.log('🏗️ AdminLogin 組件已掛載，開始載入記住的帳號')
  
  // 延遲一點時間再載入，確保 localStorage 穩定
  setTimeout(() => {
    loadRememberedEmail()
  }, 100) // 延遲 100ms
  
  // 再次延遲檢查，以防第一次載入失敗
  setTimeout(() => {
    console.log('🔄 第二次檢查記住的帳號')
    const saved = localStorage.getItem('rememberedEmail')
    if (saved && !email.value) {
      console.log('🔧 第二次載入記住的帳號:', saved)
      email.value = saved
      rememberEmail.value = true
    }
  }, 500) // 延遲 500ms
})

// 測試函數 - 檢查 localStorage
const testLocalStorage = () => {
  console.log('🧪 測試 localStorage:')
  console.log('  - rememberedEmail:', localStorage.getItem('rememberedEmail'))
  console.log('  - email.value:', email.value)
  console.log('  - rememberEmail.value:', rememberEmail.value)
}

// 測試函數 - 手動保存帳號
const testSaveEmail = () => {
  console.log('🧪 測試手動保存帳號:')
  console.log('  - 當前 email:', email.value)
  console.log('  - 當前 rememberEmail:', rememberEmail.value)
  
  if (email.value && rememberEmail.value) {
    localStorage.setItem('rememberedEmail', email.value)
    console.log('💾 手動保存成功:', email.value)
    
    // 立即驗證
    const saved = localStorage.getItem('rememberedEmail')
    console.log('✅ 驗證保存結果:', saved)
  } else {
    console.log('❌ 無法保存：email 或 rememberEmail 為空')
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

.form-group.checkbox-group {
  margin-bottom: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
}

.checkbox-input {
  margin-right: 0.5rem;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.checkbox-text {
  user-select: none;
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

.toggle-mode-btn {
  background: none;
  border: none;
  color: #4299e1;
  cursor: pointer;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  transition: color 0.2s;
}

.toggle-mode-btn:hover:not(:disabled) {
  color: #3182ce;
  text-decoration: underline;
}

.toggle-mode-btn:disabled {
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
