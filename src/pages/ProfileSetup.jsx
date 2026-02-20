import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, User, Upload, Image as ImageIcon, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';

export default function ProfileSetup() {
    const { user, updateProfile } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size must be less than 5MB');
                return;
            }

            setAvatarFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            // Validate required fields
            if (!username.trim()) {
                throw new Error('Username is required');
            }
            if (!avatarFile) {
                throw new Error('Profile picture is required');
            }

            // Upload avatar
            const fileExt = avatarFile.name.split('.').pop();
            const fileName = `${user.id}/avatar.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, avatarFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                console.error('Avatar upload error:', uploadError);
                throw new Error('Failed to upload profile picture. Please try again.');
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Update profile
            await updateProfile({
                username: username.trim(),
                avatar_url: publicUrl
            });

            // Celebration confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ec4899', '#f472b6', '#fce7f3']
            });

            // Navigate to onboarding
            setTimeout(() => {
                navigate('/onboarding');
            }, 500);

        } catch (err) {
            console.error('Profile setup error:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#0f0505] via-[#1a0a0f] to-[#0f0505]">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-love-600 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600 rounded-full blur-[120px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="glass-panel rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl border-white/10"
            >
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <div className="p-4 bg-love-500/10 rounded-2xl mb-2 ring-2 ring-love-400/20">
                        <Heart className="w-12 h-12 text-love-500 fill-love-500/20" />
                    </div>
                    <h2 className="text-3xl font-bold">
                        <span className="bg-gradient-to-r from-love-400 to-pink-400 bg-clip-text text-transparent">
                            Complete Your Profile
                        </span>
                    </h2>
                    <p className="text-white/60 text-sm text-center">
                        Let's personalize your account
                    </p>
                </motion.div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="p-4 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username Field */}
                    <div>
                        <label htmlFor="username" className="text-sm font-medium text-white/70 ml-1 block mb-2">
                            Username <span className="text-love-400">*</span>
                        </label>
                        <div className="relative">
                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${focusedField === 'username' ? 'text-love-400' : 'text-white/30'}`} />
                            <input
                                id="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onFocus={() => setFocusedField('username')}
                                onBlur={() => setFocusedField(null)}
                                className={`w-full bg-black/20 border rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none transition-all ${focusedField === 'username'
                                        ? 'border-love-400 ring-2 ring-love-400/20'
                                        : 'border-white/10 hover:border-white/20'
                                    }`}
                                placeholder="your_username"
                                maxLength={30}
                            />
                        </div>
                        <p className="text-xs text-white/40 mt-1 ml-1">Choose a unique username</p>
                    </div>

                    {/* Profile Picture Upload */}
                    <div>
                        <label className="text-sm font-medium text-white/70 ml-1 block mb-2">
                            Profile Picture <span className="text-love-400">*</span>
                        </label>

                        <div className="flex items-center gap-4">
                            {/* Avatar Preview */}
                            <div className="relative">
                                <div className="w-20 h-20 rounded-2xl bg-black/20 border-2 border-white/10 flex items-center justify-center overflow-hidden">
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Profile preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-white/30" />
                                    )}
                                </div>
                            </div>

                            {/* Upload Button */}
                            <div className="flex-1">
                                <label
                                    htmlFor="avatar-upload"
                                    className="cursor-pointer flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm font-medium hover:border-love-400/30"
                                >
                                    <Upload className="w-4 h-4" />
                                    {avatarFile ? 'Change Picture' : 'Upload Picture'}
                                </label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    required
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                                <p className="text-xs text-white/40 mt-1">Max 5MB • JPG, PNG, GIF</p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 bg-gradient-to-r from-love-600 to-pink-600 hover:from-love-500 hover:to-pink-500 text-white rounded-xl font-bold transition-all flex justify-center items-center gap-2 mt-6 shadow-lg shadow-love-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Sparkles className="w-5 h-5 animate-spin" />
                                Setting up...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Complete Profile
                            </>
                        )}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
}
