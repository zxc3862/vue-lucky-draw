import { createClient } from '@supabase/supabase-js'

// 從環境變數中讀取 Supabase URL 和 Key
// 請確認您的專案是 Vite 還是 Vue CLI，選擇正確的寫法
// 如果是 Vite 專案 (根據 Vercel 偵測到 Vite，這很有可能)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 如果您是舊的 Vue CLI 專案，則使用 process.env
// const supabaseUrl = process.env.VUE_APP_SUPABASE_URL;
// const supabaseKey = process.env.VUE_APP_SUPABASE_ANON_KEY;

// 檢查變數是否已設定 (在本地開發時很有用，Vercel 上會自動設定)
if (!supabaseUrl || !supabaseKey) {
  // 這行可以幫助您在本地開發時，如果環境變數沒設好，會報錯
  console.error('Supabase URL or Key is not set in environment variables!');
  // 或者直接拋出錯誤停止應用
  // throw new Error('Supabase environment variables are missing.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);