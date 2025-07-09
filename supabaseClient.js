import { createClient } from '@supabase/supabase-js'

// 直接使用正確的 Supabase URL 和 Key
const supabaseUrl = 'https://qzffahnlwvxgfovmrjia.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZmZhaG5sd3Z4Z2Zvdm1yamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MjkxNTUsImV4cCI6MjA2NzEwNTE1NX0.1VmdnGXMd4EuDfO22OvJkzXgSopva-ZMka84T8OBrU8'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,   // 啟用自動刷新（可維持30天）
    persistSession: false,    // 禁用自動持久化（保持手動管理）
    detectSessionInUrl: false, // 禁用 URL 中的 session 檢測
    storage: {
      // 提供自定義的 storage 接口，完全隔離 localStorage 操作
      getItem: (key) => {
        console.log('🔍 Supabase storage.getItem 被調用:', key)
        return null // 總是返回 null，讓 Supabase 認為沒有 session
      },
      setItem: (key, value) => {
        console.log('🔍 Supabase storage.setItem 被調用:', key, value?.substring(0, 50) + '...')
        // 不做任何事情，防止 Supabase 自動管理 localStorage
      },
      removeItem: (key) => {
        console.log('🔍 Supabase storage.removeItem 被調用:', key)
        // 不做任何事情，防止 Supabase 清除 localStorage
      }
    },
    // 禁用所有自動 session 檢查
    flowType: 'implicit'
  }
})
