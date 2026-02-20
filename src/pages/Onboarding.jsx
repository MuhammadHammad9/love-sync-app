import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Heart, Key, Copy, ArrowRight, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
    const { user, profile, couple, signOut } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState('menu'); // 'menu', 'create', 'join'
    const [code, setCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Check if user is already in a couple on mount
    React.useEffect(() => {
        if (profile?.couple_id && couple) {
            setCode(couple.connect_code);
            setMode('created');
        }
    }, [profile, couple]);

    const generateCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleCreateCouple = async () => {
        setLoading(true);
        setError('');

        const newCode = generateCode();

        try {
            // 1. Create Couple
            const { data: newCouple, error: coupleError } = await supabase
                .from('couples')
                .insert([{
                    partner_a: user.id,
                    connect_code: newCode
                }])
                .select()
                .single();

            if (coupleError) throw coupleError;

            // 2. Update Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ couple_id: newCouple.id })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // State updates will be handled by AuthContext refetch, 
            // but we can set local state for immediate feedback
            setCode(newCode);
            setMode('created');
            // Force a profile refresh if possible, or wait for realtime subscription (if implemented)
            // For now, reloading is jarring, better to just wait. 
            // In a real app we'd call a refresh function from context.
            window.location.reload(); // Keeping reload for now to ensure context updates until we add refresh

        } catch (err) {
            console.error('Error creating couple:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinCouple = async () => {
        setLoading(true);
        setError('');

        try {
            // 1. Find Couple
            const { data: targetCouple, error: findError } = await supabase
                .from('couples')
                .select('*')
                .eq('connect_code', joinCode.toUpperCase())
                .single();

            if (findError || !targetCouple) throw new Error('Invalid code. Please check and try again.');

            if (targetCouple.partner_b) throw new Error('This couple is already full.');
            if (targetCouple.partner_a === user.id) throw new Error('You cannot join your own couple.');

            // 2. Update Couple (add partner_b)
            const { error: updateCoupleError } = await supabase
                .from('couples')
                .update({ partner_b: user.id })
                .eq('id', targetCouple.id);

            if (updateCoupleError) throw updateCoupleError;

            // 3. Update Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ couple_id: targetCouple.id })
                .eq('id', user.id);

            if (profileError) throw profileError;

            window.location.reload();

        } catch (err) {
            console.error('Error joining couple:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/auth');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <button
                onClick={handleLogout}
                className="absolute top-6 right-6 text-xs text-white/40 hover:text-white transition-colors"
            >
                Logout
            </button>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel w-full max-w-md p-8 rounded-2xl relative"
            >
                <button
                    onClick={() => setMode('menu')}
                    className={`absolute top-4 left-4 text-xs text-white/50 hover:text-white ${mode === 'menu' || mode === 'created' ? 'hidden' : ''}`}
                >
                    ← Back
                </button>

                <h2 className="text-2xl font-bold text-center mb-2">
                    {mode === 'created' ? 'Couple Code' : 'Connect'}
                </h2>
                <p className="text-center text-love-100/60 text-sm mb-8">
                    {mode === 'menu' && "Start a new journey or join your partner."}
                    {mode === 'create' && "Generate a code to share with your partner."}
                    {mode === 'join' && "Enter the code shared by your partner."}
                    {mode === 'created' && "Share this code with your partner."}
                </p>

                {mode === 'menu' && (
                    <div className="space-y-4">
                        <button
                            onClick={() => setMode('create')}
                            className="w-full py-4 px-6 bg-love-600 hover:bg-love-500 rounded-xl font-semibold flex items-center justify-between group transition-all"
                        >
                            <span>Start New Couple</span>
                            <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                            onClick={() => setMode('join')}
                            className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold flex items-center justify-between group transition-all text-love-100"
                        >
                            <span>I have a code</span>
                            <Key className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        </button>
                    </div>
                )}

                {mode === 'create' && (
                    <div className="space-y-6">
                        <button
                            onClick={handleCreateCouple}
                            disabled={loading}
                            className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-love-50 transition-colors flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader className="animate-spin w-4 h-4" /> : 'Generate Code'}
                        </button>
                    </div>
                )}

                {mode === 'created' && (
                    <div className="space-y-6 text-center">
                        <div className="p-6 bg-black/30 rounded-xl border border-love-500/30 flex flex-col items-center gap-2">
                            <span className="text-4xl font-mono tracking-widest text-love-400">{code}</span>
                            <p className="text-xs text-white/40">Waiting for partner...</p>
                        </div>
                    </div>
                )}

                {mode === 'join' && (
                    <div className="space-y-6">
                        <input
                            type="text"
                            placeholder="ENTER CODE"
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-center text-2xl tracking-widest font-mono uppercase focus:outline-none focus:border-love-500 transition-colors"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                        />
                        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                        <button
                            onClick={handleJoinCouple}
                            disabled={loading || joinCode.length < 3}
                            className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-love-50 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader className="animate-spin w-4 h-4" /> : 'Link Partners'}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </div>
                )}

            </motion.div>
        </div>
    );
}
