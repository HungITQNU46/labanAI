/**
 * riasec27Service.js
 * 
 * Adapter service orchestrating Node.js ↔ Python execution for Direction B.
 * Features:
 *  - Strict JavaScript-side input validation for 27 RIASEC answers
 *  - Safe child_process.spawn invocation with shell: false
 *  - Handles process timeout, abnormal exits, and malformed JSON
 *  - Zero storage: no persistence to database, files, or persistent memory
 *  - Never reflects personal probabilities or sensitive paths in error responses
 */

'use strict';

const path = require('path');
const { spawn } = require('child_process');
const riasec27Questionnaire = require('../models/riasec27Questionnaire');

const EXPECTED_QUESTION_ORDER = [
    'R1', 'I1', 'A1', 'R2', 'I2', 'A2', 'S1', 'S2', 'R3', 'A3',
    'S3', 'E1', 'R4', 'S4', 'E2', 'R5', 'I3', 'A4', 'E3', 'I4',
    'A5', 'E4', 'C1', 'E5', 'C2', 'C3', 'C4'
];

const MAX_CONCURRENT_WORKERS = 8;
const MAX_BUFFER_BYTES = 512 * 1024; // 512 KB
let activeWorkers = 0;

class Riasec27InputError extends Error {
    constructor(message) {
        super(message);
        this.name = 'Riasec27InputError';
    }
}

class Riasec27ServiceError extends Error {
    constructor(message, code = 'SERVICE_ERROR') {
        super(message);
        this.name = 'Riasec27ServiceError';
        this.code = code;
    }
}

function getPythonConfig() {
    if (process.env.ML_PYTHON) {
        return { command: process.env.ML_PYTHON, prefixArgs: ['-B'] };
    }
    if (process.platform === 'win32') {
        return { command: 'py', prefixArgs: ['-3.14', '-B'] };
    }
    return { command: 'python3', prefixArgs: ['-B'] };
}

/**
 * Validates and orders raw answers into a 27-element integer array.
 * Accepts either:
 *   - Array of 27 integers (1-5) matching EXPECTED_QUESTION_ORDER
 *   - Object mapping 'R1'..'C4' to integers (1-5)
 */
function validateAndOrderAnswers(rawAnswers) {
    if (!rawAnswers || typeof rawAnswers !== 'object') {
        throw new Riasec27InputError('Dữ liệu câu trả lời phải là một mảng 27 phần tử hoặc một đối tượng ánh xạ câu hỏi.');
    }

    if (Array.isArray(rawAnswers)) {
        if (rawAnswers.length !== 27) {
            throw new Riasec27InputError(`Bài khảo sát yêu cầu chính xác 27 câu trả lời, nhận được ${rawAnswers.length}.`);
        }
        for (let i = 0; i < 27; i++) {
            const val = rawAnswers[i];
            if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 5) {
                throw new Riasec27InputError(`Câu hỏi ${EXPECTED_QUESTION_ORDER[i]} (vị trí ${i + 1}) phải là số nguyên từ 1 đến 5.`);
            }
        }
        return rawAnswers.slice();
    }

    // Handle object mapping { R1: 3, I1: 4, ... }
    const keys = Object.keys(rawAnswers);
    if (keys.length !== 27) {
        throw new Riasec27InputError(`Bài khảo sát yêu cầu chính xác 27 câu hỏi (R1..C4), nhận được ${keys.length} trường.`);
    }

    const ordered = [];
    for (const q of EXPECTED_QUESTION_ORDER) {
        if (!Object.prototype.hasOwnProperty.call(rawAnswers, q)) {
            throw new Riasec27InputError(`Thiếu câu trả lời bắt buộc: ${q}.`);
        }
        const val = rawAnswers[q];
        if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 5) {
            throw new Riasec27InputError(`Câu hỏi ${q} phải là số nguyên từ 1 đến 5.`);
        }
        ordered.push(val);
    }

    return ordered;
}

/**
 * Executes python bridge script with given payload via stdin.
 */
