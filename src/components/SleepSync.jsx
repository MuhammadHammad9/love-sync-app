import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, Clock, Volume2, Bell, Heart, Play, Pause, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SleepSync() {
    const { user, profile, partnerProfile, couple } = useAuth();
    const [sleepSessions, setSleepSessions] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [alarmSettings, setAlarmSettings] = useState(null);

    // Nature sounds player
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSound, setCurrentSound] = useState('rain');
    const [volume, setVolume] = useState(0.5);
    const [audioElement, setAudioElement] = useState(null);
    const [isAlarmRinging, setIsAlarmRinging] = useState(false);
    const [alarmAudio, setAlarmAudio] = useState(null);
    const [audioContext, setAudioContext] = useState(null);
    const [oscillator, setOscillator] = useState(null);
    const [gainNode, setGainNode] = useState(null);

    // Nature sounds using Web Audio API (generated tones that simulate nature)
    const natureSounds = [
        { id: 'rain', name: 'Rain', icon: '🌧️', freq: 200 },
        { id: 'ocean', name: 'Ocean Waves', icon: '🌊', freq: 150 },
        { id: 'forest', name: 'Forest', icon: '🌲', freq: 300 },
        { id: 'fire', name: 'Campfire', icon: '🔥', freq: 250 }
    ];

    useEffect(() => {
        fetchSleepSessions();
        fetchAlarmSettings();
        checkActiveSession();
    }, [user?.id]);

    // Alarm checker - runs every minute
    useEffect(() => {
        if (!alarmSettings?.alarm_enabled || !alarmSettings?.alarm_time) return;

        const checkAlarm = () => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            if (currentTime === alarmSettings.alarm_time && !isAlarmRinging) {
                triggerAlarm();
            }
        };

        // Check immediately
        checkAlarm();

        // Then check every 30 seconds
        const interval = setInterval(checkAlarm, 30000);

        return () => clearInterval(interval);
    }, [alarmSettings, isAlarmRinging]);

    const triggerAlarm = () => {
        setIsAlarmRinging(true);

        // Create alarm sound using Web Audio API
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime); // Alarm frequency
            gain.gain.setValueAtTime(0.5, ctx.currentTime);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();

            // Beep pattern: on for 0.5s, off for 0.5s, repeat
            let beepCount = 0;
            const beepInterval = setInterval(() => {
                if (beepCount % 2 === 0) {
                    gain.gain.setValueAtTime(0.5, ctx.currentTime);
                } else {
                    gain.gain.setValueAtTime(0, ctx.currentTime);
                }
                beepCount++;
                if (beepCount > 20) { // Stop after 10 seconds
                    clearInterval(beepInterval);
                }
            }, 500);

            setAlarmAudio({ ctx, osc, interval: beepInterval });
        } catch (error) {
            console.error('Alarm audio error:', error);
        }

        // Vibrate if supported
        if ('vibrate' in navigator) {
            navigator.vibrate([1000, 500, 1000, 500, 1000]);
        }

        // Show notification
        if (Notification.permission === 'granted') {
            new Notification('Good Morning! ☀️', {
                body: 'Time to wake up!',
                icon: '/pwa-192x192.png',
                tag: 'alarm',
                requireInteraction: true
            });
        }

        // Wake partner if enabled
        if (alarmSettings?.wake_partner && couple?.id) {
            supabase.from('notifications').insert({
                user_id: couple.partner_a === user.id ? couple.partner_b : couple.partner_a,
                type: 'wake_up',
                title: `${profile?.username} is waking up!`,
                message: 'Time to rise and shine together ☀️'
            });
        }
    };

    const stopAlarm = () => {
        if (alarmAudio) {
            if (alarmAudio.interval) clearInterval(alarmAudio.interval);
            if (alarmAudio.osc) alarmAudio.osc.stop();
            if (alarmAudio.ctx) alarmAudio.ctx.close();
            if (alarmAudio.pause) {
                alarmAudio.pause();
                alarmAudio.currentTime = 0;
            }
            setAlarmAudio(null);
        }
        setIsAlarmRinging(false);
    };

    const snoozeAlarm = () => {
        stopAlarm();
        // Re-enable alarm after snooze duration
        const snoozeDuration = alarmSettings?.snooze_duration || 5;
        setTimeout(() => {
            if (alarmSettings?.alarm_enabled) {
                triggerAlarm();
            }
        }, snoozeDuration * 60 * 1000);
    };

    const fetchSleepSessions = async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('sleep_sessions')
            .select('*')
            .or(`user_id.eq.${user.id},couple_id.eq.${couple?.id}`)
            .order('sleep_time', { ascending: false })
            .limit(7);

        if (data) setSleepSessions(data);
    };

    const fetchAlarmSettings = async () => {
        if (!user?.id) return;
        let { data } = await supabase
            .from('alarm_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Create default settings if not exists
        if (!data) {
            const { data: newSettings } = await supabase
                .from('alarm_settings')
                .insert({ user_id: user.id })
                .select()
                .single();
            data = newSettings;
        }

        setAlarmSettings(data);
    };

    const checkActiveSession = async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('sleep_sessions')
            .select('*')
            .eq('user_id', user.id)
            .is('wake_time', null)
            .order('sleep_time', { ascending: false })
            .limit(1);

        if (data && data.length > 0) {
            setCurrentSession(data[0]);
        }
    };

    const handleGoToSleep = async () => {
        const { data } = await supabase
            .from('sleep_sessions')
            .insert({
                user_id: user.id,
                couple_id: couple?.id,
                sleep_time: new Date().toISOString()
            })
            .select()
            .single();

        if (data) {
            setCurrentSession(data);
            // Update profile
            await supabase
                .from('profiles')
                .update({ last_slept_at: new Date().toISOString() })
                .eq('id', user.id);
        }
    };

    const handleWakeUp = async () => {
        if (!currentSession) return;

        const wakeTime = new Date();
        const sleepTime = new Date(currentSession.sleep_time);
        const duration = Math.floor((wakeTime - sleepTime) / 1000 / 60); // minutes

        await supabase
            .from('sleep_sessions')
            .update({
                wake_time: wakeTime.toISOString(),
                duration_minutes: duration
            })
            .eq('id', currentSession.id);

        setCurrentSession(null);
        fetchSleepSessions();
    };

    const toggleAlarm = async () => {
        if (!alarmSettings) return;
        const newEnabled = !alarmSettings.alarm_enabled;

        await supabase
            .from('alarm_settings')
            .update({ alarm_enabled: newEnabled })
            .eq('user_id', user.id);

        setAlarmSettings({ ...alarmSettings, alarm_enabled: newEnabled });
    };

    const updateAlarmTime = async (time) => {
        await supabase
            .from('alarm_settings')
            .update({ alarm_time: time })
            .eq('user_id', user.id);

        setAlarmSettings({ ...alarmSettings, alarm_time: time });
    };

    // Nature sounds player logic
    const togglePlayPause = async () => {
        if (!audioElement) {
            const soundUrl = natureSounds.find(s => s.id === currentSound)?.url;

            const audio = new Audio(soundUrl);
            audio.loop = true;
            audio.volume = volume;

            try {
                await audio.play();
                setAudioElement(audio);
                setIsPlaying(true);

            } catch (error) {
                console.error('❌ Audio play failed:', error);
                alert('Failed to play sound. Please try again.');
            }
        } else {
            if (isPlaying) {
                audioElement.pause();
                setIsPlaying(false);
            } else {
                try {
                    await audioElement.play();
                    setIsPlaying(true);
                } catch (error) {
                    console.error('❌ Audio resume failed:', error);
                }
            }
        }
    };

    const changeSound = (soundId) => {
        // Stop current sound if playing
        if (audioContext && oscillator) {
            oscillator.stop();
            audioContext.close();
            setAudioContext(null);
            setOscillator(null);
            setGainNode(null);
        }
        if (audioElement) {
            audioElement.pause();
            setAudioElement(null);
        }
        setCurrentSound(soundId);
        setIsPlaying(false);
    };

    const changeVolume = (newVolume) => {
        setVolume(newVolume);
        if (gainNode && audioContext) {
            gainNode.gain.setValueAtTime(newVolume * 0.3, audioContext.currentTime);
        }
        if (audioElement) {
            audioElement.volume = newVolume;
        }
    };

    return (
        <div className="space-y-6 pb-24">
            <header className="space-y-1 text-center">
                <h1 className="text-3xl font-bold text-love-400">Sleep Sync</h1>
                <p className="text-white/50 text-xs tracking-wider uppercase">Rest together, even apart</p>
            </header>

            {/* Sleep/Wake Button */}
            <motion.div
                whileHover={{ scale: 1.02 }}
                className="glass-panel p-6 rounded-3xl"
            >
                {currentSession ? (
                    <div className="text-center space-y-4">
                        <Moon className="w-16 h-16 text-indigo-400 mx-auto" />
                        <div>
                            <p className="text-white/70 text-sm">Sleeping since</p>
                            <p className="text-2xl font-bold text-white">
                                {new Date(currentSession.sleep_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-white/50 text-xs mt-1">
                                {(() => {
                                    const diff = new Date() - new Date(currentSession.sleep_time);
                                    const hours = Math.floor(diff / 1000 / 60 / 60);
                                    const minutes = Math.floor((diff / 1000 / 60) % 60);
                                    return `${hours}h ${minutes}m`;
                                })()}
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleWakeUp}
                            className="w-full py-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 rounded-2xl border border-yellow-500/30 hover:border-yellow-500/50 transition-colors font-bold"
                        >
                            <Sun className="w-5 h-5 inline mr-2" />
                            Good Morning!
                        </motion.button>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <Sun className="w-16 h-16 text-yellow-400 mx-auto" />
                        <p className="text-white/70">Ready for bed?</p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleGoToSleep}
                            className="w-full py-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30 hover:border-indigo-500/50 transition-colors font-bold"
                        >
                            <Moon className="w-5 h-5 inline mr-2 fill-current" />
                            Goodnight 💤
                        </motion.button>
                    </div>
                )}
            </motion.div>

            {/* Partner Status */}
            {partnerProfile?.last_slept_at && (
                <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-love-400" />
                        <div>
                            <p className="text-sm text-white/80">{partnerProfile.username} is sleeping</p>
                            <p className="text-xs text-white/40">
                                Since {new Date(partnerProfile.last_slept_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Nature Sounds Player */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
                <h3 className="text-xs uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Nature Sounds
                </h3>

                <div className="grid grid-cols-2 gap-2">
                    {natureSounds.map(sound => (
                        <motion.button
                            key={sound.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => changeSound(sound.id)}
                            className={`p-3 rounded-xl border transition-colors ${currentSound === sound.id
                                ? 'bg-white/10 border-white/20'
                                : 'bg-white/5 border-white/5 hover:bg-white/10'
                                }`}
                        >
                            <span className="text-2xl block mb-1">{sound.icon}</span>
                            <span className="text-xs text-white/70">{sound.name}</span>
                        </motion.button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={togglePlayPause}
                        className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/10 hover:bg-white/15 transition-colors"
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </motion.button>

                    <div className="flex-1 flex items-center gap-2">
                        <VolumeX className="w-4 h-4 text-white/40" />
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={(e) => changeVolume(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%, rgba(255,255,255,0.1) 100%)`
                            }}
                        />
                        <Volume2 className="w-4 h-4 text-white/40" />
                    </div>
                </div>
            </div>

            {/* Alarm Settings */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
                <h3 className="text-xs uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Alarm
                </h3>

                <div className="flex items-center justify-between">
                    <div>
                        <input
                            type="time"
                            value={alarmSettings?.alarm_time || '07:00'}
                            onChange={(e) => updateAlarmTime(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-lg font-mono focus:outline-none focus:border-white/20"
                        />
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleAlarm}
                        className={`px-6 py-2 rounded-xl border font-bold text-sm transition-colors ${alarmSettings?.alarm_enabled
                            ? 'bg-love-500/20 border-love-500/30 text-love-400'
                            : 'bg-white/5 border-white/10 text-white/50'
                            }`}
                    >
                        {alarmSettings?.alarm_enabled ? 'ON' : 'OFF'}
                    </motion.button>
                </div>

                {alarmSettings?.alarm_enabled && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-4 border-t border-white/5 space-y-2"
                    >
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={alarmSettings?.wake_partner || false}
                                onChange={async (e) => {
                                    await supabase
                                        .from('alarm_settings')
                                        .update({ wake_partner: e.target.checked })
                                        .eq('user_id', user.id);
                                    setAlarmSettings({ ...alarmSettings, wake_partner: e.target.checked });
                                }}
                                className="w-4 h-4 rounded accent-love-500"
                            />
                            <span className="text-sm text-white/70">Wake partner too 💕</span>
                        </label>
                    </motion.div>
                )}
            </div>

            {/* Sleep History */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
                <h3 className="text-xs uppercase font-bold text-white/40 tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Sleep History
                </h3>

                <div className="space-y-2">
                    {sleepSessions.length > 0 ? (
                        sleepSessions.map(session => {
                            const isMySession = session.user_id === user?.id;
                            return (
                                <div key={session.id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-bold text-white/90">
                                                    {isMySession ? 'You' : partnerProfile?.username || 'Partner'}
                                                </p>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isMySession ? 'bg-blue-500/20 text-blue-300' : 'bg-pink-500/20 text-pink-300'}`}>
                                                    {new Date(session.sleep_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/50">
                                                {new Date(session.sleep_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {session.wake_time && ` - ${new Date(session.wake_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                            </p>
                                        </div>
                                        {session.duration_minutes && (
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-indigo-400">
                                                    {Math.floor(session.duration_minutes / 60)}h {session.duration_minutes % 60}m
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center text-white/30 text-sm py-6">No sleep sessions yet</p>
                    )}
                </div>
            </div>

            {/* Alarm Ringing Modal */}
            <AnimatePresence>
                {isAlarmRinging && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center"
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ type: 'spring', damping: 20 }}
                                className="glass-panel p-8 rounded-3xl max-w-sm w-full mx-4 text-center space-y-6"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                >
                                    <Bell className="w-16 h-16 text-love-400 mx-auto" />
                                </motion.div>

                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Good Morning! ☀️</h2>
                                    <p className="text-white/60 text-sm">Time to wake up and shine!</p>
                                    <p className="text-white/40 text-xs mt-2">
                                        Alarm: {alarmSettings?.alarm_time}
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={snoozeAlarm}
                                        className="flex-1 py-4 bg-white/10 border border-white/20 rounded-2xl font-bold text-white/80 hover:bg-white/15 transition-colors"
                                    >
                                        Snooze {alarmSettings?.snooze_duration || 5}min
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={stopAlarm}
                                        className="flex-1 py-4 bg-gradient-to-r from-love-500/30 to-pink-500/30 border border-love-500/50 rounded-2xl font-bold text-love-300 hover:from-love-500/40 hover:to-pink-500/40 transition-colors"
                                    >
                                        Stop
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
