-- 檢查所有系統資料
-- 在 Supabase SQL Editor 中執行

-- 1. 檢查玩家資料
SELECT 
  'players' as table_name,
  COUNT(*) as record_count,
  SUM(balls) as total_balls,
  AVG(balls) as avg_balls
FROM players;

-- 2. 玩家詳細資料
SELECT 
  id,
  name,
  balls,
  is_participating,
  created_at
FROM players
ORDER BY name;

-- 3. 檢查抽球歷史
SELECT 
  'draw_history' as table_name,
  COUNT(*) as record_count
FROM draw_history;

-- 4. 最近的抽球記錄
SELECT 
  winner_name,
  balls_before,
  draw_time
FROM draw_history
ORDER BY draw_time DESC
LIMIT 5;

-- 5. 檢查用戶角色
SELECT 
  'user_roles' as table_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN role = 'participant' THEN 1 END) as participant_count
FROM user_roles;

-- 6. 管理員用戶詳情
SELECT 
  email,
  role,
  created_at
FROM user_roles
WHERE role = 'admin'
ORDER BY created_at;
