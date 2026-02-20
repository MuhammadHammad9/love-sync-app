import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, X, Trash2, Calendar, Download, Sparkles, Wand2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { generateMagicImage } from '../lib/gemini';

export default function MemoriesGallery() {
    const { couple, profile, showNotification } = useAuth();
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // UI States
    const [selectedId, setSelectedId] = useState(null); // For Lightbox
    const [isSelectionMode, setIsSelectionMode] = useState(false); // For Magic Mode
    const [selectedForMagic, setSelectedForMagic] = useState([]);
    const [showMagicModal, setShowMagicModal] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState('');
    const [generating, setGenerating] = useState(false);

    const fileInputRef = useRef(null);

    // Fetch Memories
    useEffect(() => {
        if (!couple) return;

        const fetchMemories = async () => {
            try {
                const { data, error } = await supabase
                    .from('memories')
                    .select('*')
                    .eq('couple_id', couple.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setMemories(data || []);
            } catch (err) {
                console.error("Error fetching memories:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMemories();

        // Realtime Subscription
        const channel = supabase.channel(`memories_channel:${couple.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'memories',
                filter: `couple_id=eq.${couple.id}`
            }, (payload) => {
                setMemories(prev => [payload.new, ...prev]);
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'memories',
                filter: `couple_id=eq.${couple.id}`
            }, (payload) => {
                setMemories(prev => prev.filter(m => m.id !== payload.old.id));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [couple]);

    const handleFileSelect = async (e) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setUploading(true);
        processAndUpload(file);
    };

    const processAndUpload = (fileOrBlob) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    // Compress / Resize
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
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

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

                    // Optimistic UI Item
                    const tempId = 'temp-' + Date.now();
                    const optimisticItem = {
                        id: tempId,
                        couple_id: couple.id,
                        uploaded_by: profile.id,
                        image_url: dataUrl,
                        created_at: new Date().toISOString(),
                        isOptimistic: true
                    };
                    setMemories(prev => [optimisticItem, ...prev]);

                    // Upload to DB
                    const { data, error } = await supabase
                        .from('memories')
                        .insert([{
                            couple_id: couple.id,
                            uploaded_by: profile.id,
                            image_url: dataUrl,
                            caption: magicPrompt ? `✨ Magic: ${magicPrompt}` : ''
                        }])
                        .select()
                        .single();

                    if (error) throw error;

                    // Replace optimistic item with real one
                    setMemories(prev => prev.map(m => m.id === tempId ? data : m));

                    // Cleanup Magic State if applicable
                    if (showMagicModal) {
                        setShowMagicModal(false);
                        setIsSelectionMode(false);
                        setSelectedForMagic([]);
                        setMagicPrompt('');
                    }

                } catch (err) {
                    console.error("Upload failed", err);
                    showNotification("Upload Error", "Failed to upload memory.", "system");
                    setMemories(prev => prev.filter(m => !m.isOptimistic));
                } finally {
                    setUploading(false);
                    setGenerating(false);
                }
            };
            img.src = ev.target.result;
        };

        if (fileOrBlob instanceof Blob) {
            reader.readAsDataURL(fileOrBlob);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Remove this memory?")) return;

        // Optimistic Delete
        const prevMemories = [...memories];
        setMemories(prev => prev.filter(m => m.id !== id));
        if (selectedId === id) setSelectedId(null);

        const { error } = await supabase
            .from('memories')
            .delete()
            .eq('id', id);

        if (error) {
            showNotification("Delete Failed", "Could not remove memory.", "system");
            setMemories(prevMemories);
        }
    };

    // Magic AI Functions
    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            setIsSelectionMode(false);
            setSelectedForMagic([]);
        } else {
            setIsSelectionMode(true);
        }
    };

    const handleImageSelect = (id) => {
        if (!isSelectionMode) {
            setSelectedId(id);
            return;
        }

        if (selectedForMagic.includes(id)) {
            setSelectedForMagic(prev => prev.filter(itemId => itemId !== id));
        } else {
            if (selectedForMagic.length < 2) {
                setSelectedForMagic(prev => [...prev, id]);
            } else {
                // Replace the first one or warn? Just toggle last one
                setSelectedForMagic(prev => [prev[1], id]);
            }
        }
    };

    const handleGenerateMagic = async () => {
        if (!magicPrompt.trim()) return;
        setGenerating(true);

        try {
            // Generate Image URL (Instant)
            const imageUrl = await generateMagicImage(magicPrompt); // This returns a URL

            if (!imageUrl) throw new Error("Generation failed");

            // Optimistic UI Item
            const tempId = 'temp-' + Date.now();
            const optimisticItem = {
                id: tempId,
                couple_id: couple.id,
                uploaded_by: profile.id,
                image_url: imageUrl,
                created_at: new Date().toISOString(),
                isOptimistic: true // UI will opacity this until real save confirms (which is fast now)
            };
            setMemories(prev => [optimisticItem, ...prev]);

            // Save URL directly to DB (Skip huge download/upload cycle)
            const { data, error } = await supabase
                .from('memories')
                .insert([{
                    couple_id: couple.id,
                    uploaded_by: profile.id,
                    image_url: imageUrl,
                    caption: `✨ Magic: ${magicPrompt}`
                }])
                .select()
                .single();

            if (error) throw error;

            // Replace optimistic item with real one
            setMemories(prev => prev.map(m => m.id === tempId ? data : m));

            // Reset UI
            setShowMagicModal(false);
            setIsSelectionMode(false);
            setSelectedForMagic([]);
            setMagicPrompt('');

        } catch (err) {
            console.error("Magic generation failed:", err);
            showNotification("Magic Failed", err.message || "Magic spell failed! Please check your internet connection and try again.", "system");
            setMemories(prev => prev.filter(m => !m.isOptimistic));
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col relative">
            <header className="flex justify-between items-center mb-6 z-10 relative">
                <div>
                    <h2 className="text-xl font-bold">Memories</h2>
                    <p className="text-xs text-white/50">{memories.length} moments captured</p>
                </div>
                <div className="flex gap-2">
                    {/* Magic Toggle */}
                    <button
                        onClick={toggleSelectionMode}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSelectionMode ? 'bg-yellow-400 text-black rotate-12 scale-110' : 'bg-white/10 hover:bg-white/20 text-yellow-200'}`}
                    >
                        <Sparkles className="w-5 h-5" />
                    </button>

                    {/* Add Photo */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || isSelectionMode}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {uploading ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                    />
                </div>
            </header>

            {/* Magic Action Bar */}
            <AnimatePresence>
                {isSelectionMode && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-16 left-0 right-0 z-20"
                    >
                        <div className="bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-md p-3 rounded-xl flex items-center justify-between">
                            <span className="text-sm font-medium text-yellow-200">
                                {selectedForMagic.length}/2 Selected for Magic
                            </span>
                            <button
                                onClick={() => setShowMagicModal(true)}
                                disabled={selectedForMagic.length === 0}
                                className="px-4 py-2 bg-yellow-400 text-black text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-yellow-300 transition-colors"
                            >
                                <Wand2 className="w-3 h-3" />
                                Create
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-love-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : memories.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-50">
                    <Camera className="w-12 h-12 mb-4 text-white/30" />
                    <p>No memories yet.</p>
                    <p className="text-xs">Tap + to add your first photo.</p>
                </div>
            ) : (
                <div className={`grid grid-cols-3 gap-2 pb-24 overflow-y-auto scrollbar-hide content-start transition-all duration-300 ${isSelectionMode ? 'pt-14' : ''}`}>
                    {memories.map((memory) => {
                        const isSelected = selectedForMagic.includes(memory.id);
                        return (
                            <motion.div
                                layoutId={`memory-${memory.id}`}
                                key={memory.id}
                                onClick={() => handleImageSelect(memory.id)}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{
                                    opacity: 1,
                                    scale: isSelectionMode && isSelected ? 0.9 : 1,
                                    borderColor: isSelected ? '#FACC15' : 'transparent',
                                    borderWidth: isSelected ? 4 : 0
                                }}
                                className={`aspect-square rounded-xl overflow-hidden cursor-pointer relative group bg-white/5 ${memory.isOptimistic ? 'opacity-50' : ''}`}
                            >
                                <img
                                    src={memory.image_url}
                                    alt="Memory"
                                    className={`w-full h-full object-cover transition-all duration-500 ${isSelectionMode && !isSelected ? 'grayscale opacity-50' : 'group-hover:scale-110'}`}
                                    loading="lazy"
                                />
                                {isSelected && (
                                    <div className="absolute top-2 right-2 bg-yellow-400 text-black rounded-full p-1 shadow-lg">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Lightbox */}
            <AnimatePresence>
                {selectedId && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedId(null)}
                    >
                        {(() => {
                            const memory = memories.find(m => m.id === selectedId);
                            if (!memory) return null;
                            return (
                                <motion.div
                                    layoutId={`memory-${memory.id}`}
                                    className="relative max-w-lg w-full max-h-[80vh] flex flex-col items-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <img
                                        src={memory.image_url}
                                        className="w-full h-auto max-h-[70vh] rounded-2xl shadow-2xl object-contain bg-black"
                                    />
                                    <div className="mt-4 flex items-center gap-4">
                                        {/* Simple Action Bar */}
                                        <a
                                            href={memory.image_url}
                                            download={`memory-${memory.id}.jpg`}
                                            className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
                                        >
                                            <Download className="w-5 h-5" />
                                        </a>
                                        {memory.uploaded_by === profile.id && (
                                            <button onClick={(e) => handleDelete(memory.id, e)} className="p-3 bg-red-500/20 text-red-400 rounded-full">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedId(null)}
                                        className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white"
                                    >
                                        <X className="w-8 h-8" />
                                    </button>
                                </motion.div>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Magic Generation Modal */}
            <AnimatePresence>
                {showMagicModal && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="liquid-glass border border-yellow-500/30 w-full max-w-md rounded-3xl p-6 relative shadow-2xl space-y-4"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-yellow-100">
                                    <Sparkles className="w-5 h-5 text-yellow-400" />
                                    Magic Generator
                                </h3>
                                <button onClick={() => setShowMagicModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><X className="w-4 h-4" /></button>
                            </div>

                            <div className="flex gap-2 justify-center py-4">
                                {selectedForMagic.map(id => {
                                    const mem = memories.find(m => m.id === id);
                                    if (!mem) return null;
                                    return (
                                        <img key={id} src={mem.image_url} className="w-16 h-16 rounded-lg object-cover border-2 border-yellow-500/50" />
                                    );
                                })}
                                {selectedForMagic.length < 2 && (
                                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
                                        <Plus className="w-6 h-6 text-white/20" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase text-white/50 tracking-wider">Imagine...</label>
                                <textarea
                                    value={magicPrompt}
                                    onChange={(e) => setMagicPrompt(e.target.value)}
                                    placeholder="Us as astronauts on Mars..."
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 h-24 focus:outline-none focus:border-yellow-500/50 transition-colors resize-none"
                                />
                            </div>

                            <button
                                onClick={handleGenerateMagic}
                                disabled={generating || !magicPrompt.trim()}
                                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-lg shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? (
                                    <>
                                        <Sparkles className="w-5 h-5 animate-spin" />
                                        Brewing Magic...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-5 h-5" />
                                        Generate Magic Photo
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
