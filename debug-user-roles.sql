-- 檢查 user_roles 表的結構和數據
SELECT 'user_roles 表結構' as info;
\d user_roles;

SELECT 'user_roles 表數據' as info;
SELECT * FROM user_roles ORDER BY created_at DESC LIMIT 10;

SELECT 'auth.users 表數據（最近5個用戶）' as info;
SELECT id, email, email_confirmed_at, created_at, raw_user_meta_data 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 檢查是否有用戶在 auth.users 但不在 user_roles
SELECT 'auth.users 中存在但 user_roles 中不存在的用戶' as info;
SELECT u.id, u.email, u.email_confirmed_at, u.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ORDER BY u.created_at DESC;
