-- 🔑 設定新用戶為管理員
-- 步驟 1: 先查看剛註冊的用戶
SELECT 
  id,
  email,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 步驟 2: 複製最新用戶的 ID，替換下面的 'USER_ID_HERE'
-- 設定剛註冊的用戶為管理員
INSERT INTO user_roles (user_id, email, role) 
VALUES (
  'USER_ID_HERE', -- 請替換為實際的用戶 ID
  (SELECT email FROM auth.users WHERE id = 'USER_ID_HERE'),
  'admin'
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  email = EXCLUDED.email;

-- 步驟 3: 確認管理員設定
SELECT 
  ur.user_id,
  ur.email,
  ur.role,
  au.email as auth_email,
  ur.created_at
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role = 'admin';

SELECT '✅ 管理員帳號設定完成！' as result;
