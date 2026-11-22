'use strict';
const { isPreviewEnabled } = require('../../middleware/riasec27PreviewGate');
const { RESEARCH_STATUS, ExplanationError } = require('./constants');
const { sameKeys, validateExplanation } = require('./explanationValidator');
const { createContextStore } = require('./explanationContext');
const { createGroqClient, readSettings, DEFAULT_GROQ_MODEL } = require('./groqClient');

function createExplanationService({ fetchImpl, now = Date.now, config = () => ({
    provider: process.env.AI_EXPLANATION_PROVIDER || 'groq', apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL === undefined ? DEFAULT_GROQ_MODEL : process.env.GROQ_MODEL
}), timeoutMs = 15000, maxCallsPerMinute = 5, contextTtlMs = 600000, maxContexts = 100 } = {}) {
    const contexts = createContextStore({ now, ttlMs: contextTtlMs, maxContexts });
    const client = createGroqClient({ fetchImpl, timeoutMs, now });
    let calls = [], active = 0;
    async function explain(body) {
        if (!isPreviewEnabled()) throw new ExplanationError('AI_PREVIEW_DISABLED', 404);
        if (!sameKeys(body, ['context_token', 'consent']) || body.consent !== true || Buffer.byteLength(JSON.stringify(body), 'utf8') > 8192) throw new ExplanationError('INVALID_EXPLANATION_INPUT', 400);
        const context = contexts.verifyContext(body.context_token);
        const settings = readSettings(config);
        calls = calls.filter(at => now()-at < 60000);
        if (calls.length >= maxCallsPerMinute || active >= 1) throw new ExplanationError('EXPLANATION_RATE_LIMIT', 429);
        calls.push(now()); active++;
        try {
            const output = await client.request(context, settings);
            contexts.verifyContext(body.context_token); // Also reject a result that expired while awaiting Groq.
            return { status: 'SUCCESS', provider: 'groq', research_status: RESEARCH_STATUS, ...validateExplanation(output, context) };
        } finally { active--; }
    }
    return { mintContext: contexts.mintContext, explain, contextStats: contexts.stats };
}
module.exports = { createExplanationService };
