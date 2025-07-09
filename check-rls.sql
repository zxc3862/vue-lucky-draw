-- 🔧 檢查 RLS 政策狀態
-- 在 Supabase SQL Editor 中執行此腳本

-- 檢查各表的 RLS 狀態
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '🔒 RLS 已啟用' ELSE '🔓 RLS 未啟用' END as status
FROM pg_tables 
WHERE tablename IN ('players', 'user_roles', 'user_participations', 'draw_history', 'draw_status')
  AND schemaname = 'public';

-- 檢查政策數量
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('players', 'user_roles', 'user_participations', 'draw_history', 'draw_status')
GROUP BY tablename;

-- 測試匿名訪問 players 表
SELECT 'players 匿名訪問測試' as test_type;
SELECT COUNT(*) as accessible_count FROM players;

-- 測試匿名訪問 draw_status 表
SELECT 'draw_status 匿名訪問測試' as test_type;
SELECT COUNT(*) as accessible_count FROM draw_status;
