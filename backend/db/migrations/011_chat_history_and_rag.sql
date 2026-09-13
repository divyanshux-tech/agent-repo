-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add history management columns to trips
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create table for RAG chunks from uploaded documents
CREATE TABLE trip_document_chunks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    document_id uuid NOT NULL REFERENCES trip_documents(id) ON DELETE CASCADE,
    chunk_text text NOT NULL,
    embedding vector(384), -- Using 384 for sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_trip_document_chunks_trip_id ON trip_document_chunks(trip_id);
