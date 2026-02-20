import { Smile, Frown, Heart, Coffee, Moon, Sun, CloudRain, Sparkles } from 'lucide-react';

export const MOOD_CONFIG = {
    milestone: {
        id: 'milestone',
        label: 'Celebration',
        icon: Sparkles,
        // Premium Golden Theme
        gradient: 'bg-gradient-to-br from-yellow-600 via-amber-900 to-black',
        textColor: 'text-yellow-200',
        borderColor: 'border-yellow-400/50',
        glassColor: 'bg-yellow-900/40 backdrop-blur-xl',
        palette: ['#CA8A04', '#EAB308', '#A16207', '#FFFF00'], // Yellow-600, 500, 700, Bright
        quotes: [
            "We are striking gold today!",
            "Another milestone unlocked.",
            "Our connection is precious.",
            "Shining brighter together.",
            "Celebrating our journey."
        ]
    },
    happy: {
        id: 'happy',
        label: 'Happy',
        icon: Smile,
        // Rich Yellow Dark Theme
        gradient: 'bg-gradient-to-br from-yellow-950 via-black to-yellow-900',
        textColor: 'text-yellow-400',
        borderColor: 'border-yellow-500/30',
        glassColor: 'bg-yellow-500/10',
        palette: ['#EAB308', '#CA8A04', '#FACC15', '#FEF08A'], // Yellow-500, 600, 400, 200
        quotes: [
            "You are my sunshine on a rainy day.",
            "Happiness is better when shared with you.",
            "Your smile is my favorite curve.",
            "Every day with you is a new adventure.",
            "You make my heart smile."
        ]
    },
    sad: {
        id: 'sad',
        label: 'Sad',
        icon: Frown,
        // Deep Blue Dark Theme
        gradient: 'bg-gradient-to-br from-blue-950 via-black to-blue-900',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        glassColor: 'bg-blue-500/10',
        palette: ['#3B82F6', '#1D4ED8', '#60A5FA', '#93C5FD'], // Blue-500, 700, 400, 300
        quotes: [
            "Lean on me, I'm here for you.",
            "This too shall pass, together.",
            "I'm just a heartbeat away.",
            "Your burden is my burden.",
            "Let me hold you until the storm passes."
        ]
    },
    romantic: {
        id: 'romantic',
        label: 'Romantic',
        icon: Heart,
        // Deep Pink/Red Dark Theme
        gradient: 'bg-gradient-to-br from-pink-950 via-black to-pink-900',
        textColor: 'text-pink-500',
        borderColor: 'border-pink-500/30',
        glassColor: 'bg-pink-500/10',
        palette: ['#EC4899', '#DB2777', '#F472B6', '#BE185D'], // Pink-500, 600, 400, 700
        quotes: [
            "In you, I've found the love of my life.",
            "You are my heart, my life, my one and only thought.",
            "Every love story is beautiful, but ours is my favorite.",
            "I love you more than words can say.",
            "You are the poem I never knew how to write."
        ]
    },
    tired: {
        id: 'tired',
        label: 'Tired',
        icon: Moon,
        // Deep Purple Dark Theme
        gradient: 'bg-gradient-to-br from-purple-950 via-black to-purple-900',
        textColor: 'text-purple-400',
        borderColor: 'border-purple-500/30',
        glassColor: 'bg-purple-500/10',
        palette: ['#A855F7', '#7E22CE', '#C084FC', '#E9D5FF'], // Purple-500, 700, 400, 200
        quotes: [
            "Rest your head, I've got this.",
            "Let's dream together.",
            "Sleep is the best meditation, especially with you.",
            "You deserve a break.",
            "Peace is being with you."
        ]
    },
    energetic: {
        id: 'energetic',
        label: 'Energetic',
        icon: Sun,
        // Deep Orange Dark Theme
        gradient: 'bg-gradient-to-br from-orange-950 via-black to-orange-900',
        textColor: 'text-orange-400',
        borderColor: 'border-orange-500/30',
        glassColor: 'bg-orange-500/10',
        palette: ['#F97316', '#EA580C', '#FB923C', '#FED7AA'], // Orange-500, 600, 400, 200
        quotes: [
            "Let's conquer the world together!",
            "Your energy fuels my soul.",
            "Together, we are unstoppable.",
            "Let's make some memories today!",
            "You are my power source."
        ]
    },
    cozy: {
        id: 'cozy',
        label: 'Cozy',
        icon: Coffee,
        // Deep Amber Dark Theme
        gradient: 'bg-gradient-to-br from-amber-950 via-black to-amber-900',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-700/30',
        glassColor: 'bg-amber-700/10',
        palette: ['#D97706', '#B45309', '#F59E0B', '#FDE68A'], // Amber-600, 700, 500, 200
        quotes: [
            "Home is wherever I'm with you.",
            "Warm hugs and warm hearts.",
            "You are my comfort zone.",
            "Let's stay in and cuddle.",
            "Nap dates are the best dates."
        ]
    },
    gloomy: {
        id: 'gloomy',
        label: 'Gloomy',
        icon: CloudRain,
        // Deep Gray Dark Theme
        gradient: 'bg-gradient-to-br from-gray-950 via-black to-gray-800',
        textColor: 'text-gray-400',
        borderColor: 'border-gray-500/30',
        glassColor: 'bg-gray-500/10',
        palette: ['#6B7280', '#4B5563', '#9CA3AF', '#D1D5DB'], // Gray-500, 600, 400, 300
        quotes: [
            "Even the darkest night will end and the sun will rise.",
            "I will be your umbrella.",
            "Rainy days are for holding hands.",
            "We can weather any storm.",
            "I'm here."
        ]
    },
    // Manual Overrides
    light: {
        id: 'light',
        label: 'Light',
        icon: Sun,
        // Pro Clean Light Theme
        gradient: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200',
        glassColor: 'bg-white/60 backdrop-blur-xl',
        palette: ['#374151', '#111827', '#6B7280', '#F3F4F6'],
        quotes: ["Simplicity is the ultimate sophistication."]
    },
    dark: {
        id: 'dark',
        label: 'Dark',
        icon: Moon,
        // Pro Clean Dark Theme
        gradient: 'bg-gradient-to-br from-gray-950 via-black to-gray-900',
        textColor: 'text-white',
        borderColor: 'border-white/10',
        glassColor: 'bg-white/5 backdrop-blur-xl',
        palette: ['#F3F4F6', '#E5E7EB', '#9CA3AF', '#374151'],
        quotes: ["In the dark, we find the stars."]
    }
};

export const DEFAULT_THEME = MOOD_CONFIG.romantic;

export const getTheme = (moodId) => MOOD_CONFIG[moodId] || DEFAULT_THEME;
