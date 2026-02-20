import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Quote, Flame, Image as ImageIcon, MessageCircle,
    Gamepad2, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

import PageTransition from '../components/common/PageTransition';
import MoodSelector from '../components/MoodSelector';
import Heartbeat from '../components/Heartbeat';
import InvisibleStringMap from '../components/InvisibleStringMap';
import TicTacToe from '../components/TicTacToe';
import GameHistoryList from '../components/GameHistoryList';
import CoupleConnect from '../components/CoupleConnect';

const Home = ({ theme, quote, onGameToggle }) => {
    const { user, couple, partnerProfile, loading } = useAuth();
    const [showGame, setShowGame] = useState(false);
    const [gameHistory, setGameHistory] = useState([]);

    // If no couple is connected, show the connection screen


    // Fetch Game History
    const fetchGameHistory = useCallback(async () => {
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
    }, [couple?.id]);

    useEffect(() => {
        fetchGameHistory();
    }, [fetchGameHistory]);

    // Notify parent about Game Mode change (to hide/show Nav)
    useEffect(() => {
        onGameToggle?.(showGame);
    }, [showGame, onGameToggle]);

    const handleTestCelebration = useCallback(() => {

        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
            zIndex: 9999
        });
    }, []);

    // Milestone Celebration (Run once on mount if applicable)
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

    // If no couple is connected, show the connection screen
    if (!loading && !couple) {
        return <CoupleConnect />;
    }

    if (showGame) {
        return (
            <div className="flex flex-col h-full pb-24">
                <button onClick={() => setShowGame(false)} className="mb-4 text-white/50 hover:text-white flex items-center gap-2 self-start px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                    ← Back to Dashboard
                </button>
                <div className="flex-1 flex items-center justify-center">
                    <TicTacToe onGameEnd={fetchGameHistory} onClose={() => setShowGame(false)} />
                </div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="space-y-6 pb-24">
                <header className="space-y-1 text-center relative z-10">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className={`text-4xl font-bold ${theme.textColor} drop-shadow-sm transition-colors duration-500 tracking-tight`}
                    >
                        LoveSync
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-white/50 text-xs tracking-[0.2em] uppercase font-medium"
                    >
                        Connected with {partnerProfile?.username || 'your person'}
                    </motion.p>
                </header>

                {/* Dynamic Quote Card */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`liquid-glass transition-colors duration-500 overflow-hidden relative p-8 rounded-[2rem] border ${theme.borderColor} ${theme.glassColor} shadow-2xl`}
                >
                    <Quote className={`absolute top-6 left-6 w-8 h-8 ${theme.textColor} opacity-20`} />
                    <p className="text-center text-xl font-light text-white/95 italic relative z-10 leading-relaxed font-serif">
                        "{quote}"
                    </p>
                    <div className="mt-6 flex justify-center items-center gap-2">
                        <span className={`text-[10px] px-3 py-1 rounded-full bg-white/10 border border-white/10 ${theme.textColor} uppercase tracking-widest font-bold`}>
                            {theme.label} Vibe
                        </span>
                    </div>
                </motion.div>

                {/* Streak Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <motion.div whileHover={{ y: -5 }} className="glass-panel p-4 rounded-3xl flex flex-col items-center justify-center gap-2">
                        <Flame className="w-6 h-6 text-orange-500" />
                        <span className="text-2xl font-bold font-mono">{couple?.streak_count || 0}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">Streak</span>
                    </motion.div>
                    <motion.div whileHover={{ y: -5 }} className="glass-panel p-4 rounded-3xl flex flex-col items-center justify-center gap-2">
                        <ImageIcon className="w-6 h-6 text-purple-400" />
                        <span className="text-2xl font-bold font-mono">{couple?.photos_shared || 0}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">Photos</span>
                    </motion.div>
                    <motion.div whileHover={{ y: -5 }} className="glass-panel p-4 rounded-3xl flex flex-col items-center justify-center gap-2">
                        <MessageCircle className="w-6 h-6 text-pink-400" />
                        <span className="text-2xl font-bold font-mono">{couple?.questions_answered || 0}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">Answers</span>
                    </motion.div>
                </div>

                {/* Game & Celebration Controls */}
                <div className="grid grid-cols-2 gap-3">
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowGame(true)}
                        className="py-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-colors group"
                    >
                        <Gamepad2 className="w-8 h-8 text-love-400 group-hover:rotate-12 transition-transform duration-300" />
                        <span className="text-xs text-white/70 font-bold uppercase tracking-wide">Play Game</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleTestCelebration}
                        className="py-6 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-colors group"
                    >
                        <Sparkles className="w-8 h-8 text-yellow-400 group-hover:rotate-12 transition-transform duration-300" />
                        <span className="text-xs text-white/70 font-bold uppercase tracking-wide">Celebrate</span>
                    </motion.button>
                </div>

                {/* Game History List */}
                <GameHistoryList gameHistory={gameHistory} user={user} partnerProfile={partnerProfile} />

                <MoodSelector />

                <div className="glass-panel rounded-[2rem] p-8">
                    <Heartbeat />
                </div>

                <div className="glass-panel rounded-[2rem] p-1 overflow-hidden">
                    <InvisibleStringMap />
                </div>
            </div>
        </PageTransition>
    );
};

export default Home;
