
<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './src/composables/useAuth'
import { supabase } from './supabaseClient'

const router = useRouter()
const { setupAuthListener, checkAuth } = useAuth()

// HTTP API 輔助函數
const withTimeout = (promise, timeout = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('請求超時')), timeout)
    )
  ])
}

const httpSetSession = async (accessToken, refreshToken) => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  console.log('🔄 App.vue HTTP API: 設定 session')
  
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
    console.log('✅ App.vue HTTP API: 設定 session 成功')
    
    // 將 session 保存到 localStorage
    localStorage.setItem('sb-qzffahnlwvxgfovmrjia-auth-token', JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    }))
    
    return { success: true, data }
  } catch (error) {
    console.error('App.vue HTTP API 設定 session 失敗:', error)
    throw error
  }
}

// App.vue 專用的用戶角色確保函數（使用 HTTP API）
const ensureUserRoleInApp = async (user) => {
  if (!user || !user.id || !user.email) {
    console.warn('App.vue ensureUserRole: 無效的用戶資料', user)
    return
  }

  const maxRetries = 3
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      attempt++
      console.log(`App.vue ensureUserRole: 第 ${attempt} 次嘗試為用戶 ${user.email} 確保角色記錄`)

      // 優先使用 HTTP API 檢查是否已存在記錄
      try {
        const session = JSON.parse(localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token') || '{}')
        const accessToken = session?.access_token
        
        if (accessToken) {
          const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
          const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
          
          // 檢查是否已存在記錄
          const checkResponse = await withTimeout(
            fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&select=id,role`, {
              method: 'GET',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            })
          )
          
          if (checkResponse.ok) {
            const existingData = await checkResponse.json()
            if (existingData && existingData.length > 0) {
              console.log(`App.vue ensureUserRole: 用戶 ${user.email} 角色記錄已存在 (${existingData[0].role})`)
              return true
            }
          }
          
          // 記錄不存在，嘗試創建
          console.log(`App.vue ensureUserRole: 為用戶 ${user.email} 創建角色記錄`)
          
          const userData = {
            user_id: user.id,
            email: user.email,
            role: 'participant',
            display_name: user.user_metadata?.display_name || 
                         user.user_metadata?.name || 
                         user.email.split('@')[0],
            created_at: new Date().toISOString()
          }
          
          const createResponse = await withTimeout(
            fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(userData)
            })
          )
          
          if (createResponse.ok || createResponse.status === 409) {
            console.log(`App.vue ensureUserRole: 成功為用戶 ${user.email} 創建角色記錄`)
            return true
          }
        }
      } catch (httpError) {
        console.warn('App.vue HTTP API 方法失敗，使用 Supabase 客戶端:', httpError)
      }

      // 備用：使用 Supabase 客戶端
      const clientPromise = supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', user.id)
        .single()

      const { data: existingRole, error: selectError } = await withTimeout(clientPromise, 3000)

      if (selectError && selectError.code !== 'PGRST116') {
        throw new Error(`查詢用戶角色失敗: ${selectError.message}`)
      }

      if (existingRole) {
        console.log(`App.vue ensureUserRole: 用戶 ${user.email} 角色記錄已存在 (${existingRole.role})`)
        return true
      }

      // 記錄不存在，嘗試創建
      console.log(`App.vue ensureUserRole: 為用戶 ${user.email} 創建角色記錄`)
      
      const userData = {
        user_id: user.id,
        email: user.email,
        role: 'participant',
        display_name: user.user_metadata?.display_name || 
                     user.user_metadata?.name || 
                     user.email.split('@')[0],
        created_at: new Date().toISOString()
      }

      const insertPromise = supabase
        .from('user_roles')
        .insert(userData)

      const { error: insertError } = await withTimeout(insertPromise, 3000)

      if (insertError) {
        // 如果是重複鍵錯誤，可能是併發創建，檢查是否已存在
        if (insertError.code === '23505') {
          console.log(`App.vue ensureUserRole: 檢測到重複鍵，重新檢查用戶 ${user.email} 的記錄`)
          continue // 重試循環
        }
        throw new Error(`創建用戶角色失敗: ${insertError.message}`)
      }

      console.log(`App.vue ensureUserRole: 成功為用戶 ${user.email} 創建角色記錄`)
      return true

    } catch (error) {
      console.error(`App.vue ensureUserRole: 第 ${attempt} 次嘗試失敗:`, error)
      
      if (attempt === maxRetries) {
        console.error(`App.vue ensureUserRole: 為用戶 ${user.email} 創建角色記錄失敗，已達最大重試次數`, error)
        return false
      }
      
      // 等待一段時間後重試
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  return false
}

onMounted(async () => {
  // 檢查 URL 是否包含錯誤參數
  const urlParams = new URLSearchParams(window.location.search)
  
  // 處理 hash 參數 - 注意可能包含路由路徑
  let hashString = window.location.hash.substring(1) // 移除 #
  let hashParams = null
  
  // 檢查 hash 是否是路由格式 (以 / 開頭) 還是參數格式
  if (hashString.startsWith('/')) {
    // 如果是路由格式，檢查是否包含 ? 查詢參數
    const routeAndQuery = hashString.split('?')
    if (routeAndQuery.length > 1) {
      hashParams = new URLSearchParams(routeAndQuery[1])
    } else {
      hashParams = new URLSearchParams()
    }
  } else {
    // 如果不是路由格式，直接解析為參數
    hashParams = new URLSearchParams(hashString)
  }
  
  console.log('App.vue URL 分析:', {
    search: window.location.search,
    hash: window.location.hash,
    hashString: hashString,
    hashStartsWithSlash: hashString.startsWith('/'),
    urlParamsKeys: Array.from(urlParams.keys()),
    hashParamsKeys: Array.from(hashParams.keys())
  })
  
  // 檢查錯誤參數
  const error = urlParams.get('error') || hashParams.get('error')
  const errorCode = urlParams.get('error_code') || hashParams.get('error_code')
  const errorDescription = urlParams.get('error_description') || hashParams.get('error_description')
  
  if (error) {
    console.log('檢測到驗證錯誤:', { error, errorCode, errorDescription })
    
    let errorMessage = '驗證失敗'
    if (errorCode === 'otp_expired') {
      errorMessage = '驗證連結已過期，請重新註冊'
    } else if (error === 'access_denied') {
      errorMessage = '驗證連結無效或已過期'
    } else {
      errorMessage = decodeURIComponent(errorDescription || '驗證過程中發生錯誤')
    }
    
    // 重定向到驗證頁面並顯示錯誤
    router.replace('/verify-email?error=' + encodeURIComponent(errorMessage))
    return
  }
  
  // 檢查是否是 email 驗證回調
  const accessToken = urlParams.get('access_token') || hashParams.get('access_token')
  const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token')
  const type = urlParams.get('type') || hashParams.get('type')
  
  console.log('App.vue 檢查驗證參數:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type })
  
  if (accessToken && refreshToken && type === 'signup') {
    console.log('檢測到註冊驗證回調，處理驗證...')
    
    try {
      // 設定 session
      try {
        console.log('🔄 App.vue 使用 HTTP API 設定 session...')
        const result = await httpSetSession(accessToken, refreshToken)
        
        if (result.success && result.data) {
          console.log('✅ App.vue HTTP API 設定 session 成功')
          
          // 確保用戶在 user_roles 表中有記錄
          await ensureUserRoleInApp(result.data)
          
          // 重定向到驗證成功頁面
          router.replace('/verify-email?verified=true')
          return
        }
      } catch (httpError) {
        console.warn('App.vue HTTP API 設定 session 失敗，使用 Supabase 客戶端:', httpError)
        
        // 客戶端 fallback with timeout
        const clientPromise = supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        
        const { data, error } = await withTimeout(clientPromise, 3000)
        
        if (error) throw error
        
        if (data.user) {
          console.log('用戶驗證成功，重定向到驗證頁面')
          
          // 確保用戶在 user_roles 表中有記錄（使用強化版函數）
          await ensureUserRoleInApp(data.user)
          
          // 重定向到驗證成功頁面
          router.replace('/verify-email?verified=true')
          return
        }
      }
    } catch (error) {
      console.error('處理註冊驗證回調失敗:', error)
      router.replace('/verify-email?error=' + encodeURIComponent(error.message))
      return
    }
  }
  
  // 檢查是否是重設密碼驗證回調
  if (accessToken && refreshToken && type === 'recovery') {
    console.log('檢測到重設密碼驗證回調，重定向到重設密碼頁面...')
    
    // 將 token 作為 URL 參數傳遞給重設密碼頁面
    const resetUrl = `/reset-password?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&type=recovery`
    router.replace(resetUrl)
    return
  }
  
  // 檢查是否有 token 但沒有 type（處理舊格式的重設密碼連結）
  const token = urlParams.get('token') || hashParams.get('token')
  const tokenType = urlParams.get('type') || hashParams.get('type')
  
  if (token && tokenType === 'recovery') {
    console.log('檢測到舊格式的重設密碼連結，重定向到重設密碼頁面...')
    
    // 將 token 作為 URL 參數傳遞給重設密碼頁面
    const resetUrl = `/reset-password?token=${encodeURIComponent(token)}&type=recovery`
    router.replace(resetUrl)
    return
  }
  
  // 如果不是驗證回調，正常初始化
  setupAuthListener()
  
  // 延遲執行 checkAuth，避免與 setupAuthListener 競爭
  setTimeout(async () => {
    await checkAuth()
  }, 100)
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
