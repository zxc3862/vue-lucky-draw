-- 關閉所有 RLS (Row Level Security) 
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 關閉所有表的 RLS
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_participations DISABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE draw_status DISABLE ROW LEVEL SECURITY;

-- 2. 刪除所有相關的 RLS 政策
DROP POLICY IF EXISTS "Allow public read players" ON players;
DROP POLICY IF EXISTS "Allow admin modify players" ON players;
DROP POLICY IF EXISTS "Allow admin full access draw_status" ON draw_status;
DROP POLICY IF EXISTS "Allow admin delete draw_history" ON draw_history;
DROP POLICY IF EXISTS "Allow user read own role" ON user_roles;
DROP POLICY IF EXISTS "Allow admin manage roles" ON user_roles;
DROP POLICY IF EXISTS "Allow user manage own participation" ON user_participations;
DROP POLICY IF EXISTS "Allow admin manage all participations" ON user_participations;
DROP POLICY IF EXISTS "Allow public read draw_history" ON draw_history;
DROP POLICY IF EXISTS "Allow admin insert draw_history" ON draw_history;

-- 3. 檢查 RLS 狀態
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('players', 'user_roles', 'user_participations', 'draw_history', 'draw_status')
ORDER BY tablename;

-- 4. 檢查是否還有剩餘的政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('players', 'user_roles', 'user_participations', 'draw_history', 'draw_status')
ORDER BY tablename, policyname;

-- 5. 確保 draw_status 有預設記錄
INSERT INTO draw_status (status, total_participants, total_balls) 
SELECT 'waiting', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM draw_status);

-- 6. 驗證結果
SELECT '✅ RLS 已關閉，所有操作現在應該可以正常進行' as result;
