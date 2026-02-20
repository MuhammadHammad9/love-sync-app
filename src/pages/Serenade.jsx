import React from 'react';
import { Feather } from 'lucide-react';
import PageTransition from '../components/common/PageTransition';
import ContextualPoet from '../components/ContextualPoet';

const Serenade = () => {
    return (
        <PageTransition>
            <div className="p-6 h-full flex flex-col">
                <header className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-love-300 flex items-center justify-center gap-3">
                        <Feather className="w-8 h-8" />
                        Serenade
                    </h2>
                    <p className="text-white/50 text-xs tracking-widest uppercase mt-2">AI-woven poetry for you</p>
                </header>
                <ContextualPoet />
            </div>
        </PageTransition>
    );
};

export default Serenade;
