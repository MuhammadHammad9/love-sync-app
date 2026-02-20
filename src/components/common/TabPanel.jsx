import React, { useState } from 'react';

const TabPanel = ({ active, children, className = "" }) => {
    const [hasVisited, setHasVisited] = useState(active);

    if (active && !hasVisited) { setHasVisited(true); }

    if (!hasVisited) return null;

    return (
        <div
            style={{ display: active ? 'block' : 'none' }}
            className={`h-full ${active ? 'animate-in fade-in zoom-in duration-300' : ''} ${className}`}
        >
            {children}
        </div>
    );
};

export default TabPanel;
