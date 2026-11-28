'use strict';
const { isPreviewEnabled } = require('../../middleware/riasec27PreviewGate');
const { RESEARCH_STATUS, ExplanationError } = require('./constants');
const { sameKeys, validateExplanation } = require('./explanationValidator');
const { createContextStore } = require('./explanationContext');
const { createGroqClient, readSettings } = require('./groqClient');

function createExplanationService({ fetchImpl, now = Date.now, config = () => ({
    provider: process.env.AI_EXPLANATION_PROVIDER || 'groq', apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL
}), timeoutMs = 15000, maxCallsPerMinute = 5, contextTtlMs = 600000, maxContexts = 100 } = {}) {
    const contexts = createContextStore({ now, ttlMs: contextTtlMs, maxContexts });
    const client = createGroqClient({ fetchImpl, timeoutMs, now });
    let calls = [], active = 0;
    const requests = new WeakMap();
    async function explain(owner, body) {
        if (!isPreviewEnabled()) throw new ExplanationError('AI_PREVIEW_DISABLED', 404);
        if (!sameKeys(body, ['context_token', 'consent']) || body.consent !== true || Buffer.byteLength(JSON.stringify(body), 'utf8') > 8192) throw new ExplanationError('INVALID_EXPLANATION_INPUT', 400);
        const context = contexts.verifyContext(owner, body.context_token);
        const settings = readSettings(config);
        const state = requests.get(context) || {attempts:0, result:null};
        requests.set(context, state);
        if (state.result) return structuredClone(state.result);
        if (state.attempts >= 3) throw new ExplanationError('CONTEXT_CALL_LIMIT', 429);
        calls = calls.filter(at => now()-at < 60000);
        if (calls.length >= maxCallsPerMinute || active >= 1) throw new ExplanationError('EXPLANATION_RATE_LIMIT', 429);
        calls.push(now()); active++; state.attempts++;
        try {
            const output = await client.request(context, settings);
            contexts.verifyContext(owner, body.context_token); // Also reject a result that expired while awaiting Groq.
            state.result = { status: 'SUCCESS', provider: 'groq', research_status: RESEARCH_STATUS, ...validateExplanation(output, context) };
            return structuredClone(state.result);
        } finally { active--; }
    }
    return { mintContext: contexts.mintContext, explain, contextStats: contexts.stats };
}
module.exports = { createExplanationService };
