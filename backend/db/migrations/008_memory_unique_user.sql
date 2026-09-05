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
