CREATE TABLE trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) DEFAULT 'MES',
  contract VARCHAR(20),
  direction VARCHAR(10) NOT NULL,
  entry_price DECIMAL(10,2),
  exit_price DECIMAL(10,2),
  pnl_points DECIMAL(10,2),
  pnl_dollars DECIMAL(10,2),
  quantity INT DEFAULT 1,
  entry_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  strategy VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
