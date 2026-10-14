const fs = require('fs/promises');
const path = require('path');
const { hollandQuestions: defaultQuestions } = require('./hollandModel');

const questionsFile = path.join(__dirname, '..', '..', 'data', 'holland-questions.json');

async function loadQuestions() {
    try {
        const savedQuestions = await fs.readFile(questionsFile, 'utf8');
        const questions = JSON.parse(savedQuestions);
        if (!Array.isArray(questions)) {
            throw new Error('Dữ liệu câu hỏi đã lưu không hợp lệ.');
        }
        return questions;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return defaultQuestions.map((question) => ({ ...question }));
        }
        throw error;
    }
}

async function getQuestions() {
    return loadQuestions();
}

module.exports = { getQuestions };
