import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Quote, Flame, Image as ImageIcon, MessageCircle,
    Gamepad2, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

import PageTransition from '../components/common/PageTransition';
import { staggerContainer, staggerItem } from '../components/common/PageTransition';
import MoodSelector from '../components/MoodSelector';
import Heartbeat from '../components/Heartbeat';
import InvisibleStringMap from '../components/InvisibleStringMap';
import TicTacToe from '../components/TicTacToe';
import GameHistoryList from '../components/GameHistoryList';
import CoupleConnect from '../components/CoupleConnect';

// Animated number counter
function AnimatedCounter({ value, className }) {
    const motionValue = useMotionValue(0);
    const rounded = useTransform(motionValue, latest => Math.round(latest));
    const [display, setDisplay] = useState(0);
    const prevValue = useRef(0);

    useEffect(() => {
        const controls = animate(motionValue, value, {
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
        });
        return controls.stop;
    }, [value, motionValue]);

    useEffect(() => {
        return rounded.onChange(v => setDisplay(v));
    }, [rounded]);

    return <span className={className}>{display}</span>;
}

const statCardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.92 },
    show: (i) => ({
        opacity: 1, y: 0, scale: 1,
        transition: { type: 'spring', stiffness: 340, damping: 26, delay: i * 0.08 },
    }),
};

const Home = ({ theme, quote, onGameToggle }) => {
    const { user, couple, partnerProfile, loading } = useAuth();
    const [showGame, setShowGame] = useState(false);
    const [gameHistory, setGameHistory] = useState([]);

    useEffect(() => {
        const fetchGameHistory = async () => {
            if (!couple?.id) return;
            try {
                const { data, error } = await supabase
                    .from('game_history')
                    .select('*')
                    .eq('couple_id', couple.id)
                    .order('played_at', { ascending: false })
                    .limit(5);
                if (error) {
                    console.warn('Game history fetch error (table may not exist):', error.message);
                    return;
                }
                if (data) setGameHistory(data);
            } catch (err) {
                console.warn('Game history error:', err);
            }
        };
        fetchGameHistory();
    }, [couple?.id]);

    useEffect(() => {
        onGameToggle?.(showGame);
    }, [showGame, onGameToggle]);

    const handleTestCelebration = () => {
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
            zIndex: 9999
        });
    };

    useEffect(() => {
        if (couple?.streak_count && [3, 7, 15, 30].includes(couple.streak_count)) {
            const key = `celebrated_streak_${couple.streak_count}_${new Date().toDateString()}`;
            if (!localStorage.getItem(key)) {
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
                    zIndex: 2000
                });
                localStorage.setItem(key, 'true');
            }
        }
    }, [couple?.streak_count]);

    if (!loading && !couple) return <CoupleConnect />;

    if (showGame) {
        return (
            <div className="flex flex-col h-full pb-24">
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowGame(false)}
                    className="mb-4 text-white/50 hover:text-white flex items-center gap-2 self-start px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                    ← Back to Dashboard
                </motion.button>
                <div className="flex-1 flex items-center justify-center">
                    <TicTacToe onClose={() => setShowGame(false)} />
                </div>
            </div>
        );
    }

    const stats = [
        { icon: Flame, value: couple?.streak_count || 0, label: 'Streak', color: 'text-orange-500' },
        { icon: ImageIcon, value: couple?.photos_shared || 0, label: 'Photos', color: 'text-purple-400' },
        { icon: MessageCircle, value: couple?.questions_answered || 0, label: 'Answers', color: 'text-pink-400' },
    ];

    return (
        <PageTransition>
            <div className="space-y-6 pb-24">
                {/* Header */}
                <header className="space-y-1 text-center relative z-10">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 24 }}
                        className={`text-4xl font-bold ${theme.textColor} drop-shadow-sm transition-colors duration-500 tracking-tight`}
                    >
                        LoveSync
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18, type: 'spring', stiffness: 300, damping: 24 }}
                        className="text-white/50 text-xs tracking-[0.2em] uppercase font-medium"
                    >
                        Connected with {partnerProfile?.username || 'your person'}
                    </motion.p>
                </header>

                {/* Dynamic Quote Card */}
                <motion.div
                    layout
                    layoutId="quote-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.22, type: 'spring', stiffness: 280, damping: 26 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`liquid-glass transition-colors duration-500 overflow-hidden relative p-8 rounded-[2rem] border ${theme.borderColor} ${theme.glassColor} shadow-2xl cursor-default`}
                >
                    <Quote className={`absolute top-6 left-6 w-8 h-8 ${theme.textColor} opacity-20`} />
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={quote}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.35 }}
                            className="text-center text-xl font-light text-white/95 italic relative z-10 leading-relaxed font-serif"
                        >
                            "{quote}"
                        </motion.p>
                    </AnimatePresence>
                    <div className="mt-6 flex justify-center items-center gap-2">
                        <motion.span
                            layout
                            className={`text-[10px] px-3 py-1 rounded-full bg-white/10 border border-white/10 ${theme.textColor} uppercase tracking-widest font-bold`}
                        >
                            {theme.label} Vibe
                        </motion.span>
                    </div>
                </motion.div>

                {/* Streak Stats — staggered with animated counters */}
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-3 gap-3"
                >
                    {stats.map(({ icon: Icon, value, label, color }, i) => (
                        <motion.div
                            key={label}
                            custom={i}
                            variants={statCardVariants}
                            whileHover={{ y: -5, scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="glass-panel p-4 rounded-3xl flex flex-col items-center justify-center gap-2"
                        >
                            <Icon className={`w-6 h-6 ${color}`} />
                            <AnimatedCounter value={value} className="text-2xl font-bold font-mono" />
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">{label}</span>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 gap-3"
                >
                    <motion.button
                        variants={staggerItem}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowGame(true)}
                        className="py-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-colors group"
                    >
                        <motion.div whileHover={{ rotate: 15 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                            <Gamepad2 className="w-8 h-8 text-love-400" />
                        </motion.div>
                        <span className="text-xs text-white/70 font-bold uppercase tracking-wide">Play Game</span>
                    </motion.button>

                    <motion.button
                        variants={staggerItem}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleTestCelebration}
                        className="py-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-colors group"
                    >
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 10, 0] }}
                            transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.5 }}
                        >
                            <Sparkles className="w-8 h-8 text-yellow-400" />
                        </motion.div>
                        <span className="text-xs text-white/70 font-bold uppercase tracking-wide">Celebrate</span>
                    </motion.button>
                </motion.div>

                <GameHistoryList gameHistory={gameHistory} user={user} partnerProfile={partnerProfile} />

                <motion.div
                    variants={staggerItem}
                    initial="hidden"
                    animate="show"
                >
                    <MoodSelector />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, type: 'spring', stiffness: 280, damping: 26 }}
                    className="glass-panel rounded-[2rem] p-8"
                >
                    <Heartbeat />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42, type: 'spring', stiffness: 280, damping: 26 }}
                    className="glass-panel rounded-[2rem] p-1 overflow-hidden"
                >
                    <InvisibleStringMap />
                </motion.div>
            </div>
        </PageTransition>
    );
};

export default Home;
