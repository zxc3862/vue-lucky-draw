-- 🔒 重新設定正確的 RLS 政策
-- 在 Supabase SQL Editor 中執行此腳本

-- 重新啟用 RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_status ENABLE ROW LEVEL SECURITY;

-- 清除舊的政策（如果存在）
DROP POLICY IF EXISTS "players_public_read" ON players;
DROP POLICY IF EXISTS "players_authenticated_write" ON players;
DROP POLICY IF EXISTS "draw_status_public_read" ON draw_status;
DROP POLICY IF EXISTS "draw_status_admin_write" ON draw_status;
DROP POLICY IF EXISTS "draw_history_public_read" ON draw_history;
DROP POLICY IF EXISTS "draw_history_admin_write" ON draw_history;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON user_roles;
DROP POLICY IF EXISTS "user_participations_authenticated" ON user_participations;

-- 1. players 表：允許匿名讀取，認證用戶寫入
CREATE POLICY "players_public_read" ON players
  FOR SELECT USING (true);

CREATE POLICY "players_authenticated_write" ON players
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 2. draw_status 表：允許匿名讀取，管理員寫入
CREATE POLICY "draw_status_public_read" ON draw_status
  FOR SELECT USING (true);

CREATE POLICY "draw_status_admin_write" ON draw_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. draw_history 表：允許匿名讀取，管理員寫入
CREATE POLICY "draw_history_public_read" ON draw_history
  FOR SELECT USING (true);

CREATE POLICY "draw_history_admin_write" ON draw_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. user_roles 表：僅管理員可管理
CREATE POLICY "user_roles_admin_manage" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- 5. user_participations 表：認證用戶可管理自己的記錄
CREATE POLICY "user_participations_authenticated" ON user_participations
  FOR ALL USING (auth.uid() = user_id);

-- 確認 RLS 狀態
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '🔒 RLS 啟用' ELSE '🔓 RLS 關閉' END as status
FROM pg_tables 
WHERE tablename IN ('players', 'user_roles', 'user_participations', 'draw_history', 'draw_status')
  AND schemaname = 'public';

-- 確認政策數量
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('players', 'user_roles', 'user_participations', 'draw_history', 'draw_status')
GROUP BY tablename;

SELECT '✅ RLS 政策已重新設定完成！' as result;
