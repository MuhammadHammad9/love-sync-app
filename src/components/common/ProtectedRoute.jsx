import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, profile, couple, loading, isProfileComplete } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-love-500">
                <Loader className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!user) return <Navigate to="/auth" />;

    // Check if profile is complete (has username and avatar)
    if (profile && !isProfileComplete()) {
        if (window.location.pathname !== '/profile-setup') {
            return <Navigate to="/profile-setup" />;
        }
        return children;
    }

    // 1. No Couple ID -> Onboarding
    if (!profile?.couple_id) {
        if (window.location.pathname !== '/onboarding') {
            return <Navigate to="/onboarding" />;
        }
        return children;
    }

    // 2. Has Couple ID but waiting for partner -> Onboarding (Waiting Screen)
    // We check if couple data is loaded and has partner_b
    const isConnected = couple && couple.partner_b;

    if (!isConnected) {
        if (window.location.pathname !== '/onboarding') {
            return <Navigate to="/onboarding" />;
        }
        return children;
    }

    // 3. fully connected -> Dashboard
    if (window.location.pathname === '/onboarding') {
        return <Navigate to="/" />;
    }

    return children;
};

export default ProtectedRoute;
