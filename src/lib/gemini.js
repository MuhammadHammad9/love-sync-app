import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);

export const generateDailyQuestion = async () => {
    if (!API_KEY) {
        console.warn("Gemini API Key missing");
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Generate a single, short, deep, and romantic question for a couple to ask each other. It should be suitable for a daily relationship prompt. Just return the question text, no quotes or extra text.";

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return text.trim();
    } catch (error) {
        console.error("Error generating question with Gemini:", error);
        return null;
    }
};

export const generateMagicImage = async (userPrompt) => {
    // Enhance prompt for better quality
    const enhancedPrompt = `romantic couple photo, ${userPrompt}, cinematic lighting, highly detailed, photorealistic, 8k quality`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 1000000);

    // Use Pollinations.ai - Free, no API key required
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=768&height=768&nologo=true&enhance=true`;





    // Return URL directly - browser will handle loading
    // If service is down, image just won't display (better than blocking with error)
    return imageUrl;
};

export const generateContextualNote = async (weather, partnerMood, randomMemory) => {
    if (!API_KEY) return null;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = `
Role: You are a deeply in love partner, not an AI.
Tone: Rich, descriptive, passionate, and raw. Like a love letter turned into poetry.
Input Context:
- Weather: ${weather || "The sky is vast"}
- Partner's Mood: ${partnerMood || "Mystery"}
- Shared Memory: ${randomMemory || "Us"}

Task: Write a longer free-verse poem (8-12 lines).
Guidelines:
- Describe the specific details of your partner and your bond.
- Use the weather and memory to paint a vivid picture.
- Do not rhyme cheesily. Focus on imagery and emotion.
- Break it into 2-3 stanzas.
- Make it feel like a deep, thoughtful dedication.
        `.trim();

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating note:", error);
        return null;
    }
};
