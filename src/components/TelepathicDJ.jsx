import React, { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import { Mic, Music, Play, Square, Upload, Radio, StopCircle, RefreshCw, Volume2, Inbox } from 'lucide-react';
import { extractVideoID } from '../lib/youtube';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function TelepathicDJ({ theme, djState, setDjState }) {
    const { user, couple, partnerProfile, profile } = useAuth();

    // De-structure for easier usage, but remember updates must go through setDjState
    const { youtubeLink, videoId, voiceFile, incomingVibe } = djState || {};

    // Helper to update partial state
    const updateState = (updates) => setDjState(prev => ({ ...prev, ...updates }));

    // Voice State (Transient - kept local for now, or could be lifted if we want to support background recording)
    // const [voiceFile, setVoiceFile] = useState(null); // NOW LIFTED
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [stage, setStage] = useState('idle'); // idle, playing_voice, playing_music
    const [isTransmitting, setIsTransmitting] = useState(false);

    // Incoming State (NOW LIFTED)
    // const [incomingVibe, setIncomingVibe] = useState(null);

    // Refs
    const audioRef = useRef(null);
    const playerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // Check for incoming vibes on mount
    useEffect(() => {
        if (!couple?.id) return;

        const fetchIncoming = async () => {
            // Only fetch if we don't already have one loaded or played
            if (incomingVibe) return;

            const { data } = await supabase
                .from('radio_transmissions')
                .select('*')
                .eq('couple_id', couple.id)
                .neq('sender_id', user.id) // Only from partner
                .eq('is_played', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) updateState({ incomingVibe: data });
        };

        fetchIncoming();

        // Listen for new vibes
        const channel = supabase.channel(`radio:${couple.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'radio_transmissions',
                filter: `couple_id=eq.${couple.id}`
            }, (payload) => {
                if (payload.new.sender_id !== user.id) {
                    updateState({ incomingVibe: payload.new });
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [couple?.id, user?.id]);


    // Handlers
    const handleLinkChange = (e) => {
        const val = e.target.value;
        const id = extractVideoID(val);
        updateState({ youtubeLink: val, videoId: id || videoId });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            updateState({ voiceFile: file });
        }
    };

    // Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const file = new File([blob], "voice_note.webm", { type: "audio/webm" });
                updateState({ voiceFile: file });
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    // Transmission Logic (Remote)
    const transmitVibe = async () => {
        if (!voiceFile || !videoId || !couple) return;

        setIsTransmitting(true);
        try {
            // 1. Upload Voice Note
            const fileName = `${couple.id}/${Date.now()}_${voiceFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('voice-notes')
                .upload(fileName, voiceFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('voice-notes')
                .getPublicUrl(fileName);

            // 2. Insert Transmission Record
            const { data: transData, error: transError } = await supabase
                .from('radio_transmissions')
                .insert([{
                    couple_id: couple.id,
                    sender_id: user.id,
                    youtube_link: youtubeLink,
                    voice_note_url: publicUrl,
                    message: "Sent a vibe"
                }])
                .select()
                .single();

            if (transError) throw transError;

            // 3. Send Notification to Partner
            const partnerId = couple.partner_a === user.id ? couple.partner_b : couple.partner_a;
            if (partnerId) {
                // Use our profile for the sender name in the message
                const senderName = profile?.username || 'Your partner';
                await supabase.from('notifications').insert([{
                    user_id: partnerId,
                    type: 'radio',
                    title: 'Incoming Vibe 📻',
                    message: `${senderName} sent a Telepathic DJ transmission!`,
                    metadata: { transmission_id: transData.id }
                }]);
            }

            // Reset UI
            updateState({ voiceFile: null, youtubeLink: '', videoId: null });
            alert("Vibe Transmitted! 📡");

        } catch (error) {
            console.error("Transmission failed:", error);
            alert(`Failed to transmit: ${error.message || error.error_description || "Unknown Error"}`);
        } finally {
            setIsTransmitting(false);
        }
    };

    // Playback Logic (Local or Remote)
    const playSequence = (isRemote = false) => {
        setIsPlaying(true);
        setStage('playing_voice');

        if (audioRef.current) {
            if (isRemote && incomingVibe) {
                audioRef.current.src = incomingVibe.voice_note_url;
            } else if (voiceFile) {
                audioRef.current.src = URL.createObjectURL(voiceFile);
            }
            audioRef.current.play();
        }

        // Prepare YouTube
        const targetId = isRemote && incomingVibe ? extractVideoID(incomingVibe.youtube_link) : videoId;
        // We update state so the player renders the right video
        if (isRemote && incomingVibe) {
            updateState({ youtubeLink: incomingVibe.youtube_link, videoId: targetId });
        }
    };

    const handleVoiceEnded = async () => {
        if (stage === 'playing_voice' && isPlaying) {

            setStage('playing_music');

            // Start YouTube
            if (playerRef.current) {
                playerRef.current.internalPlayer.unMute();
                playerRef.current.internalPlayer.playVideo();
            }

            // Mark as played if remote
            if (incomingVibe) {
                await supabase
                    .from('radio_transmissions')
                    .update({ is_played: true })
                    .eq('id', incomingVibe.id);
                // Don't clear immediately so they can finish the song, but next load it's gone
            }
        }
    };

    const onPlayerReady = (event) => {
        playerRef.current = event.target;
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const borderColor = theme?.borderColor || 'border-white/10';

    const dismissVibe = async () => {
        if (!incomingVibe) return;

        // Optimistic UI Update
        const vibeId = incomingVibe.id;
        updateState({ incomingVibe: null });

        try {
            const { error } = await supabase
                .from('radio_transmissions')
                .update({ is_played: true })
                .eq('id', vibeId);

            if (error) throw error;
        } catch (err) {
            console.error("Error dismissing vibe:", err);
            // Optionally revert UI if critical, but for dismiss it's better to just log
        }
    };

    if (incomingVibe && !isPlaying) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center animate-pulse">
                    <Radio className="w-12 h-12 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Incoming Vibe!</h2>
                    <p className="text-white/60 text-sm mt-2">{partnerProfile?.username || 'Your partner'} has sent you a broadcast.</p>
                </div>
                <button
                    onClick={() => playSequence(true)}
                    className="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform shadow-xl shadow-indigo-500/20 flex items-center gap-2"
                >
                    <Play className="fill-current w-5 h-5" /> Tune In
                </button>
                <button onClick={dismissVibe} className="text-xs text-white/30 hover:text-white">
                    Dismiss
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4 relative overflow-hidden">
            {/* Header */}
            <div className="text-center mb-6 z-10">
                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                    <Radio className="w-6 h-6 text-indigo-400" />
                    Telepathic DJ
                </h2>
                <p className="text-xs text-white/50 uppercase tracking-widest mt-1">Transmit a Vibe</p>
            </div>

            {/* Main Interface */}
            <div className="flex-1 flex flex-col gap-6 z-10">

                {/* Step 1: The Music */}
                <div className={`liquid-glass p-4 rounded-2xl border ${borderColor} transition-all ${stage === 'playing_music' ? 'ring-2 ring-indigo-500/50' : ''}`}>
                    <label className="text-xs font-bold text-white/60 mb-2 block flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        1. The Soundtrack (YouTube)
                    </label>
                    <input
                        type="text"
                        placeholder="Paste YouTube Link..."
                        value={youtubeLink}
                        onChange={handleLinkChange}
                        disabled={isPlaying || isRecording || isTransmitting}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {videoId && (
                        <div className="mt-2 rounded-lg overflow-hidden h-32 relative">
                            <div className={`w-full h-full ${stage === 'playing_music' ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                                <YouTube
                                    videoId={videoId}
                                    opts={{ height: '100%', width: '100%', playerVars: { autoplay: 0, controls: 1, showinfo: 0, modestbranding: 1, playsinline: 1 } }}
                                    onReady={onPlayerReady}
                                    className="w-full h-full"
                                />
                            </div>
                            {stage !== 'playing_music' && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                                    <span className="text-xs text-white/70 italic">Ready to cue</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Step 2: The Voice */}
                <div className={`liquid-glass p-4 rounded-2xl border ${borderColor} transition-all ${stage === 'playing_voice' ? 'ring-2 ring-rose-500/50' : ''}`}>
                    <label className="text-xs font-bold text-white/60 mb-2 block flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        2. Your Voice Note
                    </label>

                    {!voiceFile && !isRecording ? (
                        <div className="flex gap-2">
                            <button
                                onClick={startRecording}
                                disabled={isPlaying || isTransmitting}
                                className="flex-1 border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Mic className="w-5 h-5 text-rose-400" />
                                </div>
                                <span className="text-xs text-white/40 group-hover:text-white/70">Record Voice</span>
                            </button>

                            <label className="flex-1 cursor-pointer group">
                                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" disabled={isPlaying} />
                                <div className="h-full border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                                    <Upload className="w-6 h-6 text-white/30 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-white/40">Upload File</span>
                                </div>
                            </label>
                        </div>
                    ) : isRecording ? (
                        <div className="flex flex-col items-center justify-center bg-rose-500/10 border border-rose-500/30 p-6 rounded-xl animate-pulse">
                            <div className="text-rose-400 font-bold text-2xl mb-2">{formatTime(recordingTime)}</div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping"></span>
                                <span className="text-xs text-rose-300 uppercase tracking-widest">Recording...</span>
                            </div>
                            <button
                                onClick={stopRecording}
                                className="px-6 py-2 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition-colors flex items-center gap-2"
                            >
                                <StopCircle className="w-4 h-4" /> Stop Recording
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                                    <Mic className="w-5 h-5 text-rose-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white/90 truncate max-w-[150px]">{voiceFile.name}</div>
                                    <div className="text-xs text-white/40 flex items-center gap-1">
                                        Ready • {(voiceFile.size / 1024).toFixed(0)}kb
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {!isPlaying && (
                                    <button onClick={() => updateState({ voiceFile: null })} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-red-400 transition-colors">
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <audio ref={audioRef} onEnded={handleVoiceEnded} className="hidden" crossOrigin="anonymous" />

                    {stage === 'playing_voice' && (
                        <div className="mt-3 h-8 flex items-center justify-center gap-1">
                            {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((i, idx) => (
                                <motion.div
                                    key={idx}
                                    className="w-1 bg-rose-400 rounded-full"
                                    animate={{ height: [10, 25, 10] }}
                                    transition={{ duration: 0.5, repeat: Infinity, delay: idx * 0.1 }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <button
                    onClick={isPlaying ? () => window.location.reload() : transmitVibe}
                    disabled={!voiceFile || !videoId || isRecording || isTransmitting}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${isPlaying
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : isTransmitting
                                ? 'bg-indigo-500 text-white animate-pulse'
                                : 'bg-white text-black hover:bg-gray-200 hover:scale-[1.02] shadow-xl shadow-white/10'
                        }
            `}
                >
                    {isPlaying ? (
                        <span className="flex items-center justify-center gap-2">
                            <Square className="w-4 h-4 fill-current" /> Stop / Reset
                        </span>
                    ) : isTransmitting ? (
                        <span className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" /> Uploading...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <Radio className="w-4 h-4" /> Transmit Vibe
                        </span>
                    )}
                </button>

            </div>
        </div>
    );
}
