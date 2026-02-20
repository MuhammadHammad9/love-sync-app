import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Small floating heart particle
const HeartParticle = ({ id, onComplete }) => {
    // Random physics for "explosion"
    const angle = Math.random() * 360;
    const velocity = 50 + Math.random() * 100;
    const x = Math.cos(angle * (Math.PI / 180)) * velocity;
    const y = Math.sin(angle * (Math.PI / 180)) * velocity;
    const rotation = Math.random() * 360;

    return (
        <motion.div
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
            animate={{ x, y, scale: 0, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            onAnimationComplete={() => onComplete(id)}
            className="absolute pointer-events-none top-1/2 left-1/2 -ml-2 -mt-2"
        >
            <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
        </motion.div>
    );
};

export default function Heartbeat() {
    const { profile, couple } = useAuth();
    const [lastReceived, setLastReceived] = useState(null);
    const [sending, setSending] = useState(false);

    // Heat System: More taps = more intense glow/animation
    const [heat, setHeat] = useState(0);
    const [particles, setParticles] = useState([]);

    // Decay heat over time
    useEffect(() => {
        const timer = setInterval(() => {
            setHeat(h => Math.max(0, h - 0.5));
        }, 100);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!profile?.couple_id) return;

        const channel = supabase.channel(`heartbeat:${profile.couple_id}`)
            .on('broadcast', { event: 'heartbeat' }, (payload) => {
                if (payload.sender_id !== profile.id) {
                    setLastReceived(Date.now());
                    if (navigator.vibrate) navigator.vibrate([50, 40, 150]); // Intensified haptic
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.couple_id, profile?.id]);

    const sendHeartbeat = async () => {
        if (!profile?.couple_id || !couple) return;
        setSending(true);

        // Immediate Optimistic Feedback
        if (navigator.vibrate) navigator.vibrate(20);

        // 1. Broadcast Realtime Event (Immediate)
        await supabase.channel(`heartbeat:${profile.couple_id}`).send({
            type: 'broadcast',
            event: 'heartbeat',
            payload: { sender_id: profile.id, timestamp: new Date() },
        });

        // 2. Persist Notification (For reliability/history)
        const partnerId = couple.partner_a === profile.id ? couple.partner_b : couple.partner_a;
        if (partnerId) {
            await supabase.from('notifications').insert([{
                user_id: partnerId,
                type: 'heartbeat',
                title: `Heartbeat from ${profile?.username || 'Partner'} ❤️`,
                message: 'Your partner is thinking of you right now.',
                metadata: { type: 'heartbeat' }
            }]);
        }

        setTimeout(() => setSending(false), 200);
    };

    const handleTap = () => {
        // Boost heat
        setHeat(prev => Math.min(prev + 2, 10));

        // Spawn particles (Prompt 3: Dopamine Burst)
        const burstCount = 6 + Math.floor(Math.random() * 4);
        const newParticles = Array.from({ length: burstCount }).map((_) => ({
            id: Math.random().toString(36).substr(2, 9),
        }));
        setParticles(prev => [...prev, ...newParticles]);

        sendHeartbeat();
    };

    const removeParticle = (id) => {
        setParticles(prev => prev.filter(p => p.id !== id));
    };

    // "Lub-Dub" Variant
    const heartbeatVariant = {
        idle: {
            scale: 1,
            transition: { type: "spring", stiffness: 100, damping: 20 }
        },
        beating: {
            scale: [1, 1.25, 1, 1.3, 1], // Deeper beat
            transition: {
                duration: 0.8,
                times: [0, 0.15, 0.3, 0.45, 1],
                repeat: 2,
                ease: "easeInOut"
            }
        },
        sending: {
            scale: 0.85,
            transition: { type: "spring", stiffness: 500, damping: 15 }
        }
    };

    const isBeating = lastReceived && (Date.now() - lastReceived < 3000);

    // Dynamic Visuals based on Heat
    const glowSize = 40 + (heat * 5); // Glow expands with heat
    const coreColor = heat > 5 ? 'text-white' : 'text-love-100';

    return (
        <div className="relative flex flex-col items-center justify-center py-12 overflow-visible">

            {/* Ambient Aura (Changes intensity with Heat) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.1 + (heat / 20), 1],
                        opacity: [0.1, 0.15 + (heat / 50), 0.1]
                    }}
                    transition={{ duration: 4 - (heat / 5), repeat: Infinity, ease: "easeInOut" }}
                    className="bg-love-500 rounded-full blur-3xl transition-all duration-500"
                    style={{ width: `${12 + (heat / 2)}rem`, height: `${12 + (heat / 2)}rem` }}
                />
            </div>

            {/* Ripple Effects for Received Pulse */}
            <AnimatePresence>
                {isBeating && (
                    <>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0.6 }}
                            animate={{ scale: 2.8, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="absolute w-24 h-24 border-[3px] border-love-400 rounded-full z-0"
                            key={lastReceived}
                        />
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0.4 }}
                            animate={{ scale: 3.5, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.8, delay: 0.1, ease: "easeOut" }}
                            className="absolute w-24 h-24 border border-love-300 rounded-full z-0"
                            key={lastReceived + '-echo'}
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Particle Layer */}
            <div className="absolute inset-0 pointer-events-none z-20">
                {particles.map(p => (
                    <HeartParticle key={p.id} id={p.id} onComplete={removeParticle} />
                ))}
            </div>

            {/* The Heart Button */}
            <motion.button
                variants={heartbeatVariant}
                animate={sending ? "sending" : isBeating ? "beating" : "idle"}
                whileTap={{ scale: 0.85 }}
                onClick={handleTap}
                className={`relative z-10 rounded-full flex items-center justify-center group transition-all duration-300 shadow-2xl`}
                style={{
                    width: '6rem',
                    height: '6rem',
                    background: `linear-gradient(135deg, ${heat > 5 ? '#f43f5e' : '#ec4899'}, ${heat > 8 ? '#be123c' : '#db2777'})`, // Dynamic Gradient
                    boxShadow: `0 0 ${glowSize}px rgba(236, 72, 153, ${0.4 + (heat / 30)})` // Dynamic Glow
                }}
            >
                <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />

                {/* Inner Icon Layer */}
                <motion.div
                    animate={isBeating ? { rotate: [0, -15, 15, 0] } : {}}
                    transition={{ duration: 0.4 }}
                >
                    <Heart
                        className={`w-12 h-12 ${coreColor} fill-white/20 transition-colors duration-300`}
                        strokeWidth={2.5}
                    />
                </motion.div>

                {/* EKG Line (Appears when active) */}
                <AnimatePresence>
                    {(isBeating || heat > 0) && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-5"
                        >
                            <Activity className="w-5 h-5 text-white/60 animate-pulse" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Status text */}
            <AnimatePresence mode="wait">
                {isBeating ? (
                    <motion.p
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        key="feeling"
                        className="mt-8 text-xs font-bold text-love-200 tracking-[0.2em] uppercase flex items-center gap-2 drop-shadow-lg"
                    >
                        <Heart className="w-3 h-3 fill-love-500 animate-ping" />
                        Connected
                    </motion.p>
                ) : (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        key="idle"
                        className="mt-8 text-[10px] font-medium text-white/30 tracking-[0.2em] uppercase"
                    >
                        Tap to vibe
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
