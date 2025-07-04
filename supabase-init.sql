-- Vue Lucky Draw 資料庫初始化腳本
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 建立玩家表
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  balls INTEGER DEFAULT 1 CHECK (balls >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 建立用戶角色表
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'participant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- 3. 建立抽球歷史表
CREATE TABLE IF NOT EXISTS draw_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  winner_id UUID REFERENCES players(id) ON DELETE CASCADE,
  winner_name TEXT NOT NULL,
  balls_before INTEGER NOT NULL,
  drawn_by UUID REFERENCES auth.users(id),
  draw_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 建立抽球狀態表 (顯示當前抽球狀況)
CREATE TABLE IF NOT EXISTS draw_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'drawing', 'completed')),
  current_winner TEXT,
  total_participants INTEGER DEFAULT 0,
  total_balls INTEGER DEFAULT 0,
  last_draw_time TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 插入預設抽球狀態
INSERT INTO draw_status (status, total_participants, total_balls) 
VALUES ('waiting', 0, 0)
ON CONFLICT DO NOTHING;

-- 6. 插入測試資料
INSERT INTO players (name, balls) VALUES 
('張三', 3),
('李四', 2),
('王五', 5),
('趙六', 1),
('小明', 4),
('小美', 2)
ON CONFLICT (name) DO NOTHING;

-- 7. 設置 Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_status ENABLE ROW LEVEL SECURITY;

-- 8. 設置安全政策

-- 玩家表：所有人可讀取，只有管理員可修改
DROP POLICY IF EXISTS "Allow public read players" ON players;
CREATE POLICY "Allow public read players" ON players 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin modify players" ON players;
CREATE POLICY "Allow admin modify players" ON players 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 用戶角色表：用戶可查看自己的角色，只有管理員可修改
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
CREATE POLICY "Users can view own role" ON user_roles 
FOR SELECT USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

DROP POLICY IF EXISTS "Allow admin manage roles" ON user_roles;
CREATE POLICY "Allow admin manage roles" ON user_roles 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 抽球歷史：所有人可讀取，只有管理員可插入
DROP POLICY IF EXISTS "Allow public read history" ON draw_history;
CREATE POLICY "Allow public read history" ON draw_history 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin insert history" ON draw_history;
CREATE POLICY "Allow admin insert history" ON draw_history 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 抽球狀態：所有人可讀取，只有管理員可修改
DROP POLICY IF EXISTS "Allow public read status" ON draw_status;
CREATE POLICY "Allow public read status" ON draw_status 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin modify status" ON draw_status;
CREATE POLICY "Allow admin modify status" ON draw_status 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 9. 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at 
    BEFORE UPDATE ON players 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_draw_status_updated_at ON draw_status;
CREATE TRIGGER update_draw_status_updated_at 
    BEFORE UPDATE ON draw_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. 建立統計視圖
CREATE OR REPLACE VIEW player_stats AS
SELECT 
    COUNT(*) as total_players,
    SUM(balls) as total_balls,
    AVG(balls) as avg_balls,
    MAX(balls) as max_balls,
    MIN(balls) as min_balls
FROM players;

-- 11. 建立管理員檢查函數
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 完成！您的資料庫已準備就緒
-- 記得在第一次使用時，將第一個用戶設為管理員：
-- INSERT INTO user_roles (user_id, email, role) VALUES ('用戶UUID', '管理員信箱', 'admin');
