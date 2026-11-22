'use strict';
const { reference, ExplanationError } = require('./constants');

function sameKeys(value, keys) {
    return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}

function responseSchema(majors) {
    const entry = major => ({ type: 'object', additionalProperties: false,
        required: ['major_id', 'rank', 'reason', 'explore'], properties: {
            major_id: { type: 'string', const: major.major_id }, rank: { type: 'integer', const: major.rank },
            reason: { type: 'string', minLength: 8, maxLength: 450 },
            explore: { type: 'string', minLength: 8, maxLength: 350 }
        } });
    return { type: 'object', additionalProperties: false, required: ['explanations', 'limitations'], properties: {
        explanations: { type: 'array', minItems: 3, maxItems: 3, prefixItems: majors.map(entry) },
        limitations: { type: 'string', minLength: 8, maxLength: 350 }
    } };
}

function validateExplanation(output, context) {
    if (!sameKeys(output, ['explanations', 'limitations']) || !Array.isArray(output.explanations) || output.explanations.length !== 3) throw new ExplanationError('PROVIDER_INVALID_RESPONSE');
    const texts = [];
    for (const [index, entry] of output.explanations.entries()) {
        const major = context.majors[index];
        if (!sameKeys(entry, ['major_id', 'rank', 'reason', 'explore']) || entry.major_id !== major.major_id || entry.rank !== major.rank) throw new ExplanationError('PROVIDER_RANKING_MISMATCH');
        for (const [key, max] of [['reason', 450], ['explore', 350]]) {
            if (typeof entry[key] !== 'string' || entry[key].trim().length < 8 || entry[key].length > max) throw new ExplanationError('PROVIDER_INVALID_RESPONSE');
            texts.push(entry[key]);
        }
    }
    if (typeof output.limitations !== 'string' || output.limitations.length < 8 || output.limitations.length > 350 ||
        !/nghiên cứu/iu.test(output.limitations) || !/chưa (?:được )?kiểm chứng/iu.test(output.limitations)) throw new ExplanationError('PROVIDER_INVALID_RESPONSE');
    texts.push(output.limitations);
    const combined = texts.join('\n');
    const unsafe = /<[^>]*>|\d[\d.,]*\s*%|chắc chắn (?:phù hợp|trúng tuyển|thành công)|bạn (?:giỏi|có năng lực|có khả năng đặc biệt)|sẽ (?:thành công|đỗ|trúng tuyển)|thu nhập|cơ hội việc làm|\blương\b|\S+@\S+|điểm (?:học bạ|học tập|thi)(?: của bạn)?(?: là| đạt|:)\s*\d|khả năng trúng tuyển[^.]*cao|đã được kiểm chứng khoa học|top\s*#?\s*[4-9]|ngành thứ (?:tư|bốn|4)/iu;
    if (unsafe.test(combined)) throw new ExplanationError('PROVIDER_UNSAFE_RESPONSE');
    const allowed = new Set(context.majors.map(m => m.major_id));
    if (reference.majors.some(m => !allowed.has(m.major_id) && combined.toLowerCase().includes(m.major_name_vi.toLowerCase()))) throw new ExplanationError('PROVIDER_UNSAFE_RESPONSE');
    return { explanations: output.explanations.map(item => ({ ...item })), limitations: output.limitations };
}

module.exports = { sameKeys, responseSchema, validateExplanation };
