-- 修復重置功能的 RLS 權限問題
-- 在 Supabase SQL Editor 中執行

-- 1. 檢查當前 RLS 政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('players', 'draw_history', 'draw_status', 'user_roles')
ORDER BY tablename, policyname;

-- 2. 為 draw_status 表添加管理員完全權限政策（如果不存在）
DROP POLICY IF EXISTS "Allow admin full access draw_status" ON draw_status;
CREATE POLICY "Allow admin full access draw_status" ON draw_status 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. 為 draw_history 表添加管理員刪除權限政策（如果不存在）
DROP POLICY IF EXISTS "Allow admin delete draw_history" ON draw_history;
CREATE POLICY "Allow admin delete draw_history" ON draw_history 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 4. 確保 players 表的管理員權限涵蓋更新和刪除
DROP POLICY IF EXISTS "Allow admin modify players" ON players;
CREATE POLICY "Allow admin modify players" ON players 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. 確保 draw_status 有預設記錄
INSERT INTO draw_status (status, total_participants, total_balls) 
SELECT 'waiting', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM draw_status);

-- 6. 檢查修復結果
SELECT 
  'Policy check' as check_type,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('players', 'draw_history', 'draw_status') 
  AND policyname LIKE '%admin%';

SELECT 
  'draw_status check' as check_type,
  COUNT(*) as record_count
FROM draw_status;
