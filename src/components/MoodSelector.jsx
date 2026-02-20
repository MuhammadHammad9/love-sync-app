import React, { useState, useEffect } from 'react';
import { Smile, Frown, Heart, Coffee, Moon, Sun, CloudRain, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const MOODS = [
    { id: 'happy', icon: Smile, label: 'Happy', color: 'text-yellow-400', bg: 'bg-yellow-400/20', ring: 'ring-yellow-400/40' },
    { id: 'sad', icon: Frown, label: 'Sad', color: 'text-blue-400', bg: 'bg-blue-400/20', ring: 'ring-blue-400/40' },
    { id: 'romantic', icon: Heart, label: 'Romantic', color: 'text-pink-500', bg: 'bg-pink-500/20', ring: 'ring-pink-500/40' },
    { id: 'tired', icon: Moon, label: 'Tired', color: 'text-purple-400', bg: 'bg-purple-400/20', ring: 'ring-purple-400/40' },
    { id: 'energetic', icon: Sun, label: 'Energetic', color: 'text-orange-400', bg: 'bg-orange-400/20', ring: 'ring-orange-400/40' },
    { id: 'cozy', icon: Coffee, label: 'Cozy', color: 'text-amber-700', bg: 'bg-amber-700/20', ring: 'ring-amber-700/40' },
    { id: 'gloomy', icon: CloudRain, label: 'Gloomy', color: 'text-gray-400', bg: 'bg-gray-400/20', ring: 'ring-gray-400/40' },
];

const moodGridVariants = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.05, delayChildren: 0.05 },
    },
    exit: {
        transition: { staggerChildren: 0.03, staggerDirection: -1 },
    },
};

const moodButtonVariants = {
    hidden: { opacity: 0, scale: 0.6, y: 10 },
    show: {
        opacity: 1, scale: 1, y: 0,
        transition: { type: 'spring', stiffness: 400, damping: 22 },
    },
    exit: {
        opacity: 0, scale: 0.7, y: 6,
        transition: { duration: 0.15 },
    },
};

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
            await updateProfile({ mood: mood.id });
        } catch (err) {
            console.error('Error updating mood:', err);
        }
    };

    return (
        <div className="w-full">
            <motion.div
                onClick={() => setIsSelecting(!isSelecting)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden liquid-glass p-4 rounded-2xl flex items-center justify-between cursor-pointer group"
            >
                <div className="flex items-center gap-4">
                    {/* Animated icon cross-fade on mood change */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentMood?.id || 'default'}
                            initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0, rotate: 20 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                            className={`p-3 rounded-full ${currentMood?.bg || 'bg-white/5'}`}
                        >
                            {currentMood
                                ? <currentMood.icon className={`w-6 h-6 ${currentMood.color}`} />
                                : <Smile className="w-6 h-6 text-white/50" />
                            }
                        </motion.div>
                    </AnimatePresence>

                    <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider font-bold group-hover:text-white/60 transition-colors">
                            Current Mood
                        </p>
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={currentMood?.label}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className="text-lg font-medium"
                            >
                                {currentMood?.label || 'How are you?'}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Rotating chevron */}
                <motion.div
                    animate={{ rotate: isSelecting ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="text-white/30 group-hover:text-white/50"
                >
                    <ChevronDown className="w-4 h-4" />
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {isSelecting && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="overflow-hidden"
                    >
                        <motion.div
                            variants={moodGridVariants}
                            initial="hidden"
                            animate="show"
                            exit="exit"
                            className="grid grid-cols-4 gap-2 mt-4 p-2"
                        >
                            {MOODS.map((mood) => (
                                <motion.button
                                    key={mood.id}
                                    variants={moodButtonVariants}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.88 }}
                                    onClick={() => handleSelectMood(mood)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors
                                        ${currentMood?.id === mood.id
                                            ? `${mood.bg} ring-1 ${mood.ring}`
                                            : 'hover:bg-white/5'
                                        }`}
                                >
                                    <mood.icon className={`w-6 h-6 ${mood.color}`} />
                                    <span className="text-[10px] text-white/60">{mood.label}</span>
                                    {currentMood?.id === mood.id && (
                                        <motion.div
                                            layoutId="mood-selected-dot"
                                            className={`w-1.5 h-1.5 rounded-full ${mood.color.replace('text-', 'bg-')}`}
                                        />
                                    )}
                                </motion.button>
                            ))}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
