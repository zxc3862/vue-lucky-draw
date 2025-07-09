-- 🔧 詳細的 Authentication 診斷腳本
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查 auth schema 和表格
SELECT 'Auth Schema 檢查' as test_name, 
       CASE WHEN schema_name = 'auth' THEN '✅ Auth schema 存在' ELSE '❌ 無 auth schema' END as result
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- 2. 列出所有 auth 表格
SELECT 'Auth 表格' as test_name, 
       string_agg(table_name, ', ') as result
FROM information_schema.tables 
WHERE table_schema = 'auth';

-- 3. 檢查是否可以查詢 auth.users
SELECT 'Auth Users 訪問' as test_name,
       CASE WHEN COUNT(*) >= 0 THEN '✅ 可以訪問 auth.users' ELSE '❌ 無法訪問' END as result
FROM auth.users;

-- 4. 檢查當前的 authentication 相關設定
-- 注意：某些設定可能在系統表中
SELECT 'Auth 函數檢查' as test_name,
       string_agg(routine_name, ', ') as result
FROM information_schema.routines 
WHERE routine_schema = 'auth' 
AND routine_name LIKE '%sign%';

-- 5. 建議的測試步驟
SELECT '下一步建議' as test_name, unnest(ARRAY[
  '1. 前往 http://localhost:5173/#/auth-test',
  '2. 嘗試測試註冊功能',
  '3. 查看瀏覽器開發者工具的 Network 標籤',
  '4. 檢查具體的 HTTP 錯誤碼',
  '5. 如果是 403/401，可能是 CORS 問題',
  '6. 如果是 500，可能是伺服器設定問題'
]) as result;
