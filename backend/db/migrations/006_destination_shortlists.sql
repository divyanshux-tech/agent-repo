-- 006_destination_shortlists.sql

CREATE TABLE destination_shortlists (
    session_id text PRIMARY KEY,
    trip_id uuid REFERENCES trips(id),
    shortlist_json jsonb,
    generated_at timestamptz DEFAULT now()
);
