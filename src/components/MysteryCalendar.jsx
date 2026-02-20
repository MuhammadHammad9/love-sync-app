import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Clock, Lock, Unlock, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Helper to format remaining time
const formatTimeLeft = (ms) => {
    if (ms <= 0) return "UNLOCKED";
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`; // Simplified for now
};

const EventCard = ({ event, theme }) => {
    const [timeLeft, setTimeLeft] = useState(new Date(event.unlock_date).getTime() - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const remaining = new Date(event.unlock_date).getTime() - Date.now();
            setTimeLeft(remaining);
        }, 1000);
        return () => clearInterval(timer);
    }, [event.unlock_date]);

    const isLocked = timeLeft > 0;

    return (
        <div className={`liquid-glass relative overflow-hidden rounded-2xl border ${theme.borderColor} ${theme.glassColor} p-5 transition-all duration-500`}>
            {/* Icon */}
            <div className={`absolute top-4 right-4 p-2 rounded-full ${isLocked ? 'bg-white/5 text-white/30' : 'bg-green-500/20 text-green-400'}`}>
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>

            <div className="space-y-4 relative z-10">
                {/* Header */}
                <div>
                    <h3 className="text-lg font-bold text-white/90">{event.title}</h3>
                    <p className="text-xs text-white/50 uppercase tracking-widest mt-1">
                        {new Date(event.unlock_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                </div>

                {/* Secret Content */}
                <div className="relative">
                    {isLocked ? (
                        <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2 text-center">
                            <MapPin className="w-6 h-6 text-white/20" />
                            <p className="text-white/40 font-mono text-sm blur-[3px] select-none">SECRET LOCATION HIDDEN</p>
                            <div className="mt-2 font-mono text-red-400 font-bold text-sm bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                                {formatTimeLeft(timeLeft)}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                <span className="text-[10px] text-white/40 uppercase block mb-1">Location</span>
                                <p className="text-white/90 font-medium flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-rose-400" />
                                    {event.location}
                                </p>
                            </div>
                            {event.description && (
                                <p className="text-sm text-white/70 italic p-2">"{event.description}"</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function MysteryCalendar({ theme }) {
    const { couple, profile } = useAuth();
    const [events, setEvents] = useState([]);
    const [showCreate, setShowCreate] = useState(false);

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');

    useEffect(() => {
        if (!couple?.id) return;

        const fetchEvents = async () => {
            const { data } = await supabase
                .from('hidden_events')
                .select('*')
                .eq('couple_id', couple.id)
                .order('unlock_date', { ascending: true });
            if (data) setEvents(data);
        };

        fetchEvents();

        const channel = supabase.channel(`calendar:${couple.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'hidden_events',
                filter: `couple_id=eq.${couple.id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') setEvents(prev => [...prev, payload.new].sort((a, b) => new Date(a.unlock_date) - new Date(b.unlock_date)));
                if (payload.eventType === 'DELETE') setEvents(prev => prev.filter(e => e.id !== payload.old.id));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [couple?.id]);

    const handleCreate = async () => {
        if (!newTitle || !newLocation || !newDate || !newTime) return;

        // Combine Date & Time
        const unlockDate = new Date(`${newDate}T${newTime}`);

        const { error } = await supabase.from('hidden_events').insert([{
            couple_id: couple.id,
            creator_id: profile.id,
            title: newTitle,
            location: newLocation,
            description: newDescription,
            unlock_date: unlockDate.toISOString()
        }]);

        if (error) {
            alert('Error creating event: ' + error.message);
        } else {
            setShowCreate(false);
            // Reset form
            setNewTitle('');
            setNewLocation('');
            setNewDescription('');
            setNewDate('');
            setNewTime('');
        }
    };

    return (
        <div className="h-full flex flex-col p-6 relative">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className={`text-2xl font-bold ${theme.textColor} flex items-center gap-2`}>
                        <Calendar className="w-6 h-6" />
                        Anticipation
                    </h2>
                    <p className="text-white/50 text-xs">The Mystery Calendar</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="p-3 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto space-y-4 pb-20 scrollbar-hide">
                {events.length === 0 ? (
                    <div className="text-center py-20 opacity-40">
                        <Clock className="w-12 h-12 mx-auto mb-4 stroke-1" />
                        <p className="text-sm">No mystery plans yet.</p>
                        <p className="text-xs mt-2">Create one to build the suspense.</p>
                    </div>
                ) : (
                    events.map(event => (
                        <EventCard key={event.id} event={event} theme={theme} />
                    ))
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl p-6 flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-white">New Mystery Plan</h3>
                            <button onClick={() => setShowCreate(false)} className="p-2 bg-white/10 rounded-full text-white/60 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 flex-1 overflow-y-auto">
                            <div>
                                <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Saturday Night..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Date</label>
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Unlock Time</label>
                                    <input
                                        type="time"
                                        value={newTime}
                                        onChange={(e) => setNewTime(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-rose-400 font-bold uppercase tracking-wider block mb-2 flex items-center gap-2">
                                    <Lock className="w-3 h-3" /> Secret Location
                                </label>
                                <input
                                    type="text"
                                    value={newLocation}
                                    onChange={(e) => setNewLocation(e.target.value)}
                                    placeholder="Hidden until unlock..."
                                    className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-white placeholder-rose-500/30 focus:outline-none focus:border-rose-500/50"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">Description (Optional)</label>
                                <textarea
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="Any clues or dress code?"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 min-h-[100px]"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCreate}
                            className="w-full py-4 bg-white text-black font-bold rounded-2xl mt-4 hover:bg-gray-200 transition-colors"
                        >
                            Create Mystery Event
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
