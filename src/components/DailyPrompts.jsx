import React, { useState, useEffect, useRef } from 'react';
import { MessageCircleHeart, Lock, BellRing, Clock, Camera, CheckCircle, Flame, Image as ImageIcon, X, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { generateDailyQuestion } from '../lib/gemini';
import confetti from 'canvas-confetti';

const QUESTIONS = [
    "What is your favorite memory of us?",
    "What is one thing you appreciate about me?",
    "What is your dream vacation with me?",
    "If we could trade lives for a day, what would you do?",
    "What song reminds you of me?",
    "What is one goal you want to achieve together?",
    "What small gesture makes you feel loved?",
    "What was your first impression of me?",
];

const TypewriterText = ({ text }) => {
    // Split text but preserve words to avoid breaking layout messily? 
    // Character split is fine for typewriter effect if wrapped properly.
    // Ideally split by words, then characters, but simple char split usually works if flex/span display is handled.
    // Using simple char split with \u00A0 for spaces.
    const characters = Array.from(text);

    return (
        <motion.p
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.03 } }
            }}
            className="inline text-xl leading-relaxed text-white/90 relative"
        >
            {characters.map((char, index) => (
                <motion.span
                    key={index}
                    variants={{
                        hidden: { opacity: 0, y: 5 },
                        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200 } }
                    }}
                >
                    {char}
                </motion.span>
            ))}
            <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "steps(2)" }}
                className="inline-block w-0.5 h-[1em] bg-love-300 ml-1 align-middle"
            />
        </motion.p>
    );
};

const RomanticLoader = () => (
    <div className="flex flex-col items-center justify-center h-64 p-8 text-center space-y-8">
        <div className="flex items-center gap-3">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        y: [0, -10, 0],
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: "easeInOut"
                    }}
                >
                    <MessageCircleHeart className="w-8 h-8 text-love-400 fill-love-400/20" />
                </motion.div>
            ))}
        </div>
        <motion.p
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-love-200/60 font-serif italic text-sm tracking-widest"
        >
            The Muse is composing...
        </motion.p>
    </div>
);

export default function DailyPrompts() {
    const { profile, couple, showNotification } = useAuth();
    const [prompt, setPrompt] = useState(null);
    const [myAnswer, setMyAnswer] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [nudgeSent, setNudgeSent] = useState(false);

    // Persist submitting state to prevent polling clashes
    const submittingRef = useRef(submitting);
    useEffect(() => { submittingRef.current = submitting; }, [submitting]);

    // Photo State
    const [selectedImage, setSelectedImage] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [processingImage, setProcessingImage] = useState(false);

    // Image Viewer State
    const [viewingImage, setViewingImage] = useState(null);

    // Stable IDs to prevent unnecessary re-renders from object reference changes
    const coupleId = couple?.id;
    const profileId = profile?.id;

    // Identify which partner I am (A or B)
    const isPartnerA = couple?.partner_a === profileId;
    const isPartnerB = couple?.partner_b === profileId;
    const myAnswerField = isPartnerA ? 'answer_a' : 'answer_b';
    const partnerAnswerField = isPartnerA ? 'answer_b' : 'answer_a';
    const myPhotoField = isPartnerA ? 'photo_a' : 'photo_b';

    const fileInputRef = useRef(null);

    const fetchPrompt = React.useCallback(async (isSilent = false) => {
        if (!coupleId || submittingRef.current) return;

        try {
            // Local Time Logic -> UTC Logic for consistency
            const d = new Date();
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;

            // Fetch existing
            let { data, error } = await supabase
                .from('daily_prompts')
                .select('*')
                .eq('couple_id', coupleId)
                .gte('created_at', `${today}T00:00:00+00:00`)
                .lt('created_at', `${today}T23:59:59+00:00`)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!data && !isSilent) {
                // Creation logic (Only on initial explicit load to avoid race conditions)

                // Double check if partner created it just now (race condition mitigation)
                const { data: existingData } = await supabase
                    .from('daily_prompts')
                    .select('*')
                    .eq('couple_id', coupleId)
                    .gte('created_at', `${today}T00:00:00+00:00`)
                    .limit(1)
                    .maybeSingle();

                if (existingData) {
                    data = existingData;
                } else {
                    // Start with AI generation
                    let questionText = null;
                    try {
                        questionText = await generateDailyQuestion();
                    } catch (e) {
                        // Fallback silently if AI fails
                    }

                    if (!questionText) {
                        questionText = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
                    }

                    const { data: newPrompt, error: createError } = await supabase
                        .from('daily_prompts')
                        .insert([{
                            couple_id: coupleId,
                            question_text: questionText,
                            created_at: new Date().toISOString() // Ensure matches logic
                        }])
                        .select()
                        .single();

                    if (createError) throw createError;
                    data = newPrompt;
                }
            }

            if (data) {
                setPrompt(prev => {
                    // Check if actually changed to avoid redraws
                    if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                    return data;
                });

                // Only sync text input if we aren't typing (silent=false / initial load)
                if (!isSilent && data[myAnswerField]) {
                    setMyAnswer(data[myAnswerField]);
                } else if (!isSilent) {
                    // Restore draft from local storage if exists and not submitted yet
                    const draft = localStorage.getItem(`daily_answer_draft_${coupleId}_${today}`);
                    if (draft) setMyAnswer(draft);
                }
            }

        } catch (err) {
            console.error("Fetch error", err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [coupleId, myAnswerField]);

    // Initial Load & Polling
    useEffect(() => {
        if (!coupleId) return;

        // Initial Fetch
        fetchPrompt(false);

        // Poll every 3s
        const interval = setInterval(() => {
            fetchPrompt(true);
        }, 3000);

        return () => clearInterval(interval);
    }, [coupleId, fetchPrompt]);

    // Realtime (Backup for Polling)
    useEffect(() => {
        if (!coupleId) return;
        const channel = supabase.channel(`prompts:${coupleId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'daily_prompts',
                filter: `couple_id=eq.${coupleId}`
            }, (payload) => {
                setPrompt(payload.new);
            })
            .on('broadcast', { event: 'nudge' }, (payload) => {
                if (payload.sender_id !== profileId) {
                    showNotification("Partner Nudge", "💕 Partner is nudging you to answer!", "heartbeat");
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [coupleId, profileId]);

    // Countdown Timer (11 PM - 12 AM)
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const hours = now.getHours();

            // Check if it's past 11 PM (23:00)
            if (hours === 23) {
                const midnight = new Date(now);
                midnight.setHours(24, 0, 0, 0);
                const diff = midnight - now;

                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${m}m ${s}s`);
            } else {
                setTimeLeft(null);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handlePhotoSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProcessingImage(true);

            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800; // Limit helps upload reliability
                        const MAX_HEIGHT = 800;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Compress to JPEG 0.7 quality
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        setSelectedImage(dataUrl);
                    } catch (err) {
                        showNotification("Error", "Failed to process image. Try a different one.", "system");
                    } finally {
                        setProcessingImage(false);
                    }
                };
                img.onerror = () => {
                    setProcessingImage(false);
                    showNotification("Error", "Invalid image file.", "system");
                };
                img.src = ev.target.result;
            };
            reader.onerror = () => {
                setProcessingImage(false);
                showNotification("Error", "Failed to read file.", "system");
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadPhoto = async () => {
        if (!selectedImage) return;
        setUploadingPhoto(true);

        try {
            // Optimistic Update
            setPrompt(prev => ({ ...prev, [myPhotoField]: selectedImage }));

            // 1. Update Daily Prompt Photo
            const { error } = await supabase
                .from('daily_prompts')
                .update({ [myPhotoField]: selectedImage }) // Storing Base64 for now
                .eq('id', prompt.id);

            if (error) {
                // Revert if error
                setPrompt(prev => ({ ...prev, [myPhotoField]: null }));
                throw error;
            }

            // Force Refetch to ensure sync
            const { data: updatedPrompt } = await supabase
                .from('daily_prompts')
                .select('*')
                .eq('id', prompt.id)
                .single();

            if (updatedPrompt) setPrompt(updatedPrompt);

        } catch (err) {
            console.error("Error uploading photo:", err);
            showNotification("Upload Failed", err.message, "system");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const submitAnswer = async () => {
        if (!myAnswer.trim()) return;
        setSubmitting(true);

        try {
            // Optimistic Update
            setPrompt(prev => ({ ...prev, [myAnswerField]: myAnswer }));

            const { error } = await supabase
                .from('daily_prompts')
                .update({ [myAnswerField]: myAnswer })
                .eq('id', prompt.id);

            if (error) {
                setPrompt(prev => ({ ...prev, [myAnswerField]: '' }));
                throw error;
            }

            // Check Streak (Client-side approximation)
            // If partner also answered, maybe trigger confetti
            const partnerAns = prompt[partnerAnswerField];
            if (partnerAns) {
                triggerConfetti();
            }

            // Force Refetch
            const { data: updatedPrompt } = await supabase
                .from('daily_prompts')
                .select('*')
                .eq('id', prompt.id)
                .single();

            if (updatedPrompt) setPrompt(updatedPrompt);

        } catch (err) {
            console.error("Error submitting answer:", err);
            showNotification("Error", "Failed to save answer.", "system");
        } finally {
            setSubmitting(false);
        }
    };

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ef4444', '#ec4899', '#a855f7'] // Love colors
        });
    };

    const sendNudge = async () => {
        setNudgeSent(true);
        await supabase.channel(`prompts:${couple.id}`).send({
            type: 'broadcast',
            event: 'nudge',
            payload: { sender_id: profile.id }
        });
        setTimeout(() => setNudgeSent(false), 5000);
    };

    const handleDownload = (dataUrl) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `lovesync-memory-${new Date().toISOString().split('T')[0]}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <RomanticLoader />;

    const myResponse = prompt?.[myAnswerField];
    const partnerResponse = prompt?.[partnerAnswerField];
    const myPhoto = prompt?.[myPhotoField];
    const partnerPhoto = prompt?.[isPartnerA ? 'photo_b' : 'photo_a'];
    const bothAnswered = myResponse && partnerResponse;

    // STAGE 1: PHOTO UPLOAD
    if (!myPhoto) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-love-500/20 blur-xl rounded-full"></div>
                    <Camera className="w-16 h-16 text-love-400 relative z-10" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-2">Daily Snapshot</h2>
                    <p className="text-white/60 text-sm">Upload a photo of your moment to unlock today's question.</p>
                </div>

                {selectedImage ? (
                    <div className="w-full max-w-xs space-y-4">
                        <img src={selectedImage} alt="Preview" className="w-full h-64 object-cover rounded-2xl border-2 border-love-500/30 shadow-2xl" />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="flex-1 py-3 bg-white/10 rounded-xl font-medium"
                            >
                                Retake
                            </button>
                            <button
                                onClick={uploadPhoto}
                                disabled={uploadingPhoto}
                                className="flex-1 py-3 bg-love-600 rounded-xl font-bold flex justify-center items-center gap-2"
                            >
                                {uploadingPhoto ? 'Uploading...' : 'Use Photo'}
                                <CheckCircle className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => fileInputRef.current.click()}
                        disabled={processingImage}
                        className="w-full max-w-xs py-4 border-2 border-dashed border-love-500/30 rounded-2xl flex flex-col items-center gap-2 hover:bg-love-500/5 transition-colors disabled:opacity-50"
                    >
                        {processingImage ? (
                            <div className="w-8 h-8 rounded-full border-2 border-love-500 border-t-transparent animate-spin" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-love-500/50" />
                        )}
                        <span className="text-sm font-medium text-love-200">
                            {processingImage ? 'Processing...' : 'Tap to select photo'}
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoSelect}
                        />
                    </button>
                )}
            </div>
        );
    }

    // STAGE 2: QUESTION & ANSWER
    return (
        <div className="flex flex-col h-full relative">
            {/* Header / Countdown */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold">Daily Question</h2>
                    <p className="text-xs text-white/50">{new Date().toLocaleDateString()}</p>
                </div>
                {timeLeft && (
                    <div className="bg-red-500/20 border border-red-500/50 px-3 py-1 rounded-lg flex items-center gap-2 animate-pulse">
                        <Clock className="w-3 h-3 text-red-400" />
                        <span className="text-xs font-mono text-red-200">{timeLeft} left</span>
                    </div>
                )}
            </div>

            {/* Question Card */}
            <div className="liquid-glass p-6 rounded-2xl mb-6 relative overflow-hidden flex flex-col items-center justify-center text-center">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <MessageCircleHeart className="w-24 h-24 text-love-500" />
                </div>
                <div className="relative z-10 w-full min-h-[60px]">
                    {prompt?.question_text && <TypewriterText text={prompt.question_text} />}
                </div>
            </div>

            {/* Answers Section */}
            <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide pb-20">

                {/* My Answer State */}
                {!myResponse ? (
                    <div className="space-y-3">
                        {/* Show Preview of My Photo here too mostly to match partner UI for symmetry */}
                        {myPhoto && (
                            <div
                                onClick={() => setViewingImage(myPhoto)}
                                className="w-full h-32 rounded-xl overflow-hidden relative group cursor-pointer border border-white/10"
                            >
                                <img src={myPhoto} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Me" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                    <ImageIcon className="w-6 h-6 text-white" />
                                </div>
                                <div className="absolute bottom-2 left-2 text-[10px] bg-black/50 px-2 py-1 rounded text-white">Your Snapshot</div>
                            </div>
                        )}

                        <textarea
                            value={myAnswer}
                            onChange={(e) => {
                                setMyAnswer(e.target.value);
                                // Save draft
                                const d = new Date();
                                const today = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                                localStorage.setItem(`daily_answer_draft_${coupleId}_${today}`, e.target.value);
                            }}
                            placeholder="Type your answer based on truth..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 min-h-[120px] focus:outline-none focus:border-love-500/50 transition-colors placeholder:text-white/20"
                        />
                        <button
                            onClick={submitAnswer}
                            disabled={submitting || !myAnswer.trim()}
                            className="w-full py-3 bg-love-600 hover:bg-love-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {submitting ? 'Saving...' : 'Lock Answer'}
                            <Lock className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="liquid-glass p-4 rounded-xl border border-love-500/30 bg-love-500/5 space-y-3">
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-love-300 uppercase tracking-wide font-bold">You</p>
                        </div>
                        {myPhoto && (
                            <div
                                onClick={() => setViewingImage(myPhoto)}
                                className="w-full h-48 rounded-lg overflow-hidden cursor-pointer relative group"
                            >
                                <img src={myPhoto} className="w-full h-full object-cover" alt="My snippet" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ImageIcon className="text-white w-8 h-8" />
                                </div>
                            </div>
                        )}
                        <p className="text-sm text-white/90 italic">"{myResponse}"</p>
                    </div>
                )}

                {/* Partner Answer State */}
                <div className="liquid-glass p-4 rounded-xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-white/40 uppercase tracking-wide font-bold">Partner</p>
                        {!partnerResponse && (
                            <button
                                onClick={sendNudge}
                                disabled={nudgeSent}
                                className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                                <BellRing className="w-3 h-3" />
                                {nudgeSent ? 'Nudged!' : 'Nudge'}
                            </button>
                        )}
                    </div>

                    {bothAnswered ? (
                        <motion.div
                            initial={{ opacity: 0, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            className="space-y-3"
                        >
                            {partnerPhoto && (
                                <div
                                    onClick={() => setViewingImage(partnerPhoto)}
                                    className="w-full h-48 rounded-lg overflow-hidden cursor-pointer relative group border border-white/10"
                                >
                                    <img src={partnerPhoto} className="w-full h-full object-cover" alt="Partner snippet" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <ImageIcon className="text-white w-8 h-8" />
                                    </div>
                                </div>
                            )}
                            <p className="text-sm text-white/90 italic">"{partnerResponse}"</p>
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 gap-2 opacity-50">
                            {partnerResponse ? (
                                <>
                                    <Lock className="w-6 h-6 text-love-400" />
                                    <p className="text-xs">Answer hidden until you reply</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-white/30 animate-spin-slow" />
                                    <p className="text-xs">Waiting for partner...</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* Image Viewer Modal */}
            <AnimatePresence>
                {viewingImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md"
                        onClick={() => setViewingImage(null)}
                    >
                        <button
                            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"
                            onClick={() => setViewingImage(null)}
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>

                        <img
                            src={viewingImage}
                            className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl mb-6"
                            alt="Full viewing"
                            onClick={(e) => e.stopPropagation()}
                        />

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(viewingImage);
                            }}
                            className="py-3 px-8 bg-white text-black rounded-full font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors"
                        >
                            <Download className="w-5 h-5" />
                            Save to Gallery
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
