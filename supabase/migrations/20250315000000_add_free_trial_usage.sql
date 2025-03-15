-- Create free_trial_usage table
CREATE TABLE IF NOT EXISTS public.free_trial_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_ip TEXT NOT NULL,
    user_agent TEXT,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(client_ip)
);

-- Create RLS policies for free_trial_usage table
ALTER TABLE public.free_trial_usage ENABLE ROW LEVEL SECURITY;

-- Only service role can access free_trial_usage
CREATE POLICY "Only service role can access free_trial_usage"
    ON public.free_trial_usage
    FOR ALL
    USING (false); 