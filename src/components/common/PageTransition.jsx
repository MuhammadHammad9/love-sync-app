import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

const PageTransition = ({ children }) => (
    <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
    >
        {children}
    </motion.div>
);

export default PageTransition;
