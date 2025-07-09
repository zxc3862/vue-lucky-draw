<template>
  <div class="reset-password-container">
    <div class="reset-card">
      <div class="reset-header">
        <h2>🔐 重設密碼</h2>
        <p v-if="hasValidSession">請輸入您的新密碼</p>
        <p v-else>請通過 Email 中的連結訪問此頁面</p>
      </div>
      
      <form v-if="hasValidSession" @submit.prevent="handleResetPassword" class="reset-form">
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
      
      <div v-else class="error-info">
        <p>⚠️ 請先點擊 Email 中的重設密碼連結</p>
        <router-link to="/admin/login" class="login-link">返回登入頁面</router-link>
      </div>
      
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../../supabaseClient'

const router = useRouter()
const { updatePassword } = useAuth()

const password = ref('')
const confirmPassword = ref('')
const message = ref('')
const messageType = ref('')
const isLoading = ref(false)
const hasValidSession = ref(false)
const currentResetToken = ref(null) // 當前重設密碼會話的 token

const isValidForm = computed(() => {
  return password.value.length >= 6 && 
         password.value === confirmPassword.value
})

// HTTP API 輔助函數
const withTimeout = (promise, timeout = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('請求超時')), timeout)
    )
  ])
}

// 重設密碼專用的密碼更新函數
const updatePasswordWithToken = async (newPassword, accessToken) => {
  console.log('🔄 updatePasswordWithToken 開始執行')
  
  try {
    const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
    
    console.log('🔑 使用特定的 access token 更新密碼')
    
    const response = await Promise.race([
      fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          password: newPassword
        })
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('更新密碼請求超時')), 10000))
    ])

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ updatePasswordWithToken: HTTP 更新失敗:', errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const result = await response.json()
    console.log('✅ updatePasswordWithToken: 密碼更新成功:', result)
    
    return { success: true, message: '密碼更新成功' }

  } catch (error) {
    console.error('❌ updatePasswordWithToken: 異常:', error)
    return { success: false, error: error.message || '更新密碼失敗，請稍後再試' }
  }
}

const httpSetSession = async (accessToken, refreshToken) => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  console.log('🔄 HTTP API: 設定 session')
  
  try {
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      })
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText)
    }
    
    const data = await response.json()
    console.log('✅ HTTP API: 設定 session 成功')
    
    // 將 session 保存到 localStorage
    localStorage.setItem('sb-qzffahnlwvxgfovmrjia-auth-token', JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    }))
    
    return { success: true, data }
  } catch (error) {
    console.error('HTTP API 設定 session 失敗:', error)
    throw error
  }
}

