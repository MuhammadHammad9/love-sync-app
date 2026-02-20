import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import {
    Home as HomeIcon, MessageCircleHeart, Radio, Calendar,
    Feather, Moon, Camera, User
} from 'lucide-react';

import TabPanel from '../components/common/TabPanel';
import PageTransition from '../components/common/PageTransition';
import AtmosphericBackground from '../components/AtmosphericBackground';
import GoldenParticles from '../components/GoldenParticles';
import NotificationDropdown from '../components/NotificationDropdown';

// Pages
import Home from '../pages/Home';
import Serenade from '../pages/Serenade';
import Profile from '../components/Profile';

// Components (acting as pages)
import DailyPrompts from '../components/DailyPrompts';
import TelepathicDJ from '../components/TelepathicDJ';
import MysteryCalendar from '../components/MysteryCalendar';
import SleepSync from '../components/SleepSync';
import MemoriesGallery from '../components/MemoriesGallery';

import { getTheme, MOOD_CONFIG } from '../lib/theme';

const DashboardLayout = () => {
    const { user, couple, profile } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [navHidden, setNavHidden] = useState(false);

    // DJ State (Lifted)
    const [djState, setDjState] = useState({
        youtubeLink: '',
        videoId: null,
        voiceFile: null,
        incomingVibe: null
    });

    // Notification History
    const [recentNotifications, setRecentNotifications] = useState([]);

    // Theme State
    const [themeOverride, setThemeOverride] = useState(null);

    useEffect(() => {
        if (activeTab === 'profile') {
            const fetchNotifs = async () => {
                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                if (data) setRecentNotifications(data);
            };
            fetchNotifs();
        }
    }, [activeTab, user?.id]);

    const handleNotificationClick = useCallback(async (notif) => {
        if (notif.type === 'radio' && notif.metadata?.transmission_id) {
            const { data } = await supabase
                .from('radio_transmissions')
                .select('*')
                .eq('id', notif.metadata.transmission_id)
                .single();

            if (data) {
                setDjState(prev => ({ ...prev, incomingVibe: data }));
                setActiveTab('dj');
            }
        }
    }, []);

    // Determine Theme
    const theme = useMemo(() => {
        if (themeOverride && MOOD_CONFIG[themeOverride]) {
            return MOOD_CONFIG[themeOverride];
        }
        if (couple?.streak_count && [3, 7, 15, 30].includes(couple.streak_count)) {
            return MOOD_CONFIG.milestone;
        }
        return getTheme(profile?.mood);
    }, [profile?.mood, couple?.streak_count, themeOverride]);

    // Dynamic Quote (Passed to Home)
    const [quote, setQuote] = useState(() => {
        const quotes = theme.quotes;
        return quotes[Math.floor(Math.random() * quotes.length)];
    });

    useEffect(() => {
        const quotes = theme.quotes;
        const nextQuote = quotes[Math.floor(Math.random() * quotes.length)];
        const t = setTimeout(() => setQuote(nextQuote), 0);
        return () => clearTimeout(t);
    }, [theme]);

    return (
        <div className="min-h-screen relative flex flex-col transition-colors duration-1000 ease-in-out">
            {/* Background Elements */}
            <AtmosphericBackground theme={theme} />
            {theme.id === 'milestone' && <GoldenParticles />}

            {/* Top Right Notifications */}
            <div className="absolute top-4 right-4 z-50">
                <NotificationDropdown />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto p-6 scrollbar-hide relative z-10">

                <TabPanel active={activeTab === 'home'}>
                    <Home
                        theme={theme}
                        quote={quote}
                        onGameToggle={setNavHidden}
                    />
                </TabPanel>

                <TabPanel active={activeTab === 'prompts'}>
                    <PageTransition>
                        <DailyPrompts />
                    </PageTransition>
                </TabPanel>

                <TabPanel active={activeTab === 'dj'}>
                    <PageTransition>
                        <TelepathicDJ theme={theme} djState={djState} setDjState={setDjState} />
                    </PageTransition>
                </TabPanel>

                <TabPanel active={activeTab === 'calendar'}>
                    <PageTransition>
                        <MysteryCalendar theme={theme} />
                    </PageTransition>
                </TabPanel>

                <TabPanel active={activeTab === 'notes'}>
                    <Serenade />
                </TabPanel>

                <TabPanel active={activeTab === 'sleep'}>
                    <PageTransition>
                        <SleepSync />
                    </PageTransition>
                </TabPanel>

                <TabPanel active={activeTab === 'memories'}>
                    <PageTransition>
                        <MemoriesGallery />
                    </PageTransition>
                </TabPanel>

                <TabPanel active={activeTab === 'profile'}>
                    <PageTransition>
                        <Profile
                            theme={theme}
                            setThemeOverride={setThemeOverride}
                            recentNotifications={recentNotifications}
                            onNotificationClick={handleNotificationClick}
                        />
                    </PageTransition>
                </TabPanel>

            </main>

            {/* Bottom Navigation */}
            <motion.div
                initial={false}
                animate={{ y: navHidden ? 120 : 0, opacity: navHidden ? 0 : 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 w-full z-50 p-4"
            >
                <div className="liquid-glass max-w-md mx-auto rounded-2xl flex items-center justify-around p-4 shadow-2xl backdrop-blur-xl border border-white/10">
                    <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={HomeIcon} label="Home" theme={theme} />
                    <NavButton active={activeTab === 'prompts'} onClick={() => setActiveTab('prompts')} icon={MessageCircleHeart} label="Daily Prompts" theme={theme} />
                    <NavButton active={activeTab === 'dj'} onClick={() => setActiveTab('dj')} icon={Radio} label="Telepathic DJ" theme={theme} />
                    <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={Calendar} label="Anticipation" theme={theme} />
                    <NavButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={Feather} label="Serenade" theme={theme} />
                    <NavButton active={activeTab === 'sleep'} onClick={() => setActiveTab('sleep')} icon={Moon} label="Sleep" theme={theme} />
                    <NavButton active={activeTab === 'memories'} onClick={() => setActiveTab('memories')} icon={Camera} label="Memories" theme={theme} />
                    <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={User} label="Profile" theme={theme} />
                </div>
            </motion.div>
        </div>
    );
};

// Nav button with sliding active pill (layoutId)
// eslint-disable-next-line no-unused-vars
const NavButton = ({ active, onClick, icon: Icon, label, theme }) => (
    <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.82 }}
        className={`group relative p-2 rounded-xl transition-colors ${active ? theme.textColor : 'text-white/40 hover:text-white/70'
            }`}
    >
        {/* Sliding active pill — shared layoutId across all NavButtons */}
        {active && (
            <motion.div
                layoutId="nav-active-pill"
                className="absolute inset-0 rounded-xl bg-white/10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
        )}
        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/5">
            {label}
        </div>
        <Icon className="w-6 h-6 relative z-10" />
    </motion.button>
);

export default DashboardLayout;