function callPythonBridge(payload, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        if (activeWorkers >= MAX_CONCURRENT_WORKERS) {
            return reject(new Riasec27ServiceError(
                'Hệ thống đang bận xử lý tác vụ khác. Vui lòng thử lại sau giây lát.',
                'CONCURRENCY_LIMIT'
            ));
        }

        const jsonPayload = JSON.stringify(payload);
        if (jsonPayload.length > 10240) {
            return reject(new Riasec27ServiceError('Kích thước payload vượt quá 10 KB.', 'PAYLOAD_TOO_LARGE'));
        }

        activeWorkers++;
        let cleanedUp = false;
        const releaseWorker = () => {
            if (!cleanedUp) {
                cleanedUp = true;
                activeWorkers = Math.max(0, activeWorkers - 1);
            }
        };

        const { command, prefixArgs } = getPythonConfig();
        const bridgeScript = path.join(__dirname, 'riasec27_bridge.py');
        const args = [...prefixArgs, bridgeScript];

        const child = spawn(command, args, {
            shell: false,
            // JSON crosses a byte pipe, not a Windows console. Match Node's UTF-8 decoder
            // even when the launching terminal/Python would otherwise use cp1252.
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        // Streams can split one multibyte character between two data events.
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');

        let stdoutData = '';
        let stderrData = '';
        let isTimedOut = false;

        const timer = setTimeout(() => {
            isTimedOut = true;
            try { child.kill('SIGTERM'); } catch {}
            setTimeout(() => {
                try { if (!child.killed) child.kill('SIGKILL'); } catch {}
            }, 1000);
            releaseWorker();
            reject(new Riasec27ServiceError('Thời gian xử lý mô hình vượt quá giới hạn (timeout).', 'TIMEOUT_ERROR'));
        }, timeoutMs);

        child.stdout.on('data', (chunk) => {
            stdoutData += chunk.toString('utf8');
            if (stdoutData.length > MAX_BUFFER_BYTES) {
                try { child.kill('SIGKILL'); } catch {}
                clearTimeout(timer);
                releaseWorker();
                reject(new Riasec27ServiceError('Kích thước phản hồi vượt quá giới hạn an toàn.', 'BUFFER_OVERFLOW'));
            }
        });

        child.stderr.on('data', (chunk) => {
            stderrData += chunk.toString('utf8');
            if (stderrData.length > MAX_BUFFER_BYTES) {
                try { child.kill('SIGKILL'); } catch {}
                clearTimeout(timer);
                releaseWorker();
                reject(new Riasec27ServiceError('Kích thước thông điệp hệ thống vượt quá giới hạn.', 'BUFFER_OVERFLOW'));
            }
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            releaseWorker();
            reject(new Riasec27ServiceError(`Không thể khởi động tiến trình phân tích: ${err.message}`, 'SPAWN_ERROR'));
        });

        child.on('close', (code) => {
            clearTimeout(timer);
            releaseWorker();
            if (isTimedOut) return;

            if (!stdoutData.trim()) {
                return reject(new Riasec27ServiceError(
                    `Tiến trình Python kết thúc không có dữ liệu (code: ${code}).`,
                    'EMPTY_OUTPUT'
                ));
            }

            try {
                const parsed = JSON.parse(stdoutData);
                const bridgeErrors = {
                    IMPORT_ERROR: 'PYTHON_IMPORT_ERROR',
                    INTERNAL_ERROR: 'PYTHON_INTERNAL_ERROR',
                    EMPTY_INPUT: 'PYTHON_INPUT_ERROR',
                    INVALID_JSON: 'PYTHON_INPUT_ERROR'
                };
                if (Object.hasOwn(bridgeErrors, parsed?.status)) {
                    return reject(new Riasec27ServiceError('Tiến trình phân tích báo lỗi.', bridgeErrors[parsed.status]));
                }
                if (code !== 0) {
                    return reject(new Riasec27ServiceError('Tiến trình phân tích kết thúc bất thường.', 'PYTHON_EXIT_ERROR'));
                }
                if (parsed?.ml_ranking?.status === 'DEPENDENCY_ERROR') {
                    return reject(new Riasec27ServiceError('Không thể tải thành phần mô hình đã xác minh.', 'MODEL_DEPENDENCY_ERROR'));
                }
                resolve(parsed);
            } catch (jsonErr) {
                reject(new Riasec27ServiceError(
                    'Dữ liệu phản hồi từ mô hình không đúng định dạng JSON.',
                    'PARSE_ERROR'
                ));
            }
        });

        // Write input payload and close stdin
        child.stdin.write(jsonPayload);
        child.stdin.end();
    });
}

const riasec27Service = {
    Riasec27InputError,
    Riasec27ServiceError,
    validateAndOrderAnswers,

    getQuestionnaire() {
        return riasec27Questionnaire;
    },

    async evaluateProfile(rawAnswers) {
        const orderedAnswers = validateAndOrderAnswers(rawAnswers);
        const result = await callPythonBridge({
            action: 'evaluate',
            answers: orderedAnswers
        });
        return result;
    },

    async getCatalog() {
        const result = await callPythonBridge({
            action: 'catalog'
        });
        return result;
    },

    async getThemes() {
        const result = await callPythonBridge({
            action: 'themes'
        });
        return result;
    },

    async exploreTheme({ theme_id, option_id, is_skip }) {
        if (!theme_id && !is_skip) {
            throw new Riasec27InputError("Thiếu 'theme_id' cho hoạt động khám phá.");
        }
        const result = await callPythonBridge({
            action: 'explore_theme',
            theme_id,
            option_id,
            is_skip: Boolean(is_skip)
        });
        return result;
    },

    async exploreMajor(major_id) {
        if (!major_id || typeof major_id !== 'string') {
            throw new Riasec27InputError("Mã ngành 'major_id' không hợp lệ.");
        }
        const result = await callPythonBridge({
            action: 'explore_major',
            major_id
        });
        return result;
    }
};

module.exports = riasec27Service;
