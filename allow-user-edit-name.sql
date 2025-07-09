-- 完全關閉所有 RLS (Row Level Security) 政策
-- 在 Supabase SQL Editor 中執行

-- 1. 關閉所有表的 RLS
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_participations DISABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE draw_status DISABLE ROW LEVEL SECURITY;

-- 2. 刪除 players 表的所有政策
DROP POLICY IF EXISTS "Allow public read players" ON players;
DROP POLICY IF EXISTS "Allow admin modify players" ON players;
DROP POLICY IF EXISTS "Users can update own display_name" ON players;

-- 3. 刪除 user_roles 表的所有政策
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Allow admin manage roles" ON user_roles;

-- 4. 刪除 user_participations 表的所有政策
DROP POLICY IF EXISTS "Users can view own participation" ON user_participations;
DROP POLICY IF EXISTS "Allow admin manage participations" ON user_participations;
DROP POLICY IF EXISTS "Users can manage own participation" ON user_participations;

-- 5. 刪除 draw_history 表的所有政策
DROP POLICY IF EXISTS "Allow public read history" ON draw_history;
DROP POLICY IF EXISTS "Allow admin insert history" ON draw_history;
DROP POLICY IF EXISTS "Allow admin delete draw_history" ON draw_history;

-- 6. 刪除 draw_status 表的所有政策
DROP POLICY IF EXISTS "Allow public read status" ON draw_status;
DROP POLICY IF EXISTS "Allow admin modify status" ON draw_status;
DROP POLICY IF EXISTS "Allow admin full access draw_status" ON draw_status;

-- 7. 檢查 RLS 狀態（應該都是 false）
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE tablename IN ('players', 'user_roles', 'user_participations', 'draw_history', 'draw_status')
ORDER BY tablename;

-- 8. 檢查剩餘的政策（應該是空的）
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE tablename IN ('players', 'user_roles', 'user_participations', 'draw_history', 'draw_status')
ORDER BY tablename, policyname;

-- 9. 確保 display_name 欄位存在
ALTER TABLE players ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 10. 為現有玩家設定 display_name
UPDATE players 
SET display_name = name 
WHERE display_name IS NULL OR display_name = '';

-- 11. 確保 draw_status 有預設記錄
INSERT INTO draw_status (status, total_participants, total_balls) 
SELECT 'waiting', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM draw_status);

-- 12. 驗證結果
SELECT '✅ 所有 RLS 政策已完全關閉，資料庫現在完全開放存取' as result;
