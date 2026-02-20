import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Heart, Radio, Shield, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const dropdownVariants = {
    hidden: { opacity: 0, y: 8, scale: 0.93, transformOrigin: 'top right' },
    show: {
        opacity: 1, y: 0, scale: 1,
        transition: { type: 'spring', stiffness: 380, damping: 26 },
    },
    exit: {
        opacity: 0, y: 6, scale: 0.95,
        transition: { duration: 0.18 },
    },
};

const listContainerVariants = {
    show: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, x: -12, scale: 0.97 },
    show: {
        opacity: 1, x: 0, scale: 1,
        transition: { type: 'spring', stiffness: 380, damping: 26 },
    },
    exit: {
        opacity: 0, x: 30, scale: 0.95,
        transition: { duration: 0.2, ease: 'easeIn' },
    },
};

export default function NotificationDropdown() {
    const { user, notification, removeNotification } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [bellJiggle, setBellJiggle] = useState(false);
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
    }, [user, isOpen]);

    // Listen for new realtime notification from context
    useEffect(() => {
        if (notification) {
            setItems(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
        }
    }, [notification]);

    // Bell jiggle every 5 seconds when there are unread notifications
    useEffect(() => {
        if (unreadCount === 0 || isOpen) return;
        const interval = setInterval(() => {
            setBellJiggle(true);
            setTimeout(() => setBellJiggle(false), 600);
        }, 5000);
        return () => clearInterval(interval);
    }, [unreadCount, isOpen]);

    const markAsRead = async (id) => {
        setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    };

    const markAllRead = async () => {
        setItems(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
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
                if (notification) removeNotification();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, notification]);

    return (
        <div className="relative z-50" ref={dropdownRef}>
            {/* Bell button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileTap={{ scale: 0.88 }}
                animate={bellJiggle ? { rotate: [0, -18, 18, -12, 12, -6, 6, 0] } : { rotate: 0 }}
                transition={{ duration: 0.55 }}
                className="relative p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group"
            >
                <Bell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />

                {/* Unread badge with pop animation */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            key="badge"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                            className="absolute top-0 right-0 min-w-[14px] h-[14px] px-0.5 bg-red-500 rounded-full border-2 border-[#1a0a0f] flex items-center justify-center"
                        >
                            {unreadCount > 9
                                ? <span className="text-[7px] font-bold text-white leading-none">9+</span>
                                : unreadCount > 1
                                    ? <span className="text-[7px] font-bold text-white leading-none">{unreadCount}</span>
                                    : null
                            }
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Dropdown panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="absolute right-0 top-14 w-80 bg-[#1a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">Notifications</h3>
                            {items.length > 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={markAllRead}
                                    className="text-[10px] text-love-400 hover:text-love-300 font-medium uppercase tracking-wider"
                                >
                                    Mark all read
                                </motion.button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[60vh] overflow-y-auto scrollbar-hide p-2 space-y-1">
                            {items.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="py-8 text-center text-white/30 text-xs"
                                >
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    No new notifications
                                </motion.div>
                            ) : (
                                <motion.div variants={listContainerVariants} initial="hidden" animate="show">
                                    <AnimatePresence initial={false}>
                                        {items.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="show"
                                                exit="exit"
                                                layout
                                                onClick={() => markAsRead(item.id)}
                                                className={`p-3 rounded-xl flex gap-3 cursor-pointer group relative overflow-hidden mb-1
                                                    ${item.is_read
                                                        ? 'opacity-60 hover:opacity-100 hover:bg-white/5'
                                                        : 'bg-white/5 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-full h-fit flex-shrink-0 ${item.type === 'heartbeat'
                                                    ? 'bg-pink-500/20 text-pink-400'
                                                    : item.type === 'radio'
                                                        ? 'bg-indigo-500/20 text-indigo-400'
                                                        : 'bg-blue-500/20 text-blue-400'
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

                                                {/* Delete button */}
                                                <motion.button
                                                    whileTap={{ scale: 0.85 }}
                                                    onClick={(e) => deleteNotification(e, item.id)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-500/20 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30"
                                                >
                                                    <X className="w-3 h-3" />
                                                </motion.button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
