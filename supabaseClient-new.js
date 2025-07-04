import { createClient } from '@supabase/supabase-js'

// 從環境變數中讀取 Supabase URL 和 Key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

// 檢查變數是否已設定
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase 環境變數未設定，請創建 .env 文件並設定：')
  console.warn('VITE_SUPABASE_URL=your-supabase-url')
  console.warn('VITE_SUPABASE_ANON_KEY=your-anon-key')
  console.warn('📝 參考 .env.example 文件來設定正確的環境變數')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
