import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { generateContextualNote } from '../lib/gemini';
import { Cloud, Sun, CloudRain, Wind, Sparkles, Feather, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContextualPoet() {
    const { couple, profile } = useAuth();
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Helper to get location and weather
    const getWeather = async () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve("Unknown location");
                return;
            }

            navigator.geolocation.getCurrentPosition(async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
                    );
                    const data = await response.json();

                    if (!data.current) {
                        resolve("Unknown weather");
                        return;
                    }

                    const temp = Math.round(data.current.temperature_2m);
                    const code = data.current.weather_code;

                    // Map WMO code to description
                    let desc = "Clear sky";
                    if (code >= 1 && code <= 3) desc = "Cloudy";
                    if (code >= 45 && code <= 48) desc = "Foggy";
                    if (code >= 51 && code <= 67) desc = "Rainy";
                    if (code >= 71 && code <= 77) desc = "Snowy";
                    if (code >= 80 && code <= 82) desc = "Showers";
                    if (code >= 95) desc = "Thunderstorm";

                    resolve(`${desc}, ${temp}°C`);
                } catch (e) {
                    console.error("Weather fetch failed", e);
                    resolve("Mystery weather");
                }
            }, (error) => {
                console.warn("Location denied", error);
                resolve("Secret location");
            });
        });
    };

    useEffect(() => {
        if (!couple || !profile) return;

        const loadDailyNote = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];

                // 1. Check Cache (Supabase)
                const { data: existingNote } = await supabase
                    .from('daily_notes')
                    .select('*')
                    .eq('couple_id', couple.id)
                    .eq('note_date', today)
                    .maybeSingle();

                if (existingNote) {
                    setNote(existingNote.content);
                    setLoading(false);
                    return;
                }

                // 2. If no note, Generate Context
                const weather = await getWeather();

                const partnerId = couple.partner_a === profile.id ? couple.partner_b : couple.partner_a;
                let partnerMood = "Unknown";
                if (partnerId) {
                    const { data: partnerData } = await supabase
                        .from('profiles')
                        .select('mood')
                        .eq('id', partnerId)
                        .single();
                    if (partnerData) partnerMood = partnerData.mood;
                }

                let memoryContext = "our journey together";
                const { data: memories } = await supabase
                    .from('memories')
                    .select('caption')
                    .eq('couple_id', couple.id)
                    .not('caption', 'is', null)
                    .limit(10);

                if (memories && memories.length > 0) {
                    const randomMem = memories[Math.floor(Math.random() * memories.length)];
                    if (randomMem.caption) memoryContext = randomMem.caption;
                }

                // 3. Generate with AI
                const generatedText = await generateContextualNote(weather, partnerMood, memoryContext);

                if (generatedText) {
                    setNote(generatedText);
                    // 4. Cache it
                    await supabase.from('daily_notes').insert([{
                        couple_id: couple.id,
                        note_date: today,
                        content: generatedText,
                        weather_context: weather,
                        mood_context: partnerMood,
                        memory_context: memoryContext
                    }]);
                } else {
                    // Fallback handled nicely
                    setNote("The stars align for you today,\nBut the digital muse is shy.\n\n(AI Service unavailable, check API Key)");
                    setError("AI Service Unavailable");
                }

            } catch (err) {
                console.error("Poet error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadDailyNote();
    }, [couple, profile]);

    const handleRegenerate = async () => {
        if (!confirm("Ask the Muse for a new poem? This will replace today's serenade.")) return;
        setLoading(true);
        setNote(null);
        try {
            const today = new Date().toISOString().split('T')[0];
            await supabase.from('daily_notes').delete().eq('couple_id', couple.id).eq('note_date', today);
            window.location.reload();
        } catch (e) {
            console.error("Regen failed", e);
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="liquid-glass p-6 rounded-2xl flex items-center justify-center h-48 animate-pulse border border-white/5">
            <div className="flex flex-col items-center gap-2 text-white/30">
                <Feather className="w-8 h-8 animate-bounce" />
                <span className="text-xs uppercase tracking-widest">Composing...</span>
            </div>
        </div>
    );

    if (!note) return null;

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Feather className="w-4 h-4" />
                    Daily Serenade
                </h3>
                <div className="flex gap-2">
                    {error && (
                        <div title={error} className="p-2 text-red-400 bg-red-500/10 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                        </div>
                    )}
                    <button
                        onClick={handleRegenerate}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/30 hover:text-white/80"
                        title="Rewrite Poem"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="liquid-glass p-8 rounded-3xl relative overflow-hidden group border border-white/10 shadow-lg"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110">
                    <Feather className="w-40 h-40 text-white -mr-12 -mt-12" />
                </div>

                <div className="relative z-10 flex flex-col gap-6">
                    <div className="font-serif text-lg leading-loose text-white/90 italic whitespace-pre-line font-light drop-shadow-sm">
                        {note}
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                        <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider">
                            <Sparkles className="w-3 h-3 text-yellow-500/50" />
                            <span>AI Muse</span>
                        </div>
                        <span className="text-[10px] text-white/30 font-mono">
                            {new Date().toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
