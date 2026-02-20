import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Radio, Camera, Bell, X } from 'lucide-react';

const icons = {
    heartbeat: Heart,
    radio: Radio,
    memory: Camera,
    system: Bell
};

const colors = {
    heartbeat: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    radio: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    memory: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    system: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
};

export default function NotificationToast({ notification, onClose }) {
    useEffect(() => {
        // Play sound on mount
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.error("Audio play failed (user interaction needed first)", e));

        // Auto dismiss
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const Icon = icons[notification?.type] || Bell;
    const style = colors[notification?.type] || colors.system;

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-4 right-4 z-[100] w-full max-w-sm"
        >
            <div className={`glass-panel p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 ${style}`}>
                <div className={`p-2 rounded-full ${style.split(' ')[1]}`}>
                    <Icon className={`w-5 h-5 ${style.split(' ')[0]}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm">{notification?.title || 'New Notification'}</h4>
                    <p className="text-white/60 text-xs mt-1 leading-relaxed line-clamp-2">
                        {notification?.message}
                    </p>
                    <span className="text-[10px] text-white/30 mt-2 block">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}
