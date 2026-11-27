const { GoogleGenAI } = require('@google/genai');

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

async function callGroq({ systemInstruction, history = [], userMessage }) {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new Error('Chưa cấu hình GROQ_API_KEY');

    const messages = [
        { role: 'system', content: systemInstruction },
        ...history.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        })),
        { role: 'user', content: userMessage }
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 1500
        })
    });

    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error?.message || `Groq HTTP ${res.status}`);
        err.status = res.status;
        throw err;
    }

    return data.choices?.[0]?.message?.content?.trim() || 'Xin lỗi, mình chưa thể tạo câu trả lời lúc này.';
}

async function callGeminiFallback({ systemInstruction, history = [], userMessage }) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error('Chưa cấu hình GEMINI_API_KEY');

    const ai = new GoogleGenAI({ apiKey });
    const contents = [
        ...history.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: { systemInstruction, temperature: 0.7 }
    });

    return response.text || 'Xin lỗi, mình chưa thể tạo câu trả lời lúc này.';
}

async function generateChatReply(params) {
    // 1. Ưu tiên gọi Groq trước (nhanh, ổn định)
    if (process.env.GROQ_API_KEY?.trim()) {
        try {
            return await callGroq(params);
        } catch (groqErr) {
            console.warn(`⚠️ Groq lỗi (${groqErr.status}): ${groqErr.message} -> chuyển sang Gemini dự phòng...`);        }
    }

    // 2. Dự phòng bằng Gemini nếu Groq gặp sự cố hoặc chưa có key
    return await callGeminiFallback(params);
}

module.exports = { generateChatReply, GROQ_MODEL, GEMINI_MODEL };