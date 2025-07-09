-- 🔑 設定管理員帳號
-- 在 Supabase SQL Editor 中執行此腳本

-- 設定剛註冊的用戶為管理員
INSERT INTO user_roles (user_id, email, role) 
VALUES (
  '43e458f6-0b03-4539-86e9-08fcea134dd6',
  (SELECT email FROM auth.users WHERE id = '43e458f6-0b03-4539-86e9-08fcea134dd6'),
  'admin'
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  email = EXCLUDED.email;

-- 確認管理員設定
SELECT 
  ur.user_id,
  ur.email,
  ur.role,
  au.email as auth_email,
  ur.created_at
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.user_id = '43e458f6-0b03-4539-86e9-08fcea134dd6';

-- 檢查所有用戶角色
SELECT 
  'total_users' as type,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'admin_users' as type,
  COUNT(*) as count
FROM user_roles 
WHERE role = 'admin';

SELECT '✅ 管理員帳號設定完成！' as result;
