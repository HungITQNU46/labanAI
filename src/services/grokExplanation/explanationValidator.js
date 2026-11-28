'use strict';
const { reference, DOMAINS, ExplanationError } = require('./constants');

function sameKeys(value, keys) {
    return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}

function responseSchema(majors) {
    const entry = major => ({ type: 'object', additionalProperties: false,
        required: ['major_id', 'rank', 'reason', 'explore', 'evidence_domains'], properties: {
            major_id: { type: 'string', const: major.major_id }, rank: { type: 'integer', const: major.rank },
            reason: { type: 'string', minLength: 8, maxLength: 450 },
            explore: { type: 'string', minLength: 8, maxLength: 350 },
            evidence_domains: { type: 'array', minItems: 2, maxItems: 3, uniqueItems: true, items: { type: 'string', enum: DOMAINS } }
        } });
    return { type: 'object', additionalProperties: false, required: ['explanations', 'limitations'], properties: {
        explanations: { type: 'array', minItems: 3, maxItems: 3, prefixItems: majors.map(entry) },
        limitations: { type: 'string', minLength: 8, maxLength: 800 }
    } };
}

function validateExplanation(output, context) {
    if (!sameKeys(output, ['explanations', 'limitations']) || !Array.isArray(output.explanations) || output.explanations.length !== 3) throw new ExplanationError('PROVIDER_INVALID_RESPONSE');
    const texts = [];
    for (const [index, entry] of output.explanations.entries()) {
        const major = context.majors[index];
        if (!sameKeys(entry, ['major_id', 'rank', 'reason', 'explore', 'evidence_domains']) || entry.major_id !== major.major_id || entry.rank !== major.rank) throw new ExplanationError('PROVIDER_RANKING_MISMATCH');
        if (!Array.isArray(entry.evidence_domains) || entry.evidence_domains.length<2 || entry.evidence_domains.length>3 || new Set(entry.evidence_domains).size!==entry.evidence_domains.length || entry.evidence_domains.some(d=>!DOMAINS.includes(d))) throw new ExplanationError('PROVIDER_INVALID_RESPONSE');
        for (const [key, max] of [['reason', 450], ['explore', 350]]) {
            if (typeof entry[key] !== 'string' || entry[key].trim().length < 8 || entry[key].length > max) throw new ExplanationError('PROVIDER_INVALID_RESPONSE');
            texts.push(entry[key]);
        }
    }
    if (typeof output.limitations !== 'string' || output.limitations.length < 8 || output.limitations.length > 800 ||
        !/nghiên cứu/iu.test(output.limitations) || !/chưa (?:được )?kiểm chứng/iu.test(output.limitations)) throw new ExplanationError('PROVIDER_INVALID_RESPONSE');
    texts.push(output.limitations);
    const combined = texts.join('\n');
    const unsafe = /<[^>]*>|\d[\d.,]*\s*%|chắc chắn (?:phù hợp|trúng tuyển|thành công)|bạn (?:giỏi|có năng lực|có khả năng đặc biệt)|sẽ (?:thành công|đỗ|trúng tuyển)|thu nhập|cơ hội việc làm|\blương\b|\S+@\S+|điểm (?:học bạ|học tập|thi)(?: của bạn)?(?: là| đạt|:)\s*\d|khả năng trúng tuyển[^.]*cao|đã được kiểm chứng khoa học|top\s*#?\s*[4-9]|ngành thứ (?:tư|bốn|4)/iu;
    if (unsafe.test(combined)) throw new ExplanationError('PROVIDER_UNSAFE_RESPONSE');
    if (/phù hợp với năng lực|bạn có (?:tư duy|năng khiếu|kỹ năng)|năng lực (?:quản lý|phân tích|lãnh đạo) của bạn/iu.test(combined)) throw new ExplanationError('PROVIDER_UNSAFE_RESPONSE');
    if (/mức độ phù hợp (?:rất )?(?:cao|trung bình|thấp)/iu.test(combined)) throw new ExplanationError('PROVIDER_UNSAFE_RESPONSE');
    const allowed = new Set(context.majors.map(m => m.major_id));
    if (reference.majors.some(m => !allowed.has(m.major_id) && combined.toLowerCase().includes(m.major_name_vi.toLowerCase()))) throw new ExplanationError('PROVIDER_UNSAFE_RESPONSE');
    return { explanations: output.explanations.map((item,index) => {
        const major=context.majors[index];
        const survey=item.evidence_domains.map(d=>`${d} (${context.domain_names_vi[d]}): ${context.survey_domain_means[d].toFixed(2)}/5`).join('; ');
        return {major_id:item.major_id,rank:item.rank,
            reason:`Bài khảo sát ghi nhận điểm trung bình nhóm sở thích ${survey}. ${item.reason} Nghề tham chiếu cho ngành ${major.major_name_vi} (mã ${major.major_code}) là ${major.occupation_title_en} (${major.soc_code}). Pearson r = ${major.pearson_r.toFixed(2)} biểu thị tương đồng hình dạng hồ sơ ML sáu chiều đã chuẩn hóa.`,
            explore:item.explore};
    }), limitations: output.limitations };
}

module.exports = { sameKeys, responseSchema, validateExplanation };
