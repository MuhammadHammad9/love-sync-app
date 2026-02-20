import React from 'react';
import { motion } from 'framer-motion';

// Reusable stagger variants — import these in child components
export const staggerContainer = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.07,
            delayChildren: 0.1,
        },
    },
};

export const staggerItem = {
    hidden: { opacity: 0, y: 18, scale: 0.97 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 340, damping: 28 },
    },
};

export const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
};

const PageTransition = ({ children }) => (
    <motion.div
        initial="hidden"
        animate="show"
        variants={{
            hidden: { opacity: 0, y: 14, scale: 0.97, filter: 'blur(4px)' },
            show: {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'blur(0px)',
                transition: { type: 'spring', stiffness: 320, damping: 28 },
            },
        }}
        className="h-full"
    >
        {children}
    </motion.div>
);

export default PageTransition;
