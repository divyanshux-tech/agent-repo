-- Core user record
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- Clerk user ID
  preference_profile JSONB DEFAULT '{}',  -- interests, style, budget tier
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip record
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  source TEXT, destination TEXT,
  travel_date DATE, days INT, travellers INT,
  total_budget_inr INT,
  status TEXT DEFAULT 'planning',
  -- status: planning | review | selected_for_booking | booked | expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Structured requirements from conversation
CREATE TABLE trip_requirements (
  trip_id UUID REFERENCES trips(id) PRIMARY KEY,
  interests TEXT[] DEFAULT '{}',
  constraints JSONB DEFAULT '{}',
  spending_style TEXT DEFAULT 'standard',
  conversation_summary TEXT
);

-- Curated candidates (flights, trains, hotels, activities)
CREATE TABLE trip_candidates (
  id TEXT,                                -- T1, T2, H1, A1 etc.
  trip_id UUID REFERENCES trips(id),
  type TEXT NOT NULL,                     -- FLIGHT | TRAIN | HOTEL | ACTIVITY
  provider TEXT,
  provider_reference TEXT,
  data_json JSONB NOT NULL,
  price_inr INT,
  expires_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,             -- set on replan, not deleted
  PRIMARY KEY (id, trip_id)
);

-- Expense estimates (non-bookable costs)
CREATE TABLE trip_cost_estimates (
  trip_id UUID REFERENCES trips(id) PRIMARY KEY,
  food_estimate_inr INT,
  local_transport_estimate_inr INT,
  estimation_method TEXT,
  profile_level TEXT,                     -- budget | standard | premium
  confidence TEXT                         -- low | medium | high
);

-- Optimizer output plans
CREATE TABLE trip_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  travel_candidate_id TEXT,
  hotel_candidate_id TEXT,
  activity_candidate_ids TEXT[],
  estimated_total_inr INT,
  label TEXT,                             -- Best Value | Best Experience | etc.
  sustainability_score FLOAT,
  crowd_score FLOAT,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's plan selection
CREATE TABLE selected_plans (
  trip_id UUID REFERENCES trips(id) PRIMARY KEY,
  plan_id UUID REFERENCES trip_plans(id),
  selected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings (post-payment)
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  component_type TEXT,
  provider TEXT,
  provider_reference TEXT,
  final_price_inr INT,
  status TEXT,                            -- pending | confirmed | failed | cancelled
  confirmation_reference TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-session trip memory
CREATE TABLE user_trip_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  trip_summary JSONB,
  preference_profile JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Packing checklists
CREATE TABLE trip_checklists (
  trip_id UUID REFERENCES trips(id) PRIMARY KEY,
  items JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation history (for context injection)
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  role TEXT,                              -- user | assistant
  content TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 006_destination_shortlists.sql

CREATE TABLE destination_shortlists (
    session_id text PRIMARY KEY,
    trip_id uuid REFERENCES trips(id),
    shortlist_json jsonb,
    generated_at timestamptz DEFAULT now()
);


-- Feature 10: Trip Itineraries schema

CREATE TABLE trip_itineraries (
    trip_id uuid PRIMARY KEY
        REFERENCES trips(id)
        ON DELETE CASCADE,
    data_json jsonb NOT NULL,
    language text NOT NULL DEFAULT 'en',
    total_estimated_spend_inr int NOT NULL,
    generation_attempts int NOT NULL DEFAULT 1,
    warnings text[] DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_trip_itineraries_updated
ON trip_itineraries(updated_at DESC);

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';


-- Align user_trip_memory with required schema from prompt
ALTER TABLE user_trip_memory ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE user_trip_memory ALTER COLUMN user_id SET NOT NULL;

-- Set a default for trip_summary before making it NOT NULL
UPDATE user_trip_memory SET trip_summary = '[]'::jsonb WHERE trip_summary IS NULL;
ALTER TABLE user_trip_memory ALTER COLUMN trip_summary SET NOT NULL;

-- Add unique constraint to user_trip_memory so we can safely upsert a rolling memory row per user
ALTER TABLE user_trip_memory ADD CONSTRAINT user_trip_memory_user_id_key UNIQUE (user_id);

-- Add index if it doesn't already exist implicitly via unique constraint
CREATE INDEX IF NOT EXISTS idx_user_trip_memory_user_id ON user_trip_memory(user_id);


-- Add user_id and plan_id to bookings table as required by Feature 13
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES trip_plans(id);


-- Feature 15: Post-Booking Companion schema

DROP TABLE IF EXISTS trip_checklists CASCADE;

CREATE TABLE trip_checklists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    data_json jsonb NOT NULL,
    language text NOT NULL DEFAULT 'en',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_trip_checklists_trip_id
ON trip_checklists(trip_id);

CREATE TABLE trip_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    booking_id uuid NULL,
    user_id text NOT NULL,
    document_type text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    cloudinary_public_id text NOT NULL,
    secure_url text,
    source text NOT NULL DEFAULT 'user',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_trip_documents_trip_id
ON trip_documents(trip_id);
