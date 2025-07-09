-- 🔧 修復 RLS 無限遞迴問題
-- 在 Supabase SQL Editor 中執行此腳本

-- 首先完全關閉所有 RLS
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_participations DISABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE draw_status DISABLE ROW LEVEL SECURITY;

-- 清除所有政策
DROP POLICY IF EXISTS "players_public_read" ON players;
DROP POLICY IF EXISTS "players_authenticated_write" ON players;
DROP POLICY IF EXISTS "draw_status_public_read" ON draw_status;
DROP POLICY IF EXISTS "draw_status_admin_write" ON draw_status;
DROP POLICY IF EXISTS "draw_history_public_read" ON draw_history;
DROP POLICY IF EXISTS "draw_history_admin_write" ON draw_history;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON user_roles;
DROP POLICY IF EXISTS "user_participations_authenticated" ON user_participations;

-- 重新啟用 RLS，但先設定簡單的政策
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history ENABLE ROW LEVEL SECURITY;

-- 1. players 表：允許所有人讀取和寫入（先簡化）
CREATE POLICY "players_allow_all" ON players
  FOR ALL USING (true);

-- 2. draw_status 表：允許所有人讀取和寫入（先簡化）
CREATE POLICY "draw_status_allow_all" ON draw_status
  FOR ALL USING (true);

-- 3. draw_history 表：允許所有人讀取和寫入（先簡化）
CREATE POLICY "draw_history_allow_all" ON draw_history
  FOR ALL USING (true);

-- user_roles 和 user_participations 暫時不啟用 RLS
-- 這樣可以避免遞迴問題

-- 確認狀態
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '🔒 RLS 啟用' ELSE '🔓 RLS 關閉' END as status
FROM pg_tables 
WHERE tablename IN ('players', 'user_roles', 'user_participations', 'draw_history', 'draw_status')
  AND schemaname = 'public';

SELECT '✅ RLS 遞迴問題已修復！所有基本表格現在可以正常訪問。' as result;
