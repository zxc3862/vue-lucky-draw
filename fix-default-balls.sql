-- 修改玩家預設球數為 0 球
-- 在 Supabase SQL Editor 中執行

-- 1. 修改 players 表的預設球數
ALTER TABLE players ALTER COLUMN balls SET DEFAULT 0;

-- 2. 檢查目前的表結構
SELECT 
  column_name, 
  column_default,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'players' 
  AND column_name = 'balls';

-- 3. 驗證結果
SELECT '✅ 玩家預設球數已修改為 0' as result;
