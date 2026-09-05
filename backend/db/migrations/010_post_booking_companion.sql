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
