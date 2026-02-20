/**
 * Extracts the YouTube Video ID from various URL formats.
 * Supports:
 * - standard: https://www.youtube.com/watch?v=VIDEO_ID
 * - short: https://youtu.be/VIDEO_ID
 * - embed: https://www.youtube.com/embed/VIDEO_ID
 * - mobile: https://m.youtube.com/watch?v=VIDEO_ID
 * 
 * @param {string} url - The YouTube URL
 * @returns {string|null} - The Video ID or null if invalid
 */
export const extractVideoID = (url) => {
    if (!url) return null;

    // Handle already extracted IDs (simple alpha-numeric check, usually 11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
        return url;
    }

    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);

    return (match && match[7].length === 11) ? match[7] : null;
};

/**
 * Validates if the string is a potential YouTube URL or ID
 * @param {string} str 
 * @returns {boolean}
 */
export const isValidYoutubeInput = (str) => {
    return !!extractVideoID(str);
};
