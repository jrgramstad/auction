-- Auction events table
CREATE TABLE IF NOT EXISTS auctions (
  id SERIAL PRIMARY KEY,
  auction_month TEXT NOT NULL UNIQUE, -- 'December 2025'
  auction_date DATE,
  budget_total NUMERIC DEFAULT 1000000,
  budget_allocated NUMERIC DEFAULT 0,
  budget_spent NUMERIC DEFAULT 0,
  properties_imported INTEGER DEFAULT 0,
  properties_excluded INTEGER DEFAULT 0,
  properties_analyzed INTEGER DEFAULT 0,
  properties_bid INTEGER DEFAULT 0,
  properties_won INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planning', -- planning/active/complete
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Main auction properties table
CREATE TABLE IF NOT EXISTS auction_properties (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,

  -- Source identifiers
  roddy_id TEXT,
  auction_com_id TEXT,

  -- Property location
  address TEXT NOT NULL,
  city TEXT,
  county TEXT,
  state TEXT DEFAULT 'TX',
  zip TEXT,

  -- Property details
  property_type TEXT,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  sqft INTEGER,
  year_built INTEGER,
  lot_size NUMERIC,
  subdivision TEXT,

  -- Financial data
  assessed_value NUMERIC,
  starting_bid NUMERIC,
  realtor_value NUMERIC,
  last_sold_date DATE,
  last_sold_price NUMERIC,

  -- Exclusion checks
  has_pool BOOLEAN DEFAULT FALSE,
  pool_roddy TEXT, -- N/P/blank from Roddy
  pool_satellite TEXT, -- Y/N/Unknown
  pool_realtor TEXT, -- Y/N/Unknown
  has_solar BOOLEAN DEFAULT FALSE,
  is_excluded BOOLEAN DEFAULT FALSE,
  exclusion_reason TEXT,

  -- Scoring
  auto_score NUMERIC(3,1), -- 0.0 to 10.0
  manual_score INTEGER, -- 1-10 from Christian
  jr_grade INTEGER, -- 1-10 final grade
  city_tier INTEGER, -- 1/2/3/penalty

  -- Stage 1 fields (Jessica)
  stage_1_complete BOOLEAN DEFAULT FALSE,
  stage_1_completed_by TEXT,
  stage_1_completed_at TIMESTAMP,
  on_auction_site TEXT, -- YES/NO/REMOVED
  stage_1_notes TEXT,

  -- Stage 2 fields (Kalen)
  stage_2_complete BOOLEAN DEFAULT FALSE,
  stage_2_completed_by TEXT,
  stage_2_completed_at TIMESTAMP,
  stage_2_notes TEXT,

  -- Stage 3 fields (Christian)
  stage_3_complete BOOLEAN DEFAULT FALSE,
  stage_3_completed_by TEXT,
  stage_3_completed_at TIMESTAMP,
  photo_condition TEXT, -- Excellent/Good/Fair/Poor
  renovation_notes TEXT,

  -- Stage 4 fields (JR)
  stage_4_complete BOOLEAN DEFAULT FALSE,
  stage_4_completed_at TIMESTAMP,
  title_status TEXT, -- Clean/Minor Issues/Major Issues
  title_issues TEXT,
  max_bid_formula NUMERIC, -- calculated by formula
  feel_adjustment NUMERIC DEFAULT 0,
  final_max_bid NUMERIC,
  priority_level INTEGER, -- 1=never drop, 2=protect, 3=normal, 4=drop first

  -- Stage 5 results (Jessica post-auction)
  stage_5_complete BOOLEAN DEFAULT FALSE,
  stage_5_completed_at TIMESTAMP,
  opening_bid_actual NUMERIC,
  our_bid_placed NUMERIC,
  winning_bid NUMERIC,
  outcome TEXT, -- WON/LOST/NO_BID/OUT_OF_FUNDS/CANCELED
  equity_percent NUMERIC,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_properties_auction_id ON auction_properties(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_properties_city ON auction_properties(city);
CREATE INDEX IF NOT EXISTS idx_auction_properties_auto_score ON auction_properties(auto_score DESC);
CREATE INDEX IF NOT EXISTS idx_auction_properties_is_excluded ON auction_properties(is_excluded);
CREATE INDEX IF NOT EXISTS idx_auction_properties_stage_status ON auction_properties(
  stage_1_complete, stage_2_complete, stage_3_complete, stage_4_complete
);

-- Enable Row Level Security (RLS)
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_properties ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anonymous access (since we're using password protection in the app)
CREATE POLICY "Allow anonymous access to auctions" ON auctions
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access to auction_properties" ON auction_properties
  FOR ALL USING (true);
