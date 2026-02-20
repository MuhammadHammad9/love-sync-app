-- Sleep Sessions Table
CREATE TABLE IF NOT EXISTS public.sleep_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    sleep_time TIMESTAMP WITH TIME ZONE NOT NULL,
    wake_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER, -- Calculated on wake
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alarm Settings Table
CREATE TABLE IF NOT EXISTS public.alarm_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    alarm_time TIME,
    alarm_enabled BOOLEAN DEFAULT false,
    alarm_tone TEXT DEFAULT 'gentle_chime',
    nature_sound_preference TEXT DEFAULT 'rain',
    wake_partner BOOLEAN DEFAULT false,
    snooze_duration INTEGER DEFAULT 5, -- minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for sleep_sessions
ALTER TABLE public.sleep_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sleep_sessions_select ON public.sleep_sessions
    FOR SELECT USING (
        user_id = auth.uid() OR 
        couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY sleep_sessions_insert ON public.sleep_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY sleep_sessions_update ON public.sleep_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for alarm_settings
ALTER TABLE public.alarm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY alarm_settings_select ON public.alarm_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY alarm_settings_insert ON public.alarm_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY alarm_settings_update ON public.alarm_settings
    FOR UPDATE USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS sleep_sessions_user_id_idx ON public.sleep_sessions(user_id);
CREATE INDEX IF NOT EXISTS sleep_sessions_couple_id_idx ON public.sleep_sessions(couple_id);
CREATE INDEX IF NOT EXISTS sleep_sessions_sleep_time_idx ON public.sleep_sessions(sleep_time DESC);
