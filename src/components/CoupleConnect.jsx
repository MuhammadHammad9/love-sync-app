import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Copy, Check, ArrowRight, Sparkles, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export default function CoupleConnect() {
    const { user, profile } = useAuth(); // AuthContext should expose a way to refresh profile/couple
    const [mode, setMode] = useState('initial'); // initial, create, join
    const [code, setCode] = useState('');
    const [generatedCode, setGeneratedCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const generateCode = async () => {
        setLoading(true);
        setError('');
        try {
            // 1. Generate unique code
            const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            // 2. Create couple record
            const { data, error: insertError } = await supabase
                .from('couples')
                .insert([{
                    partner_a: user.id,
                    connect_code: uniqueCode,
                    streak_count: 0
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // 3. Update my profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ couple_id: data.id })
                .eq('id', user.id);

            if (profileError) throw profileError;

            setGeneratedCode(uniqueCode);
            setMode('waiting');

            // Start polling or listening for partner (handled by AuthContext realtime usually, 
            // but we might need to force a refresh if the context doesn't pick it up instantly)

        } catch (err) {
            console.error(err);
            setError("Failed to create connection. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const joinCouple = async () => {
        if (!code || code.length < 6) {
            setError("Please enter a valid 6-character code.");
            return;
        }
        setLoading(true);
        setError('');

        try {
            // 1. Find couple by code
            const { data: coupleData, error: findError } = await supabase
                .from('couples')
                .select('*')
                .eq('connect_code', code.toUpperCase())
                .single();

            if (findError || !coupleData) {
                throw new Error("Invalid code. Please check and try again.");
            }

            if (coupleData.partner_b) {
                throw new Error("This couple is already full!");
            }

            // 2. Join as partner_b
            const { error: updateError } = await supabase
                .from('couples')
                .update({ partner_b: user.id })
                .eq('id', coupleData.id);

            if (updateError) throw updateError;

            // 3. Update my profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ couple_id: coupleData.id })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Success!! Trigger celebration and let AuthContext take over (reload might be needed if context doesn't auto-update)
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ec4899', '#f472b6', '#fce7f3']
            });

            // Force reload to ensure context picks up the new couple state immediately
            window.location.reload();

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-[#0f0505] via-[#1a0a0f] to-[#0f0505]">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-love-600 rounded-full blur-[120px] animate-pulse"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-love-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-love-500/20">
                        <Heart className="w-8 h-8 text-love-500 fill-love-500/20 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Connect Your Hearts</h2>
                    <p className="text-white/50 text-sm">
                        You're almost there! Link with your partner to start your shared journey.
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {mode === 'initial' && (
                        <motion.div
                            key="initial"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <button
                                onClick={() => { setMode('create'); generateCode(); }}
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-love-600 to-pink-600 hover:from-love-500 hover:to-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-love-500/20 transition-all hover:scale-[1.02]"
                            >
                                {loading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                I have the First Move
                            </button>

                            <div className="text-center text-xs text-white/30 uppercase tracking-widest my-2">- OR -</div>

                            <button
                                onClick={() => setMode('join')}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:border-love-500/30"
                            >
                                <UserPlus className="w-5 h-5" />
                                I have a Code
                            </button>
                        </motion.div>
                    )}

                    {mode === 'waiting' && (
                        <motion.div
                            key="waiting"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 text-center"
                        >
                            <div className="p-6 bg-black/40 rounded-2xl border border-love-500/50 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-love-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <p className="text-xs text-love-300 uppercase tracking-widest mb-2">Your Connection Code</p>
                                <div className="text-4xl font-mono font-bold text-white tracking-widest mb-4">
                                    {generatedCode}
                                </div>
                                <button
                                    onClick={copyToClipboard}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium text-white/80 flex items-center justify-center gap-2 mx-auto transition-colors"
                                >
                                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied!' : 'Tap to Copy'}
                                </button>
                            </div>

                            <div className="flex items-center justify-center gap-2">
                                <div className="w-2 h-2 bg-love-500 rounded-full animate-ping" />
                                <p className="text-sm text-white/60 animate-pulse">Waiting for partner to join...</p>
                            </div>

                            <p className="text-xs text-white/30">
                                Share this code with your partner. Once they enter it, your dashboard will unlock automatically.
                            </p>
                        </motion.div>
                    )}

                    {mode === 'join' && (
                        <motion.div
                            key="join"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <div className="space-y-2 text-left">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider ml-1">Enter Partner's Code</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="XXXXXX"
                                    maxLength={6}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-4 px-4 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:border-love-500 transition-colors uppercase"
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                    {error}
                                </p>
                            )}

                            <button
                                onClick={joinCouple}
                                disabled={loading || code.length < 6}
                                className="w-full py-4 bg-love-600 hover:bg-love-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? <Sparkles className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                Sync Hearts
                            </button>
                            <button
                                onClick={() => { setMode('initial'); setError(''); }}
                                className="text-xs text-white/40 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
