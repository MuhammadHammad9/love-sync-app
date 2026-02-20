import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { requestNotificationPermission, subscribeToPushMessages, sendLocalNotification } from '../lib/push';

const AuthContext = createContext({});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [couple, setCouple] = useState(null);
    const [partnerProfile, setPartnerProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id, session.user.email);
            else setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Realtime Profile Updates
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase.channel(`profile:${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
            }, (payload) => {
                setProfile(payload.new);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.id]);

    // Realtime Notifications
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase.channel(`notifications:${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                setNotification(payload.new);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.id]);

    // Realtime Partner Profile Updates (For Dynamic Mood/Theme)
    useEffect(() => {
        if (!partnerProfile?.id) return;

        const channel = supabase.channel(`partner_profile:${partnerProfile.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${partnerProfile.id}`
            }, (payload) => {
                // Partner profile updated realtime
                setPartnerProfile(prev => ({ ...prev, ...payload.new }));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [partnerProfile?.id]);

    // Realtime Couple Updates (For Streak Count and Stats)
    useEffect(() => {
        if (!couple?.id) return;

        const channel = supabase.channel(`couple:${couple.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'couples',
                filter: `id=eq.${couple.id}`
            }, (payload) => {
                // Couple data updated realtime
                setCouple(prev => ({ ...prev, ...payload.new }));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [couple?.id]);

    const fetchProfile = async (userId, email) => {
        try {
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            // Create profile if missing
            if (error && error.code === 'PGRST116') {
                // Profile missing, creating new profile...

                // Get username from user metadata if available
                const { data: { user } } = await supabase.auth.getUser();
                const username = user?.user_metadata?.username || email?.split('@')[0] || 'User';

                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: userId,
                        username: username
                    }])
                    .select()
                    .single();

                if (createError) throw createError;
                data = newProfile;
            } else if (error) {
                throw error;
            }

            setProfile(data);

            if (data?.couple_id) {
                const { data: coupleData } = await supabase
                    .from('couples')
                    .select('*')
                    .eq('id', data.couple_id)
                    .single();
                setCouple(coupleData);

                // Fetch Partner Profile if couple exists
                if (coupleData) {
                    const partnerId = coupleData.partner_a === userId ? coupleData.partner_b : coupleData.partner_a;
                    if (partnerId) {
                        const { data: partnerData } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', partnerId)
                            .single();
                        setPartnerProfile(partnerData);
                    }
                }
            } else {
                setCouple(null);
                setPartnerProfile(null);
            }
        } catch (error) {
            console.error('Error in fetchProfile:', error);
        } finally {
            setLoading(false);
        }
    };

    const resendConfirmationEmail = async (email) => {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) throw error;
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    };

    const signInWithEmail = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
    };

    const signUpWithEmail = async (email, password, username, avatarFile) => {
        try {
            // 0. Check if username is already taken to prevent silent profile creation failures
            const { count, error: countError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .ilike('username', username);

            if (countError) throw countError;
            if (count && count > 0) {
                throw new Error('Username is already taken. Please choose another one.');
            }

            // 1. Create auth user with auto-confirm
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username
                    }
                }
            });
            if (error) throw error;

            // Check if user session exists (email confirmation disabled in dashboard)
            if (!data.session) {
                throw new Error('Email confirmation is still enabled. Please disable it in Supabase Dashboard: Authentication → Providers → Email → Confirm email (OFF)');
            }

            // 2. Upload avatar if provided
            let avatarUrl = null;
            if (avatarFile && data.user) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${data.user.id}/avatar.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, avatarFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) {
                    // Log but do NOT throw to ensure profile creation succeeds
                    console.error('Avatar upload error:', uploadError);
                } else {
                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(fileName);

                    avatarUrl = publicUrl;
                }
            }

            // 3. Create profile with username and avatar
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: data.user.id,
                        username: username,
                        avatar_url: avatarUrl
                    }]);

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    // Don't throw here - user can update later and we handle missing profile in fetchProfile
                }
            }
        } catch (err) {
            console.error('Sign up error:', err);
            throw err;
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const updateProfile = async (updates) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);
            if (error) throw error;
            // Update local state
            setProfile(prev => ({ ...prev, ...updates }));
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    };

    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    };

    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    useEffect(() => {
        // Check initial permission status
        if (Notification.permission === 'granted') {
            setNotificationsEnabled(true);
        }
    }, []);

    const toggleNotifications = async () => {
        if (notificationsEnabled) {
            setNotificationsEnabled(false);
            // Optional: sendLocalNotification("Notifications Muted", { body: "You will not receive updates." });
        } else {
            const permission = await requestNotificationPermission();
            if (permission === 'granted') {
                setNotificationsEnabled(true);
                // Attempt to subscribe, but don't block UI state if it fails (due to no SW)
                subscribeToPushMessages().catch(console.error);

                sendLocalNotification("Notifications Enabled! 🔔", {
                    body: "You will now receive love notes and updates.",
                    icon: '/pwa-192x192.png'
                });
            } else {
                alert("Permission denied. Please check browser settings.");
            }
        }
    };

    const value = {
        user,
        profile,
        couple,
        partnerProfile,
        loading,
        resendConfirmationEmail,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        updatePassword,
        toggleNotifications,
        notificationsEnabled,
        notification,
        showNotification: (title, message, type = 'system') => {
            setNotification({ title, message, type, id: Date.now() });
        },
        removeNotification: () => setNotification(null),
        isProfileComplete: () => {
            // Check if profile has username and avatar_url
            return profile && profile.username && profile.avatar_url;
        }
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
