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

-- 2. 建立抽獎歷史表 (可選)
CREATE TABLE IF NOT EXISTS draw_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  winner_id UUID REFERENCES players(id) ON DELETE CASCADE,
  winner_name TEXT NOT NULL,
  balls_before INTEGER NOT NULL,
  draw_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 插入測試資料
INSERT INTO players (name, balls) VALUES 
('張三', 3),
('李四', 2),
('王五', 5),
('趙六', 1),
('小明', 4),
('小美', 2)
ON CONFLICT (name) DO NOTHING;

-- 4. 設置 Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history ENABLE ROW LEVEL SECURITY;

-- 5. 設置安全政策

-- 玩家表：所有人可讀取，只有認證用戶可修改
DROP POLICY IF EXISTS "Allow public read players" ON players;
CREATE POLICY "Allow public read players" ON players 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated modify players" ON players;
CREATE POLICY "Allow authenticated modify players" ON players 
FOR ALL USING (auth.role() = 'authenticated');

-- 抽獎歷史：所有人可讀取，只有認證用戶可插入
DROP POLICY IF EXISTS "Allow public read history" ON draw_history;
CREATE POLICY "Allow public read history" ON draw_history 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert history" ON draw_history;
CREATE POLICY "Allow authenticated insert history" ON draw_history 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. 建立更新時間觸發器
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

-- 7. 建立統計視圖 (可選)
CREATE OR REPLACE VIEW player_stats AS
SELECT 
    COUNT(*) as total_players,
    SUM(balls) as total_balls,
    AVG(balls) as avg_balls,
    MAX(balls) as max_balls,
    MIN(balls) as min_balls
FROM players;

-- 完成！您的資料庫已準備就緒
