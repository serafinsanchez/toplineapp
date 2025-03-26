-- Create a table for tracking stem separation job processing
CREATE TABLE IF NOT EXISTS processing_jobs (
  id BIGSERIAL PRIMARY KEY,
  process_id UUID NOT NULL UNIQUE,
  job_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acapella_path TEXT,
  instrumental_path TEXT
);

-- Add RLS to ensure only authenticated users can read their own jobs
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Admin users can read/write all jobs
CREATE POLICY "Admin users can CRUD jobs" ON processing_jobs 
FOR ALL 
TO authenticated
USING (auth.uid() IN (
  SELECT auth.uid() FROM auth.users 
  WHERE auth.uid() IN (SELECT user_id FROM user_profiles WHERE role = 'admin')
))
WITH CHECK (auth.uid() IN (
  SELECT auth.uid() FROM auth.users 
  WHERE auth.uid() IN (SELECT user_id FROM user_profiles WHERE role = 'admin')
));

-- Users can read only their own jobs
CREATE POLICY "Users can read their own jobs" ON processing_jobs 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Service role (server) can read/write all jobs for unauthenticated users
CREATE POLICY "Service role can read/write all jobs" ON processing_jobs 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER set_processing_jobs_updated_at
BEFORE UPDATE ON processing_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX processing_jobs_process_id_idx ON processing_jobs(process_id);
CREATE INDEX processing_jobs_user_id_idx ON processing_jobs(user_id);
CREATE INDEX processing_jobs_status_idx ON processing_jobs(status);

-- Comment on table and columns
COMMENT ON TABLE processing_jobs IS 'Table for tracking audio stem separation processing jobs';
COMMENT ON COLUMN processing_jobs.process_id IS 'Unique process ID used to identify a job on the client side';
COMMENT ON COLUMN processing_jobs.job_id IS 'Job ID from the MusicAI service';
COMMENT ON COLUMN processing_jobs.user_id IS 'User ID of the user who created the job (null for anonymous users)';
COMMENT ON COLUMN processing_jobs.status IS 'Current status of the job (PROCESSING, COMPLETED, FAILED)';
COMMENT ON COLUMN processing_jobs.error IS 'Error message if the job failed';
COMMENT ON COLUMN processing_jobs.acapella_path IS 'Path to the acapella file';
COMMENT ON COLUMN processing_jobs.instrumental_path IS 'Path to the instrumental file'; 