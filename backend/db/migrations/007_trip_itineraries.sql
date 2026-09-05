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
