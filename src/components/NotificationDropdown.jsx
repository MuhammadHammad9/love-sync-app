import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Bell, Heart, Radio, Shield, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function NotificationDropdown() {
    const { user, notification, removeNotification } = useAuth(); // getting realtime context
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    // Fetch initial notifications
    useEffect(() => {
        if (!user) return;

        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) {
                setItems(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        };

        fetchNotifications();
    }, [user, isOpen]); // Re-fetch on open to be sure

    // Listen for new realtime notification from context
    useEffect(() => {
        if (notification) {
            setItems(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
        }
    }, [notification]);



    const markAsRead = async (id) => {
        // Optimistic
        setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
    };

    const markAllRead = async () => {
        setItems(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id);
    };

    const deleteNotification = async (e, id) => {
        e.stopPropagation();
        setItems(prev => prev.filter(n => n.id !== id));
        await supabase.from('notifications').delete().eq('id', id);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                // Also clear context notification if any
                if (notification) removeNotification();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, notification]);

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group"
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1a0a0f]" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-14 w-80 bg-[#1a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">Notifications</h3>
                            {items.length > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-[10px] text-love-400 hover:text-love-300 font-medium uppercase tracking-wider"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[60vh] overflow-y-auto scrollbar-hide p-2 space-y-1">
                            {items.length === 0 ? (
                                <div className="py-8 text-center text-white/30 text-xs">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    No new notifications
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => markAsRead(item.id)}
                                        className={`p-3 rounded-xl flex gap-3 transition-colors cursor-pointer group relative overflow-hidden ${item.is_read ? 'opacity-60 hover:opacity-100 hover:bg-white/5' : 'bg-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className={`p-2 rounded-full h-fit flex-shrink-0 ${item.type === 'heartbeat' ? 'bg-pink-500/20 text-pink-400' :
                                            item.type === 'radio' ? 'bg-indigo-500/20 text-indigo-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {item.type === 'heartbeat' && <Heart className="w-4 h-4" />}
                                            {item.type === 'radio' && <Radio className="w-4 h-4" />}
                                            {item.type !== 'heartbeat' && item.type !== 'radio' && <Shield className="w-4 h-4" />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-xs font-bold leading-tight ${item.is_read ? 'text-white/70' : 'text-white'}`}>
                                                    {item.title}
                                                </h4>
                                                <span className="text-[10px] text-white/30 whitespace-nowrap ml-2">
                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/50 mt-1 line-clamp-2 leading-relaxed">
                                                {item.message}
                                            </p>
                                        </div>

                                        {/* Hover Actions */}
                                        <button
                                            onClick={(e) => deleteNotification(e, item.id)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-500/20 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
