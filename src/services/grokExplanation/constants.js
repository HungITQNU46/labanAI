'use strict';
const reference = require('../../../research/riasec27_top3_b1_v0/reference.json');
const READY = new Map(reference.majors.filter(m => m.status === 'READY_FOR_PROTOTYPE').map(m => [m.major_id, m]));
const RESEARCH_STATUS = 'RESEARCH_ONLY — TOP3_NOT_VALIDATED';
const UNAVAILABLE = 'Chưa thể tạo lời giải thích bằng AI lúc này';
const DOMAINS = ['R', 'I', 'A', 'S', 'E', 'C'];
class ExplanationError extends Error {
    constructor(code, status = 503) { super(UNAVAILABLE); this.code = code; this.status = status; }
}
module.exports = { reference, READY, RESEARCH_STATUS, UNAVAILABLE, DOMAINS, ExplanationError };
