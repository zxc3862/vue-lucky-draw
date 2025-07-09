-- 🔧 Supabase Authentication 快速設定檢查
-- 在 Supabase SQL Editor 中執行此腳本

-- 檢查 auth.users 表是否可訪問
SELECT 
  'auth.users 表狀態' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') 
    THEN '✅ 可訪問' 
    ELSE '❌ 無法訪問' 
  END as status;

-- 檢查現有用戶數量
SELECT 
  ' 現有用戶數' as check_item,
  COUNT(*)::text as status
FROM auth.users;

-- 檢查 RLS 政策
SELECT 
  'user_roles RLS' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles') 
    THEN '✅ 政策已設定' 
    ELSE '❌ 無政策' 
  END as status;

-- 顯示建議的下一步
SELECT '💡 如果註冊失敗，請檢查 Authentication > Settings > Site URL' as suggestion;
