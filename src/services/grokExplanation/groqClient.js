'use strict';
const { ExplanationError } = require('./constants');
const { buildGroqRequest } = require('./explanationPrompt');

const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

function readSettings(config) {
    const settings = config();
    if (settings?.provider !== 'groq' || typeof settings.apiKey !== 'string' ||
        !/^gsk_[A-Za-z0-9_-]+$/.test(settings.apiKey)) throw new ExplanationError('AI_NOT_CONFIGURED');
    const model = settings.model === undefined ? DEFAULT_GROQ_MODEL : settings.model;
    if (typeof model !== 'string' || !model || model.length > 160 || !/^[A-Za-z0-9._:/-]+$/.test(model)) throw new ExplanationError('AI_NOT_CONFIGURED');
    return { provider: 'groq', apiKey: settings.apiKey, model };
}

async function limitedJson(response) {
    if (!response.body) throw new ExplanationError('PROVIDER_INVALID_RESPONSE');
    let size = 0; const chunks = [];
    for await (const chunk of response.body) {
        size += chunk.byteLength;
        if (size > 32768) throw new ExplanationError('PROVIDER_RESPONSE_TOO_LARGE');
        chunks.push(Buffer.from(chunk));
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new ExplanationError('PROVIDER_INVALID_RESPONSE'); }
}

function retryDelayMs(value, now) {
    if (typeof value !== 'string' || !value.trim()) return 60000;
    const trimmed = value.trim();
    const delay = /^\d+(?:\.\d+)?$/.test(trimmed) ? Math.ceil(Number(trimmed) * 1000) : Date.parse(trimmed) - now;
    return Number.isSafeInteger(delay) && Number.isSafeInteger(now + delay) ? Math.max(0, delay) : 60000;
}

function createGroqClient({ fetchImpl = (...args) => fetch(...args), timeoutMs = 15000, now = Date.now } = {}) {
    let blockedUntil = 0;
    function rateLimitError() {
        const error = new ExplanationError('PROVIDER_QUOTA_OR_RATE_LIMIT', 429);
        error.retryAfterSeconds = Math.max(0, Math.ceil((blockedUntil - now()) / 1000));
        return error;
    }
    async function request(context, settings) {
        if (now() < blockedUntil) throw rateLimitError();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST', redirect: 'error', signal: controller.signal,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
                body: JSON.stringify(buildGroqRequest(context, settings.model))
            });
            if (response.status === 429) {
                const at = now();
                blockedUntil = at + retryDelayMs(response.headers.get('retry-after'), at);
                throw rateLimitError(); // No automatic retries or key/provider rotation.
            }
            if (!response.ok) {
                const code = ({ 401: 'PROVIDER_AUTHENTICATION_FAILED', 403: 'PROVIDER_ACCESS_DENIED',
                    400: 'PROVIDER_MODEL_OR_REQUEST_INVALID', 404: 'PROVIDER_MODEL_OR_REQUEST_INVALID' })[response.status] || 'PROVIDER_UNAVAILABLE';
                throw new ExplanationError(code);
            }
            const data = await limitedJson(response);
            if (data?.object !== 'chat.completion' || !Array.isArray(data.choices) || data.choices.length !== 1) throw new ExplanationError('PROVIDER_INVALID_RESPONSE');
            const choice = data.choices[0], message = choice?.message;
            if (choice?.finish_reason !== 'stop') throw new ExplanationError('PROVIDER_INCOMPLETE_RESPONSE');
            if (choice.index !== 0 || message?.role !== 'assistant' || message.refusal || message.tool_calls || message.function_call ||
                typeof message.content !== 'string' || message.content.length > 4000) throw new ExplanationError('PROVIDER_INVALID_RESPONSE');
            let output;
            try { output = JSON.parse(message.content); } catch { throw new ExplanationError('PROVIDER_INVALID_RESPONSE'); }
            if (JSON.stringify(output)?.includes(settings.apiKey)) throw new ExplanationError('PROVIDER_UNSAFE_RESPONSE');
            return output;
        } catch (error) {
            if (controller.signal.aborted) throw new ExplanationError('PROVIDER_TIMEOUT');
            if (error instanceof ExplanationError) throw error;
            throw new ExplanationError('PROVIDER_UNAVAILABLE');
        } finally { clearTimeout(timer); }
    }
    return { request };
}

module.exports = { createGroqClient, readSettings, DEFAULT_GROQ_MODEL };
