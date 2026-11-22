'use strict';
const { randomBytes, createHmac, timingSafeEqual } = require('node:crypto');
const { READY, DOMAINS, RESEARCH_STATUS, ExplanationError } = require('./constants');
const { sameKeys } = require('./explanationValidator');

function buildContext(ml) {
    if (ml?.status !== 'SUCCESS') return null;
    if (!Array.isArray(ml.top3) || ml.top3.length !== 3) throw new ExplanationError('INVALID_ML_CONTEXT');
    if (!Array.isArray(ml.all_rankings) || ml.all_rankings.length !== READY.size ||
        new Set(ml.all_rankings.map(m => m.major_id)).size !== READY.size ||
        ml.all_rankings.some(m => !READY.has(m.major_id)) ||
        ml.top3.some((m, i) => m.major_id !== ml.all_rankings[i].major_id || m.rank !== ml.all_rankings[i].rank || m.pearson_r !== ml.all_rankings[i].pearson_r) ||
        ml.all_rankings[2].rank === ml.all_rankings[3].rank) throw new ExplanationError('INVALID_ML_CONTEXT');
    const ids = new Set();
    const majors = ml.top3.map(item => {
        const source = READY.get(item.major_id);
        if (!source || ids.has(item.major_id) || !Number.isInteger(item.rank) || item.rank < 1 || !Number.isFinite(item.pearson_r) || Math.abs(item.pearson_r) > 1 || source.soc_code !== item.soc_code) throw new ExplanationError('INVALID_ML_CONTEXT');
        ids.add(item.major_id);
        return { rank: item.rank, major_id: source.major_id, major_code: source.moet_code, major_name_vi: source.major_name_vi,
            soc_code: source.soc_code, occupation_title_en: source.occupation_title_en,
            pearson_r: item.pearson_r, reference_riasec: Object.fromEntries(DOMAINS.map((d, i) => [d, source.oi_vector[i]])) };
    });
    const profile = ml.standardized_vector;
    if (!sameKeys(profile, DOMAINS) || DOMAINS.some(d => !Number.isFinite(profile[d]))) throw new ExplanationError('INVALID_ML_CONTEXT');
    return { majors, p2_standardized_profile: Object.fromEntries(DOMAINS.map(d => [d, profile[d]])),
        highest_standardized_domains: DOMAINS.filter(d => profile[d] === Math.max(...DOMAINS.map(k => profile[k]))), research_status: RESEARCH_STATUS };
}

function freezeDeep(value) {
    for (const child of Object.values(value)) if (child && typeof child === 'object') freezeDeep(child);
    return Object.freeze(value);
}

function createContextStore({ now = Date.now, ttlMs = 600000, maxContexts = 100 } = {}) {
    if (!Number.isInteger(maxContexts) || maxContexts < 1 || maxContexts > 1000 || !Number.isInteger(ttlMs) || ttlMs < 1 || ttlMs > 3600000) throw new RangeError('Invalid context bounds');
    const secret = randomBytes(32), contexts = new Map();
    function remove(id) {
        const entry = contexts.get(id);
        if (entry) clearTimeout(entry.timer);
        contexts.delete(id);
    }
    function purge() {
        for (const [id, entry] of contexts) if (entry.expires <= now()) remove(id);
    }
    function mintContext(ml) {
        const data = buildContext(ml);
        if (!data) return null;
        purge();
        while (contexts.size >= maxContexts) remove(contexts.keys().next().value);
        const id = randomBytes(32).toString('base64url');
        const timer = setTimeout(() => remove(id), ttlMs); timer.unref();
        contexts.set(id, { data: freezeDeep(data), expires: now()+ttlMs, timer });
        return id + '.' + createHmac('sha256', secret).update(id).digest('base64url');
    }
    function verifyContext(token) {
        if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(token)) throw new ExplanationError('INVALID_CONTEXT', 400);
        const [id, signature] = token.split('.');
        const expected = createHmac('sha256', secret).update(id).digest();
        const actual = Buffer.from(signature, 'base64url');
        if (actual.length !== expected.length || actual.toString('base64url') !== signature || !timingSafeEqual(actual, expected)) throw new ExplanationError('INVALID_CONTEXT', 400);
        purge();
        const entry = contexts.get(id);
        if (!entry) throw new ExplanationError('CONTEXT_EXPIRED', 400); // Expired or evicted; never recompute ML here.
        return entry.data;
    }
    return { mintContext, verifyContext, stats() { purge(); return { count: contexts.size, capacity: maxContexts, ttlMs }; }, clear() { for (const id of contexts.keys()) remove(id); } };
}

module.exports = { createContextStore };
