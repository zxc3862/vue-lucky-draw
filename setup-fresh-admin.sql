-- 🔍 查看最新註冊的用戶
-- 在 Supabase SQL Editor 中執行此腳本

-- 步驟 1: 查看所有用戶（按註冊時間排序）
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 步驟 2: 複製最新用戶的 ID，然後執行下面的腳本
-- 請將 'USER_ID_HERE' 替換為實際的用戶 ID

/*
-- 設定管理員權限（請修改 USER_ID_HERE）
INSERT INTO user_roles (user_id, email, role) 
VALUES (
  'USER_ID_HERE',
  (SELECT email FROM auth.users WHERE id = 'USER_ID_HERE'),
  'admin'
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  email = EXCLUDED.email;

-- 確認設定結果
SELECT 
  ur.user_id,
  ur.email,
  ur.role,
  ur.created_at
FROM user_roles ur
WHERE ur.user_id = 'USER_ID_HERE';

SELECT '✅ 新管理員設定完成！' as result;
*/
