-- 🔍 檢查資料庫是否已初始化
-- 在 Supabase SQL Editor 中執行此腳本來檢查狀態

-- 檢查所有必要的表格是否存在
SELECT 
  'players' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') 
       THEN '✅ 存在' ELSE '❌ 不存在' END as status
UNION ALL
SELECT 
  'user_roles' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') 
       THEN '✅ 存在' ELSE '❌ 不存在' END as status
UNION ALL
SELECT 
  'user_participations' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_participations') 
       THEN '✅ 存在' ELSE '❌ 不存在' END as status
UNION ALL
SELECT 
  'draw_history' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'draw_history') 
       THEN '✅ 存在' ELSE '❌ 不存在' END as status
UNION ALL
SELECT 
  'draw_status' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'draw_status') 
       THEN '✅ 存在' ELSE '❌ 不存在' END as status;

-- 檢查測試資料
SELECT '測試資料檢查' as check_type, COUNT(*) as player_count FROM players;
