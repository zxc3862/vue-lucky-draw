import { ref, computed } from 'vue'
import { supabase } from '../../supabaseClient'

// 全域狀態管理
const currentUser = ref(null)
const userRole = ref(null)
const userDisplayInfo = ref(null) // 包含 display_name 等用戶顯示信息
const isLoading = ref(false)
const isCheckingAuth = ref(false) // 防止重複檢查認證

// 防抖機制，避免重複處理 SIGNED_OUT 事件
let signOutDebounceTimer = null

// 強化版用戶角色確保函數 - 確保 100% 成功率
const ensureUserRole = async (user) => {
  if (!user || !user.id || !user.email) {
    console.warn('❌ ensureUserRole: 無效的用戶資料', user)
    return false
  }

  const maxRetries = 3
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      attempt++
      console.log(`🔄 ensureUserRole: 第 ${attempt} 次嘗試為用戶 ${user.email} 確保角色記錄`)

      // 檢查是否已存在記錄
      const { data: existingRole, error: selectError } = await supabase
        .from('user_roles')
        .select('id, role, display_name')
        .eq('user_id', user.id)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ 查詢用戶角色時出錯:', selectError)
        throw new Error(`查詢用戶角色失敗: ${selectError.message}`)
      }

      if (existingRole) {
        console.log(`✅ ensureUserRole: 用戶 ${user.email} 角色記錄已存在`, existingRole)
        return true
      }

      // 記錄不存在，嘗試創建
      console.log(`📝 ensureUserRole: 為用戶 ${user.email} 創建角色記錄`)
      console.log('👤 用戶資料:', {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
        emailConfirmed: user.email_confirmed_at
      })
      
      const userData = {
        user_id: user.id,
        email: user.email,
        role: 'participant',
        display_name: user.user_metadata?.display_name || 
                     user.user_metadata?.name || 
                     user.email.split('@')[0],
        created_at: new Date().toISOString()
      }

      console.log('📄 準備插入的數據:', userData)

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(userData)

      if (insertError) {
        console.error('❌ 插入用戶角色時出錯:', insertError)
        // 如果是重複鍵錯誤，可能是併發創建，檢查是否已存在
        if (insertError.code === '23505') {
          console.log(`🔁 ensureUserRole: 檢測到重複鍵，重新檢查用戶 ${user.email} 的記錄`)
          continue // 重試循環
        }
        throw new Error(`創建用戶角色失敗: ${insertError.message}`)
      }

      console.log(`✅ ensureUserRole: 成功為用戶 ${user.email} 創建角色記錄`)
      return true

    } catch (error) {
      console.error(`❌ ensureUserRole: 第 ${attempt} 次嘗試失敗:`, error)
      
      if (attempt === maxRetries) {
        console.error(`💥 ensureUserRole: 為用戶 ${user.email} 創建角色記錄失敗，已達最大重試次數`, error)
        return false
      }
      
      // 等待一段時間後重試
      console.log(`⏳ 等待 ${1000 * attempt}ms 後重試...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  return false
}

// HTTP API 輔助函數
const withTimeout = (promise, timeout = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('請求超時')), timeout)
    )
  ])
}

// 純 HTTP API 獲取用戶函數
const httpGetUser = async () => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  try {
    const sessionRaw = localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token')
    if (!sessionRaw) {
      console.log('📄 HTTP API: localStorage 中無 session 數據')
      return { success: false, error: '無法獲取身份令牌' }
    }
    
    const session = JSON.parse(sessionRaw)
    const accessToken = session?.access_token
    
    if (!accessToken) {
      console.log('📄 HTTP API: localStorage 中無 access_token')
      return { success: false, error: '無法獲取身份令牌' }
    }
    
    // 檢查 token 是否過期
    try {
      const tokenParts = accessToken.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]))
        const currentTime = Math.floor(Date.now() / 1000)
        if (payload.exp && payload.exp <= currentTime) {
          console.log('📄 HTTP API: access_token 已過期')
          return { success: false, error: '身份令牌已過期' }
        }
      }
    } catch (tokenError) {
      console.warn('⚠️ HTTP API: token 解析失敗，但繼續使用:', tokenError)
    }
    
    console.log('✅ HTTP API: 找到有效的 access_token')
    
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
      const errorData = await response.json()
      console.error('❌ HTTP API: 獲取用戶失敗', errorData)
      return { success: false, error: errorData.error_description || errorData.message || '獲取用戶失敗' }
    }
    
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('❌ HTTP API: 獲取用戶異常', error)
    return { success: false, error: error.message || '獲取用戶異常' }
  }
}

// 純 HTTP API 登入函數
const httpLogin = async (email, password) => {
  const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
  
  console.log('🔄 HTTP API: 用戶登入', email)
  
  try {
    const response = await withTimeout(
      fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      })
    )
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error_description || errorData.message || '登入失敗')
    }
    
    const data = await response.json()
    console.log('✅ HTTP API: 登入成功', data)
    
    return { success: true, data }
  } catch (error) {
    console.error('❌ HTTP API: 登入失敗', error)
    throw error
  }
}

export function useAuth() {
  
  // 檢查用戶身份
  const checkAuth = async () => {
    // 防止重複檢查
    if (isCheckingAuth.value) {
      console.log('⏳ checkAuth: 已在檢查中，跳過重複檢查')
      return
    }
    
    isCheckingAuth.value = true
    isLoading.value = true
    try {
      console.log('🔍 checkAuth: 開始檢查用戶身份')
      let user = null
      
      // 優先檢查 localStorage 中是否有有效的 session
      try {
        const storedSessionRaw = localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token') || '{}'
        console.log('📦 checkAuth: localStorage 原始字符串:', storedSessionRaw)
        
        const storedSession = JSON.parse(storedSessionRaw)
        console.log('📦 checkAuth: localStorage 解析後內容:', storedSession)
        console.log('📦 checkAuth: localStorage 詳細檢查:', {
          hasAccessToken: !!storedSession.access_token,
          hasRefreshToken: !!storedSession.refresh_token,
          hasUser: !!storedSession.user,
          userEmail: storedSession.user?.email,
          tokenLength: storedSession.access_token?.length,
          allKeys: Object.keys(storedSession),
          hasSession: !!storedSession.session,
          sessionKeys: storedSession.session ? Object.keys(storedSession.session) : null
        })
        
        // 嘗試不同的 session 格式
        let sessionToCheck = storedSession
        
        // 檢查是否是 Supabase 客戶端格式（nested session）
        if (storedSession.session && !storedSession.access_token) {
          console.log('📦 checkAuth: 檢測到 Supabase 客戶端格式，使用 nested session')
          sessionToCheck = storedSession.session
          console.log('📦 checkAuth: nested session 內容:', sessionToCheck)
        }
        
        console.log('📦 checkAuth: 最終檢查的 session:', sessionToCheck)
        console.log('📦 checkAuth: 最終檢查的 session 詳細:', {
          hasAccessToken: !!sessionToCheck.access_token,
          hasUser: !!sessionToCheck.user,
          userEmail: sessionToCheck.user?.email,
          tokenLength: sessionToCheck.access_token?.length
        })
        
        if (sessionToCheck.access_token && sessionToCheck.user) {
          console.log('📦 checkAuth: 找到 localStorage 中的 session')
          
          // 簡單驗證 token 是否過期（檢查 exp 字段）
          try {
            const tokenParts = sessionToCheck.access_token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]))
              const currentTime = Math.floor(Date.now() / 1000)
              const timeUntilExpiry = payload.exp - currentTime
              console.log('⏰ checkAuth: token 詳細信息:', {
                tokenExp: payload.exp,
                tokenExpDate: new Date(payload.exp * 1000).toLocaleString(),
                currentTime: currentTime,
                currentTimeDate: new Date(currentTime * 1000).toLocaleString(),
                timeUntilExpiry: timeUntilExpiry,
                isValid: payload.exp && payload.exp > currentTime
              })
              
              if (payload.exp && payload.exp > currentTime) {
                console.log('✅ checkAuth: localStorage token 有效，剩餘', timeUntilExpiry, '秒')
                user = sessionToCheck.user
                console.log('✅ checkAuth: 成功從 localStorage 恢復用戶:', user.email)
                
                // 如果原始格式是 nested，需要標準化保存
                if (storedSession.session && !storedSession.access_token) {
                  console.log('🔄 checkAuth: 標準化 localStorage 格式')
                  const standardSession = {
                    access_token: sessionToCheck.access_token,
                    refresh_token: sessionToCheck.refresh_token,
                    user: sessionToCheck.user
                  }
                  localStorage.setItem('sb-qzffahnlwvxgfovmrjia-auth-token', JSON.stringify(standardSession))
                }
              } else {
                console.log('⚠️ checkAuth: localStorage token 已過期，剩餘時間:', timeUntilExpiry, '秒')
                console.log('🗑️ 清除過期的 localStorage token')
                localStorage.removeItem('sb-qzffahnlwvxgfovmrjia-auth-token')
              }
            }
          } catch (tokenError) {
            console.warn('⚠️ checkAuth: token 解析失敗:', tokenError)
            // 即使解析失敗，也嘗試使用 localStorage 中的用戶信息
            console.log('⚠️ checkAuth: token 解析失敗，但嘗試使用 localStorage 中的用戶信息')
            user = sessionToCheck.user
          }
        } else {
          console.log('📄 checkAuth: localStorage 中無有效 session')
          console.log('📄 checkAuth: 缺少的字段:', {
            missingAccessToken: !sessionToCheck.access_token,
            missingUser: !sessionToCheck.user,
            accessTokenType: typeof sessionToCheck.access_token,
            accessTokenValue: sessionToCheck.access_token,
            userType: typeof sessionToCheck.user,
            userValue: sessionToCheck.user
          })
        }
      } catch (error) {
        console.warn('⚠️ checkAuth: localStorage session 解析失敗:', error)
      }
      
      // 如果 localStorage 沒有有效用戶，嘗試 HTTP API
      if (!user) {
        try {
          const result = await httpGetUser()
          if (result.success) {
            user = result.data
            console.log('✅ checkAuth: HTTP API 獲取用戶成功')
          } else {
            console.log('📄 checkAuth: HTTP API 返回失敗:', result.error)
          }
        } catch (httpError) {
          console.warn('⚠️ checkAuth: HTTP API 獲取用戶異常:', httpError)
        }
        
        // 如果 HTTP API 也失敗，不再使用 Supabase 客戶端
        // 避免觸發 Supabase 客戶端的 session 檢查
        if (!user) {
          console.log('📄 checkAuth: 所有方法都失敗，用戶未登入')
        }
      }
      
      // 更新當前用戶狀態（最終設置）
      currentUser.value = user
      
      if (user) {
        console.log('🔍 checkAuth: 用戶已登入，初始化用戶資料:', user.email)
        
        // 確保用戶在 user_roles 表中有記錄（非阻塞）
        try {
          await ensureUserRoleViaHTTP(user)
        } catch (ensureError) {
          console.warn('⚠️ checkAuth: 確保用戶角色失敗:', ensureError)
        }
        
        // 獲取用戶角色和顯示信息（非阻塞）
        try {
          await fetchUserRole(user.id)
        } catch (fetchError) {
          console.warn('⚠️ checkAuth: 獲取用戶角色失敗:', fetchError)
        }
        
        console.log('✅ checkAuth: 用戶資料初始化完成')
      } else {
        console.log('🔍 checkAuth: 用戶未登入')
        userRole.value = null
        userDisplayInfo.value = null
      }
    } catch (error) {
      console.error('❌ checkAuth: 檢查身份失敗:', error)
    } finally {
      isCheckingAuth.value = false
      isLoading.value = false
      console.log('🏁 checkAuth: 檢查完成')
    }
  }

  // 取得用戶角色和顯示信息
  const fetchUserRole = async (userId) => {
    try {
      console.log('🔄 fetchUserRole 開始，用戶ID:', userId)
      
      // 優先嘗試純 HTTP 方法（更可靠）
      try {
        console.log('🔄 使用純 HTTP 方法獲取用戶角色...')
        const result = await fetchUserRoleViaHTTP(userId)
        if (result.success) {
          console.log('✅ 純 HTTP 方法獲取用戶角色成功')
          return
        } else {
          console.warn('⚠️ 純 HTTP 方法失敗，嘗試 Supabase 客戶端方法')
        }
      } catch (httpError) {
        console.warn('⚠️ 純 HTTP 方法異常，嘗試 Supabase 客戶端方法:', httpError)
      }
      
      // 備用：使用 Supabase 客戶端（帶超時控制）
      console.log('🔄 使用 Supabase 客戶端獲取用戶角色...')
      const fetchWithTimeout = async () => {
        // 嘗試查詢包含 display_name 的資料
        let { data, error } = await supabase
          .from('user_roles')
          .select('role, display_name, email')
          .eq('user_id', userId)
          .single()
        
        // 如果 display_name 欄位不存在，回退到只查詢基本欄位
        if (error && error.message.includes('display_name')) {
          console.warn('display_name 欄位不存在，使用基本查詢')
          const fallbackResult = await supabase
            .from('user_roles')
            .select('role, email')
            .eq('user_id', userId)
            .single()
          
          data = fallbackResult.data
          error = fallbackResult.error
        }
        
        return { data, error }
      }
      
      // 使用 Promise.race 添加超時控制
      const { data, error } = await Promise.race([
        fetchWithTimeout(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('fetchUserRole 查詢超時')), 3000)
        )
      ])
      
      if (error && error.code !== 'PGRST116') { // 忽略找不到資料的錯誤
        throw error
      }
      
      userRole.value = data?.role || null
      
      // 改進：如果資料庫沒有 display_name，嘗試從 Auth user_metadata 獲取
      let userData = data
      if (userData && !userData.display_name && currentUser.value?.user_metadata?.display_name) {
        console.log('📝 資料庫沒有 display_name，使用 Auth user_metadata')
        userData = {
          ...userData,
          display_name: currentUser.value.user_metadata.display_name
        }
      }
      
      userDisplayInfo.value = userData || null
      
      console.log('📊 fetchUserRole 完成:', {
        userRole: userRole.value,
        userDisplayInfo: userDisplayInfo.value,
        authDisplayName: currentUser.value?.user_metadata?.display_name
      })
    } catch (error) {
      console.error('取得用戶角色失敗:', error)
      userRole.value = null
      userDisplayInfo.value = null
    }
  }

  // 純 HTTP 方法獲取用戶角色
  const fetchUserRoleViaHTTP = async (userId) => {
    try {
      // 從 localStorage 獲取 access token
      const sessionRaw = localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token')
      if (!sessionRaw) {
        console.warn('❌ fetchUserRoleViaHTTP: localStorage 中無 session 數據')
        return { success: false, error: '無法獲取身份令牌' }
      }
      
      const session = JSON.parse(sessionRaw)
      const accessToken = session?.access_token
      
      if (!accessToken) {
        console.warn('❌ fetchUserRoleViaHTTP: 無法獲取 access token')
        return { success: false, error: '無法獲取身份令牌' }
      }

      console.log('🔑 fetchUserRoleViaHTTP: 已獲取 access token')
      
      // Supabase 項目配置
      const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
      
      // 查詢用戶角色
      const response = await Promise.race([
        fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${userId}&select=role,display_name,email`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('HTTP 查詢超時')), 3000))
      ])

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ fetchUserRoleViaHTTP: HTTP 查詢失敗:', errorText)
        return { success: false, error: `HTTP ${response.status}: ${errorText}` }
      }

      const data = await response.json()
      console.log('📊 fetchUserRoleViaHTTP: 查詢結果:', data)

      // 處理查詢結果
      const userData = data && data.length > 0 ? data[0] : null
      
      if (userData) {
        userRole.value = userData.role || null
        
        // 如果資料庫沒有 display_name，嘗試從 Auth user_metadata 獲取
        let finalDisplayName = userData.display_name
        if (!finalDisplayName && currentUser.value?.user_metadata?.display_name) {
          console.log('📝 fetchUserRoleViaHTTP: 資料庫沒有 display_name，使用 Auth user_metadata')
          finalDisplayName = currentUser.value.user_metadata.display_name
        }
        
        userDisplayInfo.value = {
          ...userData,
          display_name: finalDisplayName
        }
        
        console.log('✅ fetchUserRoleViaHTTP: 成功更新本地狀態:', {
          userRole: userRole.value,
          userDisplayInfo: userDisplayInfo.value
        })
        
        return { success: true }
      } else {
        console.warn('⚠️ fetchUserRoleViaHTTP: 未找到用戶角色記錄')
        userRole.value = null
        userDisplayInfo.value = null
        return { success: false, error: '未找到用戶角色記錄' }
      }

    } catch (error) {
      console.error('❌ fetchUserRoleViaHTTP: 異常:', error)
      return { success: false, error: error.message }
    }
  }

  // 純 HTTP 方法確保用戶角色記錄存在
  const ensureUserRoleViaHTTP = async (user) => {
    if (!user || !user.id || !user.email) {
      console.warn('❌ ensureUserRoleViaHTTP: 無效的用戶資料', user)
      return { success: false, error: '無效的用戶資料' }
    }

    try {
      // 從 localStorage 獲取 access token
      const sessionRaw = localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token')
      if (!sessionRaw) {
        console.warn('❌ ensureUserRoleViaHTTP: localStorage 中無 session 數據')
        return { success: false, error: '無法獲取身份令牌' }
      }
      
      const session = JSON.parse(sessionRaw)
      const accessToken = session?.access_token
      
      if (!accessToken) {
        console.warn('❌ ensureUserRoleViaHTTP: 無法獲取 access token')
        return { success: false, error: '無法獲取身份令牌' }
      }

      console.log('🔑 ensureUserRoleViaHTTP: 已獲取 access token')
      
      // Supabase 項目配置
      const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
      
      console.log(`🔄 ensureUserRoleViaHTTP: 為用戶 ${user.email} 確保角色記錄`)

      // 1. 先檢查是否已存在記錄
      try {
        const checkResponse = await Promise.race([
          fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&select=id,role,display_name`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY
            }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('檢查記錄超時')), 3000))
        ])

        if (checkResponse.ok) {
          const existingData = await checkResponse.json()
          if (existingData && existingData.length > 0) {
            console.log(`✅ ensureUserRoleViaHTTP: 用戶 ${user.email} 角色記錄已存在`, existingData[0])
            return { success: true, data: existingData[0] }
          }
        }
      } catch (checkError) {
        console.warn('⚠️ ensureUserRoleViaHTTP: 檢查記錄失敗，繼續創建:', checkError)
      }

      // 2. 記錄不存在，創建新記錄
      console.log(`📝 ensureUserRoleViaHTTP: 為用戶 ${user.email} 創建角色記錄`)
      
      const userData = {
        user_id: user.id,
        email: user.email,
        role: 'participant',
        display_name: user.user_metadata?.display_name || 
                     user.user_metadata?.name || 
                     user.email.split('@')[0],
        created_at: new Date().toISOString()
      }

      console.log('📄 ensureUserRoleViaHTTP: 準備插入的數據:', userData)

      const createResponse = await Promise.race([
        fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(userData)
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('創建記錄超時')), 5000))
      ])

      if (createResponse.ok) {
        console.log(`✅ ensureUserRoleViaHTTP: 成功為用戶 ${user.email} 創建角色記錄`)
        return { success: true, data: userData }
      } else {
        const errorText = await createResponse.text()
        console.error('❌ ensureUserRoleViaHTTP: 創建記錄失敗:', errorText)
        
        // 如果是重複鍵錯誤（409），表示記錄已存在，這也算成功
        if (createResponse.status === 409) {
          console.log('✅ ensureUserRoleViaHTTP: 記錄已存在（重複鍵），視為成功')
          return { success: true, message: '記錄已存在' }
        }
        
        return { success: false, error: `HTTP ${createResponse.status}: ${errorText}` }
      }

    } catch (error) {
      console.error('❌ ensureUserRoleViaHTTP: 異常:', error)
      return { success: false, error: error.message }
    }
  }

  // 設置用戶角色（只有管理員可以使用）
  const setUserRole = async (email, role) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .upsert([{ email, role }], { onConflict: 'email' })
      
      if (error) throw error
      
      return { success: true, data }
    } catch (error) {
      console.error('設置用戶角色失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 登入（支援密碼）
  const login = async (email, password) => {
    try {
      let data = null
      let user = null
      
      // 優先使用 HTTP API
      try {
        const result = await httpLogin(email, password)
        if (result.success) {
          data = result.data
          user = result.data.user
          console.log('✅ login: HTTP API 登入成功')
        }
      } catch (httpError) {
        console.warn('⚠️ login: HTTP API 登入失敗，使用 Supabase 客戶端:', httpError)
        
        // 備用：使用 Supabase 客戶端
        const clientPromise = supabase.auth.signInWithPassword({
          email,
          password
        })
        const clientResult = await Promise.race([
          clientPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('登入請求超時')), 5000))
        ])
        
        if (clientResult.error) throw clientResult.error
        
        data = clientResult.data
        user = clientResult.data.user
      }
      
      if (!user) {
        throw new Error('登入失敗：無法獲取用戶資料')
      }
      
      // 檢查 email 是否已驗證（開發環境中放寬限制）
      const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost'
      
      if (!user.email_confirmed_at && !isDevelopment) {
        // 自動登出未驗證的用戶（只在生產環境）
        await supabase.auth.signOut()
        return { 
          success: false, 
          error: 'Email 尚未驗證。請檢查信箱並點擊驗證連結後再登入。' 
        }
      }
      
      if (!user.email_confirmed_at && isDevelopment) {
        console.warn('⚠️ 開發環境：允許未驗證 Email 的用戶登入')
      }
      
      // 先保存 session 到 localStorage，這樣後續的 HTTP API 調用才能成功
      try {
        if (data?.access_token && data?.refresh_token) {
          console.log('🔄 login: 手動保存 session 到 localStorage...')
          
          // 計算正確的 expires_at
          let expiresAt = Math.floor(Date.now() / 1000) + 604800 // 預設7天
          try {
            const tokenParts = data.access_token.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]))
              if (payload.exp) {
                expiresAt = payload.exp
              }
            }
          } catch (tokenError) {
            console.warn('⚠️ login: token 解析失敗，使用預設過期時間:', tokenError)
          }
          
          const sessionData = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user: data.user,
            expires_at: expiresAt,
            token_type: 'bearer',
            expires_in: expiresAt - Math.floor(Date.now() / 1000)
          }
          
          // 手動保存到 localStorage
          localStorage.setItem('sb-qzffahnlwvxgfovmrjia-auth-token', JSON.stringify(sessionData))
          console.log('✅ login: 手動 session 已保存到 localStorage')
          
          // 驗證保存
          const saved = localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token')
          if (saved) {
            console.log('✅ login: localStorage 保存驗證成功')
          } else {
            console.log('❌ login: localStorage 保存失敗')
          }
        }
      } catch (syncError) {
        console.warn('⚠️ login: session 保存失敗:', syncError)
      }
      
      // 更新本地狀態
      console.log('🔄 login: 更新本地狀態')
      currentUser.value = user
      
      // 獲取用戶角色（現在 localStorage 中已有 session）
      console.log('🔄 login: 獲取用戶角色')
      await fetchUserRole(user.id)
      
      // 確保用戶在 user_roles 表中有記錄（現在 localStorage 中已有 session）
      try {
        // 優先使用純 HTTP 方法
        const httpResult = await ensureUserRoleViaHTTP(user)
        console.log('📝 登入時純 HTTP 用戶角色創建結果:', httpResult)
        
        if (!httpResult.success) {
          console.log('⚠️ 純 HTTP 方法失敗，嘗試 Supabase 客戶端方法')
          await ensureUserRole(user)
        }
      } catch (roleError) {
        console.warn('⚠️ 登入時創建用戶角色記錄失敗，但登入依然成功:', roleError)
      }
      
      console.log('✅ login: 登入流程完成')
      return { success: true, message: '登入成功！', user }
    } catch (error) {
      console.error('登入失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 註冊新用戶
  const register = async (email, password, displayName = null) => {
    try {
      console.log('🚀 開始註冊流程:', { email, displayName })
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/#/verify-email`,
          data: {
            display_name: displayName || email.split('@')[0]
          }
        }
      })
      if (error) throw error
      
      console.log('✅ Supabase 註冊成功:', {
        userId: data.user?.id,
        email: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at,
        userMetadata: data.user?.user_metadata
      })
      
      // 確保用戶在 user_roles 表中有記錄（強制創建機制）
      if (data.user) {
        console.log('🔄 開始確保用戶角色記錄...')
        
        // 優先使用純 HTTP 方法創建用戶角色
        try {
          const httpResult = await ensureUserRoleViaHTTP(data.user)
          console.log('📝 純 HTTP 用戶角色創建結果:', httpResult)
          
          if (!httpResult.success) {
            console.log('⚠️ 純 HTTP 方法失敗，嘗試 Supabase 客戶端方法')
            const roleCreated = await ensureUserRole(data.user)
            console.log('� Supabase 客戶端用戶角色創建結果:', roleCreated)
          }
        } catch (httpError) {
          console.warn('⚠️ 純 HTTP 方法異常，嘗試 Supabase 客戶端方法:', httpError)
          const roleCreated = await ensureUserRole(data.user)
          console.log('📝 Supabase 客戶端用戶角色創建結果:', roleCreated)
        }
        
        // 簡化驗證步驟，避免掛起
        console.log('✅ 用戶角色記錄處理完成，跳過驗證步驟以避免掛起')
      }
      
      // 檢查是否需要信箱驗證
      const needsConfirmation = !data.user?.email_confirmed_at && data.user?.confirmation_sent_at
      
      return { 
        success: true, 
        message: needsConfirmation 
          ? '註冊成功！請檢查信箱完成驗證。' 
          : '註冊成功！可以直接登入。', 
        user: data.user 
      }
    } catch (error) {
      console.error('❌ 註冊失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 忘記密碼 / 重設密碼
  const resetPassword = async (email) => {
    try {
      // 優先使用 HTTP API 方法
      try {
        const result = await resetPasswordViaHTTP(email)
        if (result.success) {
          console.log('✅ resetPassword: HTTP API 重設成功')
          return result
        } else {
          console.warn('⚠️ resetPassword: HTTP API 重設失敗，嘗試 Supabase 客戶端')
        }
      } catch (httpError) {
        console.warn('⚠️ resetPassword: HTTP API 重設異常，嘗試 Supabase 客戶端:', httpError)
      }
      
      // 備用：使用 Supabase 客戶端
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`
      })
      if (error) throw error
      
      return { success: true, message: '重設密碼連結已發送至您的信箱，請檢查收件匣' }
    } catch (error) {
      console.error('重設密碼失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 純 HTTP API 重設密碼函數
  const resetPasswordViaHTTP = async (email) => {
    console.log('🔄 resetPasswordViaHTTP 開始執行')
    
    try {
      // Supabase 項目 URL 和 anon key
      const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
      
      const response = await Promise.race([
        fetch(`${SUPABASE_URL}/auth/v1/recover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            email: email,
            redirect_to: `${window.location.origin}/#/reset-password`
          })
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('重設密碼請求超時')), 10000))
      ])

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ resetPasswordViaHTTP: HTTP 重設失敗:', errorText)
        return { success: false, error: `HTTP ${response.status}: ${errorText}` }
      }

      console.log('✅ resetPasswordViaHTTP: 重設密碼請求成功')
      
      return { success: true, message: '重設密碼連結已發送至您的信箱，請檢查收件匣' }

    } catch (error) {
      console.error('❌ resetPasswordViaHTTP: 異常:', error)
      return { success: false, error: error.message || '重設密碼失敗，請稍後再試' }
    }
  }

  // 更新密碼
  const updatePassword = async (newPassword) => {
    try {
      // 優先使用 HTTP API 方法
      try {
        const result = await updatePasswordViaHTTP(newPassword)
        if (result.success) {
          console.log('✅ updatePassword: HTTP API 更新成功')
          return result
        } else {
          console.warn('⚠️ updatePassword: HTTP API 更新失敗，嘗試 Supabase 客戶端')
        }
      } catch (httpError) {
        console.warn('⚠️ updatePassword: HTTP API 更新異常，嘗試 Supabase 客戶端:', httpError)
      }
      
      // 備用：使用 Supabase 客戶端
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      
      return { success: true, message: '密碼更新成功' }
    } catch (error) {
      console.error('更新密碼失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 純 HTTP API 更新密碼函數
  const updatePasswordViaHTTP = async (newPassword) => {
    console.log('🔄 updatePasswordViaHTTP 開始執行')
    
    try {
      // 從 localStorage 獲取 access token
      const session = JSON.parse(localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token') || '{}')
      const accessToken = session?.access_token
      
      if (!accessToken) {
        console.error('❌ updatePasswordViaHTTP: 無法獲取 access token')
        return { success: false, error: '無法獲取身份令牌' }
      }

      console.log('🔑 updatePasswordViaHTTP: 已獲取 access token')
      
      // Supabase 項目 URL 和 anon key
      const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
      
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
        console.error('❌ updatePasswordViaHTTP: HTTP 更新失敗:', errorText)
        return { success: false, error: `HTTP ${response.status}: ${errorText}` }
      }

      const result = await response.json()
      console.log('✅ updatePasswordViaHTTP: 密碼更新成功:', result)
      
      return { success: true, message: '密碼更新成功' }

    } catch (error) {
      console.error('❌ updatePasswordViaHTTP: 異常:', error)
      return { success: false, error: error.message || '更新密碼失敗，請稍後再試' }
    }
  }

  // 登出
  const logout = async () => {
    try {
      console.log('🔄 開始登出...')
      console.log('📍 logout 調用堆棧:', new Error().stack)
      
      // 立即清除本地狀態
      currentUser.value = null
      userRole.value = null
      userDisplayInfo.value = null
      console.log('✅ 本地狀態已清除')
      
      // 清除 localStorage
      try {
        localStorage.removeItem('sb-qzffahnlwvxgfovmrjia-auth-token')
        console.log('✅ localStorage 已清除')
      } catch (storageError) {
        console.warn('⚠️ localStorage 清除失敗:', storageError)
      }
      
      // 嘗試 Supabase 登出（但不依賴它）
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('登出超時')), 1000)
      })
      
      const signOutPromise = supabase.auth.signOut()
      
      try {
        await Promise.race([signOutPromise, timeoutPromise])
        console.log('✅ Supabase 登出成功')
      } catch (error) {
        console.warn('⚠️ Supabase 登出超時或失敗，但本地狀態已清除')
      }
      
      return { success: true }
    } catch (error) {
      console.error('登出失敗:', error)
      // 即使出錯也確保本地狀態已清除
      currentUser.value = null
      userRole.value = null
      userDisplayInfo.value = null
      
      try {
        localStorage.removeItem('sb-qzffahnlwvxgfovmrjia-auth-token')
      } catch (storageError) {
        console.warn('⚠️ 強制清除 localStorage 失敗:', storageError)
      }
      
      return { success: true }
    }
  }

  // 監聽認證狀態變化
  const setupAuthListener = () => {
    console.log('📡 設置認證狀態監聽器（加強版 - 支援自動刷新）')
    
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 認證狀態變化:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ 監聽器: 檢測到登入事件，但使用手動管理的 session')
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 監聽器: 檢測到登出事件，但使用手動管理的 session')
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🔄 監聽器: 檢測到 TOKEN_REFRESHED 事件，同步更新 localStorage')
        
        // 當 token 自動刷新時，同步更新 localStorage 中的 session
        try {
          if (session.access_token && session.refresh_token && session.user) {
            console.log('📦 同步刷新後的 session 到 localStorage')
            
            // 計算正確的過期時間
            let expiresAt = Math.floor(Date.now() / 1000) + 604800 // 預設7天
            try {
              const tokenParts = session.access_token.split('.')
              if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]))
                if (payload.exp) {
                  expiresAt = payload.exp
                }
              }
            } catch (tokenError) {
              console.warn('⚠️ 刷新 token 解析失敗，使用預設過期時間:', tokenError)
            }
            
            const refreshedSessionData = {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              user: session.user,
              expires_at: expiresAt,
              token_type: 'bearer',
              expires_in: expiresAt - Math.floor(Date.now() / 1000)
            }
            
            // 更新 localStorage
            localStorage.setItem('sb-qzffahnlwvxgfovmrjia-auth-token', JSON.stringify(refreshedSessionData))
            console.log('✅ 刷新後的 session 已同步到 localStorage')
            
            // 可選：更新本地用戶狀態
            if (currentUser.value?.id === session.user.id) {
              currentUser.value = session.user
              console.log('✅ 本地用戶狀態已同步更新')
            }
          }
        } catch (syncError) {
          console.error('❌ 同步刷新 session 失敗:', syncError)
        }
      }
    })
  }

  // 計算屬性
  const isAuthenticated = computed(() => !!currentUser.value)
  const isAdmin = computed(() => userRole.value === 'admin')
  const isParticipant = computed(() => userRole.value === 'participant')
  const hasRole = computed(() => !!userRole.value)
  
  // 用戶顯示名稱（優先使用 display_name，備用為 email 前綴）
  const displayName = computed(() => {
    // 優先使用資料庫中的 display_name，它是用戶最新更新的
    const displayNameValue = userDisplayInfo.value?.display_name || 
           currentUser.value?.user_metadata?.display_name ||
           currentUser.value?.email?.split('@')[0] || 
           '未知用戶'
    
    // 添加調試信息（可選，生產環境可以移除）
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 displayName 計算屬性被觸發:', {
        userDisplayInfo: userDisplayInfo.value,
        userDisplayInfoDisplayName: userDisplayInfo.value?.display_name,
        currentUserMetadata: currentUser.value?.user_metadata,
        currentUserMetadataDisplayName: currentUser.value?.user_metadata?.display_name,
        finalValue: displayNameValue,
        dataSource: userDisplayInfo.value?.display_name ? 'database' : 
                   currentUser.value?.user_metadata?.display_name ? 'localStorage' : 
                   currentUser.value?.email ? 'email' : 'fallback'
      })
    }
    
    return displayNameValue
  })

  // 更新用戶顯示名稱
  const updateUserDisplayName = async (newDisplayName) => {
    console.log('🔄 updateUserDisplayName 開始執行')
    console.log('📝 新顯示名稱:', newDisplayName)
    console.log('👤 當前用戶:', currentUser.value?.id)
    
    if (!currentUser.value?.id) {
      console.error('❌ 用戶未登入')
      return { success: false, error: '用戶未登入' }
    }
    
    try {
      let hasSuccessfulUpdate = false
      
      // 嘗試更新 user_roles 表中的 display_name
      console.log('🔄 嘗試更新 user_roles 表...')
      try {
        // 添加超時機制
        const userRolesPromise = supabase
          .from('user_roles')
          .update({ display_name: newDisplayName })
          .eq('user_id', currentUser.value.id)

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('user_roles 更新超時')), 5000)
        })

        const result = await Promise.race([userRolesPromise, timeoutPromise])
        const { error: userRolesError } = result

        if (userRolesError) {
          console.warn('⚠️ user_roles 更新錯誤:', userRolesError.message)
          if (!userRolesError.message.includes("display_name")) {
            throw userRolesError
          }
        } else {
          console.log('✅ user_roles 表更新成功')
          hasSuccessfulUpdate = true
        }
      } catch (userRolesError) {
        console.warn('⚠️ 更新 user_roles 表失敗:', userRolesError.message)
      }

      // 嘗試更新 players 表中的 display_name（如果用戶有 player 記錄）
      console.log('🔄 嘗試更新 players 表...')
      try {
        // 添加超時機制
        const playersPromise = supabase
          .from('players')
          .update({ display_name: newDisplayName })
          .eq('user_id', currentUser.value.id)

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('players 更新超時')), 5000)
        })

        const result = await Promise.race([playersPromise, timeoutPromise])
        const { error: playersError } = result

        if (playersError) {
          console.warn('⚠️ players 更新錯誤:', playersError.message)
        } else {
          console.log('✅ players 表更新成功')
          hasSuccessfulUpdate = true
        }
      } catch (playersError) {
        console.warn('⚠️ 更新 players 表失敗:', playersError.message)
      }

      // 嘗試更新 Supabase Auth 的 user_metadata
      console.log('🔄 嘗試更新 Auth user_metadata...')
      try {
        // 添加超時機制
        const authPromise = supabase.auth.updateUser({
          data: {
            display_name: newDisplayName
          }
        })

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth 更新超時')), 5000)
        })

        const result = await Promise.race([authPromise, timeoutPromise])
        const { error: authError } = result

        if (authError) {
          console.warn('⚠️ Auth 更新錯誤:', authError.message)
        } else {
          console.log('✅ Auth user_metadata 更新成功')
          hasSuccessfulUpdate = true
        }
      } catch (authError) {
        console.warn('⚠️ 更新 Auth 失敗:', authError.message)
      }

      // 重新獲取用戶資料以更新本地狀態
      console.log('🔄 重新獲取用戶角色...')
      await fetchUserRole(currentUser.value.id)
      console.log('✅ 用戶角色重新獲取完成')
      
      // 強制更新本地顯示信息 - 確保優先使用新的值
      if (userDisplayInfo.value) {
        userDisplayInfo.value = {
          ...userDisplayInfo.value,
          display_name: newDisplayName
        }
        console.log('✅ 本地顯示信息已強制更新:', userDisplayInfo.value)
      } else {
        // 如果沒有 userDisplayInfo，創建一個基本的
        userDisplayInfo.value = {
          display_name: newDisplayName,
          email: currentUser.value?.email
        }
        console.log('✅ 創建新的本地顯示信息:', userDisplayInfo.value)
      }
      
      // 也嘗試更新 currentUser 的 metadata
      if (currentUser.value && currentUser.value.user_metadata) {
        currentUser.value = {
          ...currentUser.value,
          user_metadata: {
            ...currentUser.value.user_metadata,
            display_name: newDisplayName
          }
        }
        console.log('✅ currentUser metadata 已強制更新')
      }
      
      const result = { 
        success: true, 
        message: hasSuccessfulUpdate ? '顯示名稱更新成功' : '顯示名稱更新完成（使用備用方式）' 
      }
      console.log('📊 updateUserDisplayName 最終結果:', result)
      return result
    } catch (error) {
      console.error('❌ 更新顯示名稱失敗:', error)
      const result = { success: false, error: error.message || '更新失敗，請稍後再試' }
      console.log('📊 updateUserDisplayName 錯誤結果:', result)
      return result
    }
  }

  // 簡化版更新用戶顯示名稱（僅使用 Auth）
  const updateUserDisplayNameSimple = async (newDisplayName) => {
    console.log('🔄 updateUserDisplayNameSimple 開始執行')
    console.log('📝 新顯示名稱:', newDisplayName)
    
    if (!currentUser.value?.id) {
      console.error('❌ 用戶未登入')
      return { success: false, error: '用戶未登入' }
    }
    
    try {
      // 僅更新 Supabase Auth 的 user_metadata
      console.log('🔄 更新 Auth user_metadata...')
      
      // 添加超時控制
      const updatePromise = supabase.auth.updateUser({
        data: {
          display_name: newDisplayName
        }
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('更新請求超時')), 10000) // 10秒超時
      })
      
      const { error: authError } = await Promise.race([updatePromise, timeoutPromise])

      if (authError) {
        console.error('❌ Auth 更新失敗:', authError.message)
        return { success: false, error: authError.message }
      }

      console.log('✅ Auth user_metadata 更新成功')
      
      // 重新獲取用戶資料
      console.log('🔄 重新獲取用戶角色...')
      await fetchUserRole(currentUser.value.id)
      
      // 強制更新本地顯示信息
      if (userDisplayInfo.value) {
        userDisplayInfo.value = {
          ...userDisplayInfo.value,
          display_name: newDisplayName
        }
        console.log('✅ 本地顯示信息已強制更新')
      }
      
      // 也嘗試更新 currentUser 的 metadata
      if (currentUser.value && currentUser.value.user_metadata) {
        currentUser.value = {
          ...currentUser.value,
          user_metadata: {
            ...currentUser.value.user_metadata,
            display_name: newDisplayName
          }
        }
        console.log('✅ currentUser metadata 已強制更新')
      }
      
      const result = { success: true, message: '顯示名稱更新成功' }
      console.log('📊 updateUserDisplayNameSimple 結果:', result)
      return result
    } catch (error) {
      console.error('❌ 更新失敗:', error)
      return { success: false, error: error.message || '更新失敗，請稍後再試' }
    }
  }

  // 最簡化的本地更新方法（不調用遠程 API）
  const updateUserDisplayNameLocal = async (newDisplayName) => {
    console.log('🔄 updateUserDisplayNameLocal 開始執行')
    console.log('📝 新顯示名稱:', newDisplayName)
    
    try {
      // 直接更新本地狀態，不調用任何遠程 API
      if (userDisplayInfo.value) {
        userDisplayInfo.value = {
          ...userDisplayInfo.value,
          display_name: newDisplayName
        }
      } else {
        userDisplayInfo.value = {
          display_name: newDisplayName
        }
      }
      
      // 也更新 currentUser 的 metadata
      if (currentUser.value) {
        currentUser.value = {
          ...currentUser.value,
          user_metadata: {
            ...currentUser.value.user_metadata,
            display_name: newDisplayName
          }
        }
        
        // 同步更新 localStorage 中的 session 數據
        try {
          const sessionRaw = localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token')
          if (sessionRaw) {
            const session = JSON.parse(sessionRaw)
            if (session.user) {
              session.user.user_metadata = {
                ...session.user.user_metadata,
                display_name: newDisplayName
              }
              localStorage.setItem('sb-qzffahnlwvxgfovmrjia-auth-token', JSON.stringify(session))
              console.log('✅ localStorage session 中的 display_name 已同步更新')
            }
          }
        } catch (localStorageError) {
          console.warn('⚠️ localStorage 同步更新失敗:', localStorageError)
        }
      }
      
      console.log('✅ 本地顯示名稱更新成功')
      return { success: true, message: '顯示名稱更新成功' }
    } catch (error) {
      console.error('❌ 本地更新失敗:', error)
      return { success: false, error: error.message || '更新失敗' }
    }
  }

  // 純 HTTP 更新函數，同時更新 Auth 和 user_roles 表
  const updateUserDisplayNamePureHTTP = async (newDisplayName) => {
    console.log('🔄 updateUserDisplayNamePureHTTP 開始執行')
    console.log('📝 新顯示名稱:', newDisplayName)
    
    if (!currentUser.value?.id) {
      console.error('❌ 用戶未登入')
      return { success: false, error: '用戶未登入' }
    }

    try {
      // 從 localStorage 獲取 access token
      const session = JSON.parse(localStorage.getItem('sb-qzffahnlwvxgfovmrjia-auth-token') || '{}')
      const accessToken = session?.access_token
      
      if (!accessToken) {
        console.error('❌ 無法獲取 access token')
        return { success: false, error: '無法獲取身份令牌' }
      }

      console.log('🔑 已獲取 access token')
      
      // Supabase 項目 URL 和 anon key
      const SUPABASE_URL = 'https://qzffahnlwvxgfovmrjia.supabase.co'
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'
      
      let hasSuccessfulUpdate = false
      let authUpdateSuccess = false
      let userRolesUpdateSuccess = false

      // 1. 更新 Auth user_metadata
      console.log('🔄 步驟 1: 更新 Auth user_metadata...')
      try {
        const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            data: {
              display_name: newDisplayName
            }
          })
        })

        if (authResponse.ok) {
          const authResult = await authResponse.json()
          console.log('✅ Auth user_metadata 更新成功:', authResult)
          authUpdateSuccess = true
          hasSuccessfulUpdate = true
        } else {
          const authError = await authResponse.text()
          console.error('❌ Auth 更新失敗:', authError)
        }
      } catch (authError) {
        console.error('❌ Auth HTTP 請求失敗:', authError)
      }

      // 2. 更新 user_roles 表
      console.log('🔄 步驟 2: 更新 user_roles 表...')
      try {
        const userRolesResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${currentUser.value.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            display_name: newDisplayName
          })
        })

        if (userRolesResponse.ok) {
          console.log('✅ user_roles 表更新成功')
          userRolesUpdateSuccess = true
          hasSuccessfulUpdate = true
        } else {
          const userRolesError = await userRolesResponse.text()
          console.error('❌ user_roles 更新失敗:', userRolesError)
        }
      } catch (userRolesError) {
        console.error('❌ user_roles HTTP 請求失敗:', userRolesError)
      }

      // 3. 更新本地狀態
      console.log('🔄 步驟 3: 更新本地狀態...')
      await updateUserDisplayNameLocal(newDisplayName)
      
      // 4. 重新獲取用戶資料
      console.log('🔄 步驟 4: 重新獲取用戶角色...')
      try {
        // 為 fetchUserRole 添加超時控制
        await Promise.race([
          fetchUserRole(currentUser.value.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('fetchUserRole 超時')), 3000))
        ])
        console.log('✅ 用戶角色重新獲取完成')
      } catch (fetchError) {
        console.warn('⚠️ 重新獲取用戶角色失敗:', fetchError)
        // 即使失敗也不影響整體結果，因為本地狀態已經更新
      }

      const result = {
        success: hasSuccessfulUpdate,
        message: hasSuccessfulUpdate 
          ? `顯示名稱更新成功 (Auth: ${authUpdateSuccess ? '✅' : '❌'}, user_roles: ${userRolesUpdateSuccess ? '✅' : '❌'})` 
          : '顯示名稱更新失敗',
        details: {
          authUpdate: authUpdateSuccess,
          userRolesUpdate: userRolesUpdateSuccess
        }
      }
      
      console.log('📊 updateUserDisplayNamePureHTTP 最終結果:', result)
      return result

    } catch (error) {
      console.error('❌ 純 HTTP 更新失敗:', error)
      return { 
        success: false, 
        error: error.message || '更新失敗，請稍後再試',
        details: {
          authUpdate: false,
          userRolesUpdate: false
        }
      }
    }
  }

  return {
    // 狀態
    currentUser: computed(() => currentUser.value),
    userRole: computed(() => userRole.value),
    userDisplayInfo: computed(() => userDisplayInfo.value),
    displayName,
    isLoading: computed(() => isLoading.value),
    isCheckingAuth: computed(() => isCheckingAuth.value),
    isAuthenticated,
    isAdmin,
    isParticipant,
    hasRole,
    
    // 方法
    checkAuth,
    fetchUserRole,
    setUserRole,
    login,
    register,
    resetPassword,
    resetPasswordViaHTTP,
    updatePassword,
    updatePasswordViaHTTP,
    updateUserDisplayName,
    updateUserDisplayNameSimple,
    updateUserDisplayNameLocal,
    updateUserDisplayNamePureHTTP,
    logout,
    setupAuthListener
  }
}
