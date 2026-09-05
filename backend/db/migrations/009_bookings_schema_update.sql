-- Add user_id and plan_id to bookings table as required by Feature 13
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES trip_plans(id);
