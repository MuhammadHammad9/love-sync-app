import React, { useMemo, useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

// PROMPT 7: Ambient Background (Atmospheric Motion)
// Update: Dynamic Theme Integration, Premium Organic Motion
// Refactor: Separated Movement and Appearance for reliable triggers
// Revert: Removed hover interaction per user request
// Optimization: Added React.memo to prevent unnecessary re-renders

const AtmosphericBackground = React.memo(({ theme }) => {
    // Default palette if theme is not yet available
    const palette = theme?.palette || ['#EC4899', '#DB2777', '#F472B6', '#BE185D'];

    // Default background gradient if not provided
    const bgGradient = theme?.gradient || 'bg-gradient-to-br from-slate-950 via-black to-slate-900';

    // Random Movement Logic (Target Position)
    const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });

    const generateTarget = useCallback(() => {
        // Move fairly wide: +/- 40% of viewport
        return {
            x: Math.random() * 80 - 40,
            y: Math.random() * 80 - 40
        };
    }, []);

    useEffect(() => {
        setTargetPos(generateTarget());
    }, [generateTarget]);

    const blobKey = useMemo(() => ({
        size: 'w-[60rem] h-[60rem]',
        initialX: 'calc(50% - 30rem)',
        initialY: 'calc(50% - 30rem)',
    }), []);

    return (
        <div className={`fixed inset-0 overflow-hidden pointer-events-none -z-50 transition-colors duration-1000 ${bgGradient}`}>
            {/* Overlay to ensure it's not too bright */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Aurora / Mesh Gradient Layer */}
            <div className="absolute inset-0 opacity-60 blur-3xl">
                {/* MOVEMENT WRAPPER: Handles the Random Walk (Point A -> Point B) */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    animate={{
                        x: `${targetPos.x}%`,
                        y: `${targetPos.y}%`
                    }}
                    transition={{
                        duration: 25, // Slow drift to new target
                        ease: "easeInOut"
                    }}
                    onAnimationComplete={() => {
                        setTargetPos(generateTarget());
                    }}
                >
                    {/* APPEARANCE WRAPPER: Handles Shape, Rotation, and Color Cycles */}
                    <motion.div
                        className={`mix-blend-screen ${blobKey.size}`}
                        initial={{
                            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%"
                        }}
                        animate={{
                            scale: [1, 1.2, 0.9, 1.1, 1],
                            rotate: [0, 90, 180, 270, 360],
                            borderRadius: [
                                "60% 40% 30% 70% / 60% 30% 70% 40%",
                                "30% 60% 70% 40% / 50% 60% 30% 60%",
                                "70% 30% 50% 50% / 30% 50% 70% 50%",
                                "60% 40% 30% 70% / 60% 30% 70% 40%"
                            ],
                            backgroundColor: palette
                        }}
                        transition={{
                            rotate: { duration: 60, repeat: Infinity, ease: "linear" },
                            scale: { duration: 20, repeat: Infinity, ease: "easeInOut" },
                            borderRadius: { duration: 15, repeat: Infinity, ease: "easeInOut" },
                            backgroundColor: { duration: 10, repeat: Infinity, ease: "linear" }
                        }}
                    />
                </motion.div>
            </div>

            {/* Noise Overlay (Texture) */}
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        </div>
    );
});

AtmosphericBackground.displayName = 'AtmosphericBackground';

export default AtmosphericBackground;
