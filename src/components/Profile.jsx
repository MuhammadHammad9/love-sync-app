import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Camera, Edit2, Lock, LogOut, BellRing, Moon, Sun, Monitor, Check, X, Shield, Heart } from 'lucide-react';
import { MOOD_CONFIG } from '../lib/theme';

export default function Profile({ theme, setThemeOverride, recentNotifications = [], onNotificationClick }) {
    const { user, profile, partnerProfile, couple, signOut, updateProfile, updatePassword, toggleNotifications, notificationsEnabled, showNotification } = useAuth();
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(profile?.username || '');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Theme active state (local prop or context if lifted)
    const [activeMode, setActiveMode] = useState('auto'); // auto, light, dark

    const handleThemeChange = (mode) => {
        setActiveMode(mode);
        if (mode === 'auto') setThemeOverride(null);
        else setThemeOverride(mode);
    };

    const handleNameSave = async () => {
        if (!newName.trim()) return;
        try {
            await updateProfile({ username: newName });
            setIsEditingName(false);
            showNotification("Success", "Name updated successfully", "system");
        } catch (error) {
            showNotification("Error", "Error updating name", "system");
        }
    };

    const handlePasswordChange = async () => {
        if (passwords.new !== passwords.confirm) {
            showNotification("Error", "Passwords don't match", "system");
            return;
        }
        if (passwords.new.length < 6) {
            showNotification("Error", "Password must be at least 6 characters", "system");
            return;
        }
        try {
            await updatePassword(passwords.new);
            setIsChangingPassword(false);
            setPasswords({ new: '', confirm: '' });
            setPasswords({ new: '', confirm: '' });
            showNotification("Success", "Password updated successfully", "system");
        } catch (error) {
            showNotification("Error", "Error updating password: " + error.message, "system");
        }
    };

    const handleAvatarUpload = async (event) => {
        try {
            setUploading(true);
            const file = event.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload
            let { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            await updateProfile({ avatar_url: publicUrl });

        } catch (error) {
            showNotification("Error", 'Error uploading avatar: ' + error.message, "system");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col h-full p-6 space-y-6 overflow-y-auto pb-24">
            {/* Header / Avatar */}
            <div className="flex flex-col items-center justify-center space-y-4 pt-4 relative">
                <div className="relative group">
                    <div className={`p-1 rounded-full ${theme.glassColor} border-2 ${theme.borderColor} overflow-hidden w-24 h-24 flex items-center justify-center`}>
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <User className={`w-12 h-12 ${theme.textColor}`} />
                        )}
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-0 right-0 p-2 bg-love-500 rounded-full text-white shadow-lg hover:bg-love-600 transition-colors"
                    >
                        {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Camera className="w-4 h-4" />}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                    />
                </div>

                <div className="text-center space-y-1 w-full flex flex-col items-center">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-love-500 w-32"
                            />
                            <button onClick={handleNameSave} className="p-1 bg-green-500/20 text-green-400 rounded-full hover:bg-green-500/30">
                                <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsEditingName(false)} className="p-1 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h2 className="text-xl font-bold text-white">{profile?.username || 'User'}</h2>
                            <button onClick={() => { setNewName(profile?.username || ''); setIsEditingName(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/50 hover:text-white">
                                <Edit2 className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    <p className="font-mono text-xs text-white/40">{user.email}</p>
                </div>
            </div>

            {/* Partner Card */}
            {partnerProfile && (
                <div className={`glass-panel p-4 rounded-2xl border ${theme.borderColor} relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-love-500/50 to-transparent" />
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex-shrink-0 border border-white/10">
                            {partnerProfile.avatar_url ? (
                                <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-6 h-6 text-white/50 m-auto mt-3" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Connected With</p>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                {partnerProfile.username}
                                <Heart className="w-4 h-4 text-love-500 fill-love-500 animate-pulse" />
                            </h3>
                            {couple?.created_at && (
                                <p className="text-[10px] text-white/30 mt-1">
                                    Since {new Date(couple.created_at).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={toggleNotifications}
                    className={`glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors group ${notificationsEnabled ? 'bg-blue-500/10 border-blue-500/30' : 'hover:bg-white/5'}`}
                >
                    <BellRing className={`w-6 h-6 transition-transform group-hover:scale-110 ${notificationsEnabled ? 'text-blue-400 fill-blue-400/20' : 'text-blue-400'}`} />
                    <span className={`text-xs font-medium ${notificationsEnabled ? 'text-white' : 'text-white/80'}`}>
                        {notificationsEnabled ? 'On' : 'Notifications'}
                    </span>
                </button>
                <button
                    onClick={() => showNotification("Secure", "Secure Connection Active: Your data is encrypted end-to-end via Supabase RLS.", "system")}
                    className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors group"
                >
                    <Shield className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium text-white/80">Secure</span>
                </button>
            </div>

            {/* Notification History */}
            <div className="glass-panel p-4 rounded-xl">
                <h3 className="text-xs uppercase font-bold text-white/40 mb-3 tracking-widest">Recent Alerts</h3>
                <div className="space-y-2">
                    {recentNotifications.length === 0 ? (
                        <div className="text-center text-xs text-white/30 py-4 italic border border-white/5 rounded-lg bg-black/20">
                            No recent notifications.
                        </div>
                    ) : (
                        recentNotifications.map(n => (
                            <div
                                key={n.id}
                                onClick={() => onNotificationClick && onNotificationClick(n)}
                                className={`p-3 rounded-xl border border-white/5 flex items-start gap-3 transition-colors hover:bg-white/5 cursor-pointer`}
                            >
                                <div className={`p-2 rounded-full mt-0.5 ${n.type === 'heartbeat' ? 'bg-pink-500/10 text-pink-400' :
                                    n.type === 'radio' ? 'bg-indigo-500/10 text-indigo-400' :
                                        'bg-blue-500/10 text-blue-400'
                                    }`}>
                                    {n.type === 'heartbeat' && <Heart className="w-3 h-3 fill-current" />}
                                    {n.type === 'radio' && <BellRing className="w-3 h-3" />}
                                    {n.type === 'system' && <Shield className="w-3 h-3" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-medium text-white/90 truncate pr-2">{n.title}</h4>
                                        <span className="text-[10px] text-white/30 whitespace-nowrap">
                                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/50 mt-1 line-clamp-2">{n.message}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Settings Section */}
            <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-white/40 tracking-widest ml-1">Appearance</h3>
                <div className="glass-panel p-1 rounded-xl flex">
                    <button
                        onClick={() => handleThemeChange('auto')}
                        className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-all ${activeMode === 'auto' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <Monitor className="w-3 h-3" /> Auto (Mood)
                    </button>
                    <button
                        onClick={() => handleThemeChange('light')}
                        className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-all ${activeMode === 'light' ? 'bg-white text-gray-900 shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <Sun className="w-3 h-3" /> Light
                    </button>
                    <button
                        onClick={() => handleThemeChange('dark')}
                        className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-medium transition-all ${activeMode === 'dark' ? 'bg-gray-900 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <Moon className="w-3 h-3" /> Dark
                    </button>
                </div>
            </div>

            {/* Account Settings */}
            <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-white/40 tracking-widest ml-1">Account</h3>

                {/* Password Change */}
                <div className="glass-panel overflow-hidden rounded-xl transition-all">
                    <button
                        onClick={() => setIsChangingPassword(!isChangingPassword)}
                        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                                <Lock className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-white/90">Change Password</span>
                        </div>
                        {isChangingPassword ? <X className="w-4 h-4 text-white/40" /> : <Edit2 className="w-3 h-3 text-white/20" />}
                    </button>

                    {isChangingPassword && (
                        <div className="p-4 pt-0 space-y-3 border-t border-white/5 mt-2">
                            <input
                                type="password"
                                placeholder="New Password"
                                value={passwords.new}
                                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-love-500"
                            />
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={passwords.confirm}
                                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-love-500"
                            />
                            <button
                                onClick={handlePasswordChange}
                                className="w-full py-2 bg-love-600 hover:bg-love-500 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                Update Password
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={signOut}
                    className="w-full p-4 glass-panel rounded-xl flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors group"
                >
                    <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                        <LogOut className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">Sign Out</span>
                </button>
            </div>
        </div>
    );
}
