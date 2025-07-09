-- 檢查 draw_status 表狀態
-- 在 Supabase SQL Editor 中執行

-- 1. 檢查 draw_status 表是否存在且有資料
SELECT 
  'draw_status 表檢查' as check_type,
  COUNT(*) as record_count,
  CASE WHEN COUNT(*) > 0 THEN '有資料' ELSE '無資料' END as status
FROM draw_status;

-- 2. 查看 draw_status 表內容
SELECT * FROM draw_status;

-- 3. 檢查表結構
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'draw_status' 
ORDER BY ordinal_position;

-- 4. 如果 draw_status 表沒有資料，插入預設記錄
INSERT INTO draw_status (status, total_participants, total_balls) 
SELECT 'waiting', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM draw_status);

-- 5. 再次檢查結果
SELECT 
  'draw_status 初始化後' as check_type,
  COUNT(*) as record_count,
  status,
  total_participants,
  total_balls,
  current_winner,
  last_draw_time
FROM draw_status
GROUP BY status, total_participants, total_balls, current_winner, last_draw_time;
