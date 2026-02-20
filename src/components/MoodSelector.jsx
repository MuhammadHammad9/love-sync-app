import React, { useState, useEffect } from 'react';
import { Smile, Frown, Heart, Coffee, Moon, Sun, CloudRain } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const MOODS = [
    { id: 'happy', icon: Smile, label: 'Happy', color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
    { id: 'sad', icon: Frown, label: 'Sad', color: 'text-blue-400', bg: 'bg-blue-400/20' },
    { id: 'romantic', icon: Heart, label: 'Romantic', color: 'text-pink-500', bg: 'bg-pink-500/20' },
    { id: 'tired', icon: Moon, label: 'Tired', color: 'text-purple-400', bg: 'bg-purple-400/20' },
    { id: 'energetic', icon: Sun, label: 'Energetic', color: 'text-orange-400', bg: 'bg-orange-400/20' },
    { id: 'cozy', icon: Coffee, label: 'Cozy', color: 'text-amber-700', bg: 'bg-amber-700/20' },
    { id: 'gloomy', icon: CloudRain, label: 'Gloomy', color: 'text-gray-400', bg: 'bg-gray-400/20' },
];

export default function MoodSelector() {
    const { profile, updateProfile } = useAuth();
    const [currentMood, setCurrentMood] = useState(null);
    const [isSelecting, setIsSelecting] = useState(false);

    useEffect(() => {
        if (profile?.mood) {
            setCurrentMood(MOODS.find(m => m.id === profile.mood) || MOODS[0]);
        }
    }, [profile]);

    const handleSelectMood = async (mood) => {
        setCurrentMood(mood);
        setIsSelecting(false);

        try {
            // updateProfile updates Supabase AND immediately patches the local
            // profile state in AuthContext — so the theme changes instantly.
            await updateProfile({ mood: mood.id });
        } catch (err) {
            console.error('Error updating mood:', err);
        }
    };

    return (
        <div className="w-full">
            <div
                onClick={() => setIsSelecting(!isSelecting)}
                className="relative overflow-hidden liquid-glass p-4 rounded-2xl flex items-center justify-between cursor-pointer active:scale-95 transition-transform group"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${currentMood?.bg || 'bg-white/5'} transition-colors duration-300`}>
                        {currentMood ? (
                            <currentMood.icon className={`w-6 h-6 ${currentMood.color}`} />
                        ) : (
                            <Smile className="w-6 h-6 text-white/50" />
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider font-bold group-hover:text-white/60 transition-colors">Current Mood</p>
                        <p className="text-lg font-medium">{currentMood?.label || 'How are you?'}</p>
                    </div>
                </div>
                <div className="text-xs text-white/30 group-hover:text-white/50 transition-colors">Tap to change</div>
            </div>

            <AnimatePresence>
                {isSelecting && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-4 gap-2 mt-4 p-2">
                            {MOODS.map((mood) => (
                                <motion.button
                                    key={mood.id}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleSelectMood(mood)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${currentMood?.id === mood.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                >
                                    <mood.icon className={`w-6 h-6 ${mood.color}`} />
                                    <span className="text-[10px] text-white/60">{mood.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
