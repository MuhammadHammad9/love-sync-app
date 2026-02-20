import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Mail, Lock, Shield, Users, Calendar, MessageCircle, Eye, EyeOff, X, ChevronRight, User, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export default function Auth() {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, resendConfirmationEmail } = useAuth();
    const [showAuth, setShowAuth] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [useEmail, setUseEmail] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showResend, setShowResend] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    // Password strength calculation
    const getPasswordStrength = (pwd) => {
        if (!pwd) return { strength: 0, label: '', color: '' };
        let strength = 0;
        if (pwd.length >= 6) strength++;
        if (pwd.length >= 10) strength++;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
        if (/\d/.test(pwd)) strength++;
        if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

        const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        const colors = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-emerald-400'];

        return { strength, label: labels[strength - 1] || 'Weak', color: colors[strength - 1] || 'text-red-400' };
    };

    const passwordStrength = getPasswordStrength(password);

    const handleGoogleLogin = async () => {
        try {
            setIsLoggingIn(true);
            setError('');
            await signInWithGoogle();
        } catch (error) {
            console.error('Google Login failed:', error);
            setError(error.message);
        } finally {
            setIsLoggingIn(false);
        }
    };



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

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setError('');
        setMessage('');
        setShowResend(false);

        try {
            if (isSignUp) {
                // Validate required fields
                if (!username.trim()) {
                    throw new Error('Username is required');
                }
                if (!avatarFile) {
                    throw new Error('Profile picture is required');
                }

                await signUpWithEmail(email, password, username.trim(), avatarFile);
                // Celebration confetti for signup
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#ec4899', '#f472b6', '#fce7f3']
                });
                // Redirect handled by AuthContext
            } else {
                await signInWithEmail(email, password);
            }
        } catch (err) {
            console.error("Auth Error:", err);
            let errorMessage = err.message;
            if (err.message.includes('User already registered')) {
                errorMessage = 'Account already exists! Please switch to "Sign In".';
            } else if (err.message.includes('Invalid login credentials')) {
                errorMessage = 'Invalid email or password. Please check your credentials.';
            }
            setError(errorMessage);
        } finally {
            setIsLoggingIn(false);
        }
    };

    // Floating particles animation
    const FloatingParticle = ({ delay, duration, x, y }) => (
        <motion.div
            className="absolute w-2 h-2 bg-love-400/30 rounded-full blur-sm"
            initial={{ opacity: 0, x: x, y: y }}
            animate={{
                opacity: [0.3, 0.7, 0.3],
                y: [y, y - 100, y],
                x: [x, x + 30, x]
            }}
            transition={{
                duration: duration,
                delay: delay,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />
    );

    // Hero section with progressive disclosure
    if (!showAuth) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#0f0505] via-[#1a0a0f] to-[#0f0505]">
                {/* Animated background */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                    <motion.div
                        className="absolute top-1/4 left-1/4 w-96 h-96 bg-love-600/20 rounded-full blur-[120px]"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.2, 0.3, 0.2]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-[120px]"
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.2, 0.25, 0.2]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    />

                    {/* Floating particles */}
                    {[...Array(12)].map((_, i) => (
                        <FloatingParticle
                            key={i}
                            delay={i * 0.5}
                            duration={8 + Math.random() * 4}
                            x={Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800)}
                            y={Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 600)}
                        />
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-2xl w-full text-center space-y-12 relative z-10"
                >
                    {/* Logo & Brand */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-center">
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="p-6 bg-gradient-to-br from-love-500/20 to-purple-500/20 rounded-3xl backdrop-blur-sm border border-love-400/30 shadow-2xl"
                            >
                                <Heart className="w-16 h-16 text-love-400 fill-love-400/30" />
                            </motion.div>
                        </div>

                        <h1 className="text-6xl font-bold">
                            <span className="bg-gradient-to-r from-love-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                                LoveSync
                            </span>
                        </h1>

                        <p className="text-xl text-white/70 max-w-md mx-auto leading-relaxed">
                            Where two hearts beat as one. Share moments, stay connected, and grow together.
                        </p>
                    </motion.div>

                    {/* Feature highlights */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto"
                    >
                        {[
                            { icon: Heart, label: 'Connect Hearts', desc: 'Real-time emotional sync' },
                            { icon: Calendar, label: 'Share Moments', desc: 'Build memories together' },
                            { icon: MessageCircle, label: 'Daily Questions', desc: 'Deepen your bond' }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + idx * 0.1, duration: 0.5 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                className="glass-panel p-6 rounded-2xl space-y-3 group hover:border-love-400/30 transition-all duration-300"
                            >
                                <div className="p-3 bg-love-500/10 rounded-xl w-fit mx-auto group-hover:bg-love-500/20 transition-colors">
                                    <feature.icon className="w-6 h-6 text-love-400" />
                                </div>
                                <h3 className="font-bold text-white">{feature.label}</h3>
                                <p className="text-xs text-white/50">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                        className="space-y-4"
                    >
                        <motion.button
                            onClick={() => setShowAuth(true)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="group px-12 py-5 bg-gradient-to-r from-love-600 to-pink-600 hover:from-love-500 hover:to-pink-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-love-500/30 transition-all duration-300 flex items-center gap-3 mx-auto"
                        >
                            Get Started
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </motion.button>

                        {/* Trust signals */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 0.6 }}
                            className="flex items-center justify-center gap-4 text-xs text-white/40"
                        >
                            <div className="flex items-center gap-1">
                                <Shield className="w-4 h-4" />
                                <span>Private & Secure</span>
                            </div>
                            <div className="w-1 h-1 bg-white/30 rounded-full" />
                            <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>1000+ Couples</span>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    // Auth form view
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#0f0505] via-[#1a0a0f] to-[#0f0505]">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-love-600 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600 rounded-full blur-[120px]"></div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={useEmail ? 'email' : 'options'}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="glass-panel rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl border-white/10"
                >
                    {/* Back button */}
                    {useEmail && (
                        <button
                            onClick={() => {
                                setUseEmail(false);
                                setShowAuth(false);
                                setError('');
                                setMessage('');
                                setUsername('');
                                setAvatarFile(null);
                                setAvatarPreview(null);
                            }}
                            className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
                        >
                            ← Back
                        </button>
                    )}

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
                                {useEmail ? (isSignUp ? 'Create Account' : 'Welcome Back') : 'Welcome to LoveSync'}
                            </span>
                        </h2>
                        <p className="text-white/60 text-sm">
                            {useEmail
                                ? (isSignUp ? 'Join thousands of couples in sync' : 'Sign in to continue your journey')
                                : 'Choose your preferred sign-in method'
                            }
                        </p>
                    </motion.div>

                    {/* Error/Success Messages */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-4 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl flex items-start gap-2"
                                role="alert"
                                aria-live="polite"
                            >
                                <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                    </AnimatePresence>

                    {/* Auth Options */}
                    {!useEmail ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-4"
                        >
                            <motion.button
                                onClick={handleGoogleLogin}
                                disabled={isLoggingIn}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-4 px-4 bg-white text-black hover:bg-gray-100 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                {isLoggingIn ? (
                                    <Sparkles className="w-5 h-5 animate-spin text-love-600" />
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                )}
                                <span>Continue with Google</span>
                            </motion.button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-white/10" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-[#0f0505] px-3 text-white/40 font-medium">Or</span>
                                </div>
                            </div>

                            <motion.button
                                onClick={() => setUseEmail(true)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-4 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 text-sm shadow-lg hover:shadow-xl hover:border-love-400/30"
                            >
                                <Mail className="w-5 h-5" />
                                Continue with Email
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.form
                            onSubmit={handleEmailAuth}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-5 text-left"
                        >
                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="text-sm font-medium text-white/70 ml-1 block mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${focusedField === 'email' ? 'text-love-400' : 'text-white/30'}`} />
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField(null)}
                                        className={`w-full bg-black/20 border rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none transition-all ${focusedField === 'email'
                                            ? 'border-love-400 ring-2 ring-love-400/20'
                                            : 'border-white/10 hover:border-white/20'
                                            }`}
                                        placeholder="you@example.com"
                                        aria-label="Email address"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label htmlFor="password" className="text-sm font-medium text-white/70 ml-1 block mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${focusedField === 'password' ? 'text-love-400' : 'text-white/30'}`} />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        className={`w-full bg-black/20 border rounded-xl py-4 pl-12 pr-12 text-sm focus:outline-none transition-all ${focusedField === 'password'
                                            ? 'border-love-400 ring-2 ring-love-400/20'
                                            : 'border-white/10 hover:border-white/20'
                                            }`}
                                        placeholder="••••••••"
                                        aria-label="Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Password strength indicator for signup */}
                                {isSignUp && password && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-2 space-y-1"
                                    >
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((level) => (
                                                <div
                                                    key={level}
                                                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${level <= passwordStrength.strength
                                                        ? level <= 2 ? 'bg-red-400' : level <= 3 ? 'bg-yellow-400' : 'bg-green-400'
                                                        : 'bg-white/10'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className={`text-xs ${passwordStrength.color}`}>
                                            Password strength: {passwordStrength.label}
                                        </p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Username Field - Signup Only */}
                            {isSignUp && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <label htmlFor="username" className="text-sm font-medium text-white/70 ml-1 block mb-2">
                                        Username <span className="text-love-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${focusedField === 'username' ? 'text-love-400' : 'text-white/30'}`} />
                                        <input
                                            id="username"
                                            type="text"
                                            required={isSignUp}
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            onFocus={() => setFocusedField('username')}
                                            onBlur={() => setFocusedField(null)}
                                            className={`w-full bg-black/20 border rounded-xl py-4 pl-12 pr-4 text-sm focus:outline-none transition-all ${focusedField === 'username'
                                                ? 'border-love-400 ring-2 ring-love-400/20'
                                                : 'border-white/10 hover:border-white/20'
                                                }`}
                                            placeholder="your_username"
                                            aria-label="Username"
                                            maxLength={30}
                                        />
                                    </div>
                                    <p className="text-xs text-white/40 mt-1 ml-1">Choose a unique username</p>
                                </motion.div>
                            )}

                            {/* Profile Picture Upload - Signup Only */}
                            {isSignUp && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
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
                                                required={isSignUp}
                                                onChange={handleAvatarChange}
                                                className="hidden"
                                                aria-label="Upload profile picture"
                                            />
                                            <p className="text-xs text-white/40 mt-1">Max 5MB • JPG, PNG, GIF</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={isLoggingIn}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-4 bg-gradient-to-r from-love-600 to-pink-600 hover:from-love-500 hover:to-pink-500 text-white rounded-xl font-bold transition-all flex justify-center items-center gap-2 mt-6 shadow-lg shadow-love-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoggingIn && <Sparkles className="w-5 h-5 animate-spin" />}
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </motion.button>

                            {/* Toggle Sign In/Sign Up */}
                            <div className="text-center text-sm text-white/50 mt-4 space-y-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSignUp(!isSignUp);
                                        setError('');
                                        setMessage('');
                                    }}
                                    className="hover:text-love-400 underline transition-colors font-medium"
                                >
                                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {/* Trust Badge */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="pt-4 border-t border-white/5"
                    >
                        <div className="flex items-center justify-center gap-2 text-xs text-white/40">
                            <Shield className="w-4 h-4" />
                            <span>Your data is private and secure</span>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