const httpGetUser = async () => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  try {
    const session = JSON.parse(localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token') || '{}')
    const accessToken = session?.access_token
    
    if (!accessToken) {
      throw new Error('無 access token')
    }
    
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`
        }
      })
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText)
    }
    
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('HTTP API 取得用戶失敗:', error)
    throw error
  }
}

onMounted(async () => {
  try {
    // 檢查是否有重設密碼的 session
    let urlParams
    const hash = window.location.hash
    const search = window.location.search
    
    console.log('🔍 ResetPassword 頁面 URL 分析:', {
      hash: hash,
      search: search,
      fullUrl: window.location.href
    })
    
    // 優先從 search 參數中解析（正常情況）
    if (search) {
      urlParams = new URLSearchParams(search)
      console.log('📦 從 search 中解析參數')
    } else if (hash && hash.includes('?')) {
      // 從 hash 中的查詢參數解析
      const hashParts = hash.split('?')
      if (hashParts.length > 1) {
        urlParams = new URLSearchParams(hashParts[1])
        console.log('📦 從 hash 查詢參數中解析參數')
      } else {
        urlParams = new URLSearchParams()
      }
    } else if (hash && hash.includes('access_token')) {
      // 參數直接在 hash 中（舊格式）
      const hashParams = hash.substring(1) // 移除 #
      urlParams = new URLSearchParams(hashParams)
      console.log('📦 從 hash 中解析參數（舊格式）')
    } else {
      urlParams = new URLSearchParams()
      console.log('📦 無參數可解析')
    }
    
    const accessToken = urlParams.get('access_token')
    const refreshToken = urlParams.get('refresh_token')
    const type = urlParams.get('type')
    const token = urlParams.get('token')
    
    console.log('🔍 ResetPassword 頁面參數檢查:', {
      accessToken: !!accessToken,
      refreshToken: !!refreshToken,
      type: type,
      token: !!token,
      accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : null,
      refreshTokenPreview: refreshToken ? refreshToken.substring(0, 20) + '...' : null
    })
    
    // 處理標準的 access_token/refresh_token 格式
    if (accessToken && refreshToken && type === 'recovery') {
      console.log('🔄 檢測到重設密碼 token，保存到當前會話...')
      
      // 直接保存 token 到當前會話，不設定到 localStorage
      currentResetToken.value = accessToken
      hasValidSession.value = true
      
      console.log('✅ 重設密碼 token 已保存到當前會話')
      
      // 清理 URL 參數
      router.replace('/reset-password')
    } 
    // 處理 token 格式（從 Supabase 重設密碼 Email 直接跳轉）
    else if (token && type === 'recovery') {
      console.log('🔄 檢測到 token 格式，嘗試驗證 token...')
      try {
        // 使用 Supabase 驗證 token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery'
        })
        
        if (error) {
          console.error('❌ Token 驗證失敗:', error)
          throw error
        }
        
        if (data.user) {
          console.log('✅ Token 驗證成功，用戶:', data.user.email)
          hasValidSession.value = true
          
          // 保存 session 到 localStorage
          if (data.session) {
            const sessionData = {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              user: data.session.user,
              expires_at: data.session.expires_at,
              token_type: 'bearer'
            }
            localStorage.setItem('sb-qzffahnlwvxgfovmrjia-auth-token', JSON.stringify(sessionData))
            console.log('✅ Session 已保存到 localStorage')
          }
          
          // 清理 URL 參數
          router.replace('/reset-password')
        } else {
          throw new Error('Token 驗證後無法獲取用戶資料')
        }
      } catch (tokenError) {
        console.error('❌ Token 驗證失敗:', tokenError)
        messageType.value = 'error'
        message.value = '重設密碼連結無效或已過期，請重新申請'
      }    }
    else {
      // 如果沒有找到 token 參數，檢查是否是直接訪問重設密碼頁面
      // 這種情況下需要有有效的 session
      console.log('🔄 沒有找到 token 參數，檢查是否有有效的 session...')
      
      try {
        console.log('🔄 使用 HTTP API 檢查用戶 session...')
        const result = await httpGetUser()
        if (result.success && result.data) {
          hasValidSession.value = true
          console.log('✅ HTTP API 檢查用戶 session 成功')
        } else {
          messageType.value = 'error'
          message.value = '無效的重設密碼連結，請重新申請重設密碼'
          console.log('❌ 無有效 session，顯示錯誤訊息')
        }
      } catch (httpError) {
        console.warn('HTTP API 檢查用戶 session 失敗，使用 Supabase 客戶端:', httpError)
        
        // 客戶端 fallback with timeout
        try {
          const clientPromise = supabase.auth.getUser()
          const { data: { user } } = await withTimeout(clientPromise, 3000)
          
          if (user) {
            hasValidSession.value = true
            console.log('✅ Supabase 客戶端檢查用戶 session 成功')
          } else {
            messageType.value = 'error'
            message.value = '無效的重設密碼連結，請重新申請重設密碼'
            console.log('❌ Supabase 客戶端無有效 session，顯示錯誤訊息')
          }
        } catch (clientError) {
          console.error('Supabase 客戶端檢查 session 失敗:', clientError)
          messageType.value = 'error'
          message.value = '無效的重設密碼連結，請重新申請重設密碼'
        }
      }
    }
  } catch (error) {
    console.error('重設密碼初始化失敗:', error)
    messageType.value = 'error'
    message.value = '重設密碼連結無效或已過期'
  }
})

const handleResetPassword = async () => {
  if (!hasValidSession.value) {
    messageType.value = 'error'
    message.value = '請先通過 Email 中的連結訪問此頁面'
    return
  }

  if (!isValidForm.value) {
    messageType.value = 'error'
    message.value = '密碼必須至少 6 位數且兩次輸入須一致'
    return
  }
  
  isLoading.value = true
  message.value = ''
  
  try {
    let result
    
    if (currentResetToken.value) {
      // 如果有重設密碼 token，使用專用的更新函數
      console.log('🔄 使用重設密碼 token 更新密碼')
      result = await updatePasswordWithToken(password.value, currentResetToken.value)
    } else {
      // 否則使用一般的更新密碼函數
      console.log('🔄 使用一般方式更新密碼')
      result = await updatePassword(password.value)
    }
    
    if (result.success) {
      messageType.value = 'success'
      message.value = '密碼更新成功！3秒後將跳轉至登入頁面'
      
      // 清理重設密碼 token
      currentResetToken.value = null
      
      // 3秒後跳轉到登入頁面
      setTimeout(() => {
        router.push('/admin/login')
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

.error-info {
  text-align: center;
  padding: 2rem;
  background: #fed7d7;
  border: 1px solid #fc8181;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.error-info p {
  color: #742a2a;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.login-link {
  color: #4299e1;
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border: 1px solid #4299e1;
  border-radius: 0.375rem;
  display: inline-block;
  transition: all 0.2s;
}

.login-link:hover {
  background: #4299e1;
  color: white;
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
