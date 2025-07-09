-- 🔧 透過 SQL 檢查和設定 Authentication 配置
-- 在 Supabase SQL Editor 中執行此腳本

-- 檢查當前 auth 配置
SELECT 
  'Auth 配置檢查' as info,
  'ready' as status;

-- 如果您想檢查當前的 auth 設定表（如果存在）
-- 注意：有些設定可能在 auth.config 或系統表中
SELECT 
  'auth schema 檢查' as check_type,
  schema_name
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- 檢查 auth 相關表格
SELECT 
  'auth 表格列表' as check_type,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'auth'
ORDER BY table_name;

-- 重要提示
SELECT '⚠️ Email confirmation 主要透過 Dashboard UI 設定' as note
UNION ALL
SELECT '📍 前往 Authentication > Settings > Email confirmations' as instruction
UNION ALL
SELECT '🔧 取消勾選 "Enable email confirmations"' as action;
