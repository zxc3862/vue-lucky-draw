-- 🚨 臨時修復：關閉 RLS 以測試連線
-- ⚠️ 注意：這會暫時關閉安全保護，僅用於測試
-- 在 Supabase SQL Editor 中執行此腳本

-- 臨時關閉所有表的 RLS
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_participations DISABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE draw_status DISABLE ROW LEVEL SECURITY;

-- 確認 RLS 狀態
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '🔒 RLS 啟用' ELSE '🔓 RLS 關閉' END as status
FROM pg_tables 
WHERE tablename IN ('players', 'user_roles', 'user_participations', 'draw_history', 'draw_status')
  AND schemaname = 'public';

-- 顯示提示
SELECT '⚠️ RLS 已關閉，請測試前端連線。測試完成後記得重新啟用！' as notice;
