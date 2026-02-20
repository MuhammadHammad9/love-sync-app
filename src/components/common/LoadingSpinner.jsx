import React from 'react';

const LoadingSpinner = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-rose-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-rose-200 border-t-rose-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                </div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
