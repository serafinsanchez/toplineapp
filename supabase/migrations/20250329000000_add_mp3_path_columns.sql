-- Add MP3 path columns to the processing_jobs table
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS acapella_mp3_path TEXT;
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS instrumental_mp3_path TEXT;

-- Add comments on the new columns
COMMENT ON COLUMN processing_jobs.acapella_mp3_path IS 'Path to the converted MP3 acapella file';
COMMENT ON COLUMN processing_jobs.instrumental_mp3_path IS 'Path to the converted MP3 instrumental file'; 