/**
 * riasec27Questionnaire.js
 * 
 * Specification of the 27 RIASEC questions from CODEBOOK_33 (dataLabanAI.xlsx).
 * Features:
 *  - Exact interleaved question order: R1, I1, A1, R2, I2, A2... C4
 *  - Official English statements from CODEBOOK_33
 *  - High-fidelity Vietnamese translations for student comprehension
 *  - Standard Likert 1-5 response scale
 */

'use strict';

const questionnaire = {
    instrument: 'RIASEC27',
    version: '1.0.0',
    source: 'dataLabanAI.xlsx / CODEBOOK_33',
    question_count: 27,
    answer_scale: [
        { value: 1, label_vi: 'Hoàn toàn không đồng ý', label_en: 'Strongly Disagree' },
        { value: 2, label_vi: 'Không đồng ý', label_en: 'Disagree' },
        { value: 3, label_vi: 'Trung lập', label_en: 'Neutral' },
        { value: 4, label_vi: 'Đồng ý', label_en: 'Agree' },
        { value: 5, label_vi: 'Hoàn toàn đồng ý', label_en: 'Strongly Agree' }
    ],
    domain_names: {
        R: { vi: 'Thực tế (Realistic)', en: 'Realistic' },
        I: { vi: 'Nghiên cứu (Investigative)', en: 'Investigative' },
        A: { vi: 'Nghệ thuật (Artistic)', en: 'Artistic' },
        S: { vi: 'Xã hội (Social)', en: 'Social' },
        E: { vi: 'Quản lý (Enterprising)', en: 'Enterprising' },
        C: { vi: 'Nghiệp vụ (Conventional)', en: 'Conventional' }
    },
    questions: [
        {
            question_id: 'R1',
            question_order: 1,
            domain: 'R',
            codebook_statement: 'I like assembling and repairing electronic equipment',
            vietnamese_text: 'Tôi thích lắp ráp và sửa chữa các thiết bị điện tử'
        },
        {
            question_id: 'I1',
            question_order: 2,
            domain: 'I',
            codebook_statement: 'I like solving complex math problems and proving theorems',
            vietnamese_text: 'Tôi thích giải các bài toán phức tạp và chứng minh định lý'
        },
        {
            question_id: 'A1',
            question_order: 3,
            domain: 'A',
            codebook_statement: 'I like writing short stories or novels',
            vietnamese_text: 'Tôi thích viết truyện ngắn hoặc tiểu thuyết'
        },
        {
            question_id: 'R2',
            question_order: 4,
            domain: 'R',
            codebook_statement: 'I can repair household furniture',
            vietnamese_text: 'Tôi có thể sửa chữa đồ đạc, vật dụng trong gia đình'
        },
        {
            question_id: 'I2',
            question_order: 5,
            domain: 'I',
            codebook_statement: 'I want to become a sociologist',
            vietnamese_text: 'Tôi muốn trở thành một nhà nghiên cứu xã hội học'
        },
        {
            question_id: 'A2',
            question_order: 6,
            domain: 'A',
            codebook_statement: 'I like directing films and staging scenes',
            vietnamese_text: 'Tôi thích đạo diễn phim ảnh và dàn dựng các cảnh quay'
        },
        {
            question_id: 'S1',
            question_order: 7,
            domain: 'S',
            codebook_statement: 'I want to become a teacher/education expert',
            vietnamese_text: 'Tôi muốn trở thành một giáo viên hoặc chuyên gia giáo dục'
        },
        {
            question_id: 'S2',
            question_order: 8,
            domain: 'S',
            codebook_statement: 'I like providing healthcare and supporting patients',
            vietnamese_text: 'Tôi thích chăm sóc sức khỏe và hỗ trợ người bệnh'
        },
        {
            question_id: 'R3',
            question_order: 9,
            domain: 'R',
            codebook_statement: 'I want to become an electronics engineer/electronics expert',
            vietnamese_text: 'Tôi muốn trở thành kỹ sư điện tử hoặc chuyên gia điện tử'
        },
        {
            question_id: 'A3',
            question_order: 10,
            domain: 'A',
            codebook_statement: 'I like painting or graphic design',
            vietnamese_text: 'Tôi thích vẽ tranh hoặc thiết kế đồ họa'
        },
        {
            question_id: 'S3',
            question_order: 11,
            domain: 'S',
            codebook_statement: 'I like coaching/guiding sports training for others',
            vietnamese_text: 'Tôi thích huấn luyện hoặc hướng dẫn tập luyện thể thao cho người khác'
        },
        {
            question_id: 'E1',
            question_order: 12,
            domain: 'E',
            codebook_statement: 'I like managing business operations and leading teams',
            vietnamese_text: 'Tôi thích quản lý hoạt động kinh doanh và dẫn dắt đội ngũ'
        },
        {
            question_id: 'R4',
            question_order: 13,
            domain: 'R',
            codebook_statement: 'I want to become a technician',
            vietnamese_text: 'Tôi muốn trở thành một kỹ thuật viên kỹ thuật'
        },
        {
            question_id: 'S4',
            question_order: 14,
            domain: 'S',
            codebook_statement: 'I like counseling and helping people in difficulty',
            vietnamese_text: 'Tôi thích tư vấn và giúp đỡ những người gặp hoàn cảnh khó khăn'
        },
        {
            question_id: 'E2',
            question_order: 15,
            domain: 'E',
            codebook_statement: 'I want to become an entrepreneur/business expert',
            vietnamese_text: 'Tôi muốn trở thành một doanh nhân hoặc chuyên gia kinh doanh'
        },
        {
            question_id: 'R5',
            question_order: 16,
            domain: 'R',
            codebook_statement: 'I want to become a mechanic/mechanical expert',
            vietnamese_text: 'Tôi muốn trở thành thợ cơ khí hoặc chuyên gia máy móc'
        },
        {
            question_id: 'I3',
            question_order: 17,
            domain: 'I',
            codebook_statement: 'I like experimenting with natural phenomena such as physics or chemistry',
            vietnamese_text: 'Tôi thích làm thí nghiệm với hiện tượng tự nhiên như vật lý hoặc hóa học'
        },
        {
            question_id: 'A4',
            question_order: 18,
            domain: 'A',
            codebook_statement: 'I like performing on stage or in movies',
            vietnamese_text: 'Tôi thích biểu diễn trên sân khấu hoặc tham gia diễn xuất'
        },
        {
            question_id: 'E3',
            question_order: 19,
            domain: 'E',
            codebook_statement: 'I like maintaining order and enforcing the law',
            vietnamese_text: 'Tôi thích giữ gìn trật tự công cộng và thực thi pháp luật'
        },
        {
            question_id: 'I4',
            question_order: 20,
            domain: 'I',
            codebook_statement: 'I like studying human behavior and psychological counseling',
            vietnamese_text: 'Tôi thích nghiên cứu hành vi con người và tư vấn tâm lý'
        },
        {
            question_id: 'A5',
            question_order: 21,
            domain: 'A',
            codebook_statement: 'I want to become an MC/professional host',
            vietnamese_text: 'Tôi muốn trở thành người dẫn chương trình (MC) chuyên nghiệp'
        },
        {
            question_id: 'E4',
            question_order: 22,
            domain: 'E',
            codebook_statement: 'I like inspecting and supervising work processes',
            vietnamese_text: 'Tôi thích kiểm tra, giám sát và thanh tra quy trình làm việc'
        },
        {
            question_id: 'C1',
            question_order: 23,
            domain: 'C',
            codebook_statement: 'I want to become an office administrator/administrative expert',
            vietnamese_text: 'Tôi muốn trở thành nhân viên quản trị văn phòng hoặc chuyên viên hành chính'
        },
        {
            question_id: 'E5',
            question_order: 24,
            domain: 'E',
            codebook_statement: 'I want to become a marketing specialist/marketing expert',
            vietnamese_text: 'Tôi muốn trở thành chuyên viên tiếp thị hoặc chuyên gia marketing'
        },
        {
            question_id: 'C2',
            question_order: 25,
            domain: 'C',
            codebook_statement: 'I like organizing documents and providing administrative support',
            vietnamese_text: 'Tôi thích phân loại, sắp xếp tài liệu và hỗ trợ công việc văn phòng'
        },
        {
            question_id: 'C3',
            question_order: 26,
            domain: 'C',
            codebook_statement: 'I want to become an auditor/auditing expert',
            vietnamese_text: 'Tôi muốn trở thành kiểm toán viên hoặc chuyên gia tài chính kiểm toán'
        },
        {
            question_id: 'C4',
            question_order: 27,
            domain: 'C',
            codebook_statement: 'I like managing banking data and transactions',
            vietnamese_text: 'Tôi thích quản lý dữ liệu số liệu và các giao dịch ngân hàng'
        }
    ]
};

module.exports = questionnaire;
