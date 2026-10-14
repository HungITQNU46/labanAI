// src/models/hollandModel.js

const hollandQuestions = [
    // Nhóm R – Realistic (Thực tế / Kỹ thuật)
    { id: "R01", type: "R", text: "Tôi thích lắp ráp hoặc tháo các thiết bị để tìm hiểu cách chúng hoạt động." },
    { id: "R02", type: "R", text: "Tôi thích sửa chữa các máy móc, đồ điện hoặc thiết bị bị hỏng." },
    { id: "R03", type: "R", text: "Tôi thích sử dụng các dụng cụ như tua vít, kìm, cờ lê hoặc máy khoan để tạo ra hoặc sửa một vật gì đó." },
    { id: "R04", type: "R", text: "Tôi thích thực hiện các công việc đòi hỏi thao tác trực tiếp với máy móc, thiết bị hoặc vật liệu." },
    { id: "R05", type: "R", text: "Tôi thích xây dựng mô hình, mạch điện hoặc các sản phẩm kỹ thuật nhỏ." },
    { id: "R06", type: "R", text: "Tôi thích làm những công việc mà kết quả có thể nhìn thấy hoặc cầm nắm được." },
    { id: "R07", type: "R", text: "Tôi thích làm việc với máy tính hoặc thiết bị kỹ thuật theo hướng cài đặt, lắp đặt và vận hành hệ thống." },
    { id: "R08", type: "R", text: "Tôi thích thực hiện các nhiệm vụ thực hành hơn là chỉ đọc hoặc nghe lý thuyết." },
    { id: "R09", type: "R", text: "Tôi thích các hoạt động ngoài trời có sử dụng thiết bị, máy móc hoặc công cụ." },
    { id: "R10", type: "R", text: "Tôi thích tìm nguyên nhân và khắc phục một sự cố kỹ thuật cụ thể." },

    // Nhóm I – Investigative (Nghiên cứu / Phân tích)
    { id: "I01", type: "I", text: "Tôi thích tìm hiểu nguyên nhân tại sao một hiện tượng lại xảy ra." },
    { id: "I02", type: "I", text: "Tôi thích giải quyết các bài toán hoặc vấn đề logic khó." },
    { id: "I03", type: "I", text: "Tôi thích đọc tài liệu khoa học, công nghệ hoặc chuyên môn để tìm hiểu kiến thức mới." },
    { id: "I04", type: "I", text: "Tôi thích thực hiện thí nghiệm để kiểm tra một giả thuyết." },
    { id: "I05", type: "I", text: "Tôi thích phân tích dữ liệu để tìm ra quy luật hoặc xu hướng." },
    { id: "I06", type: "I", text: "Tôi thích tìm hiểu sâu cách một phần mềm, hệ thống hoặc công nghệ hoạt động." },
    { id: "I07", type: "I", text: "Tôi thích tự đặt câu hỏi và tìm kiếm bằng chứng để giải quyết vấn đề." },
    { id: "I08", type: "I", text: "Tôi thích nghiên cứu một chủ đề trong thời gian dài để hiểu nó một cách toàn diện." },
    { id: "I09", type: "I", text: "Tôi thích sử dụng số liệu, biểu đồ hoặc thống kê để đưa ra kết luận." },
    { id: "I10", type: "I", text: "Tôi thích so sánh nhiều phương án và chọn phương án dựa trên bằng chứng và lập luận." },

    // Nhóm A – Artistic (Nghệ thuật / Sáng tạo)
    { id: "A01", type: "A", text: "Tôi thích thiết kế poster, logo, hình ảnh hoặc các sản phẩm trực quan." },
    { id: "A02", type: "A", text: "Tôi thích viết truyện, bài viết, kịch bản hoặc nội dung sáng tạo." },
    { id: "A03", type: "A", text: "Tôi thích tạo và chỉnh sửa video, hình ảnh hoặc nội dung đa phương tiện." },
    { id: "A04", type: "A", text: "Tôi thích âm nhạc, chẳng hạn như chơi nhạc cụ, hát hoặc sáng tác." },
    { id: "A05", type: "A", text: "Tôi thích chụp ảnh và tìm cách tạo ra những hình ảnh có tính thẩm mỹ." },
    { id: "A06", type: "A", text: "Tôi thích nghĩ ra những ý tưởng mới thay vì luôn làm theo một khuôn mẫu có sẵn." },
    { id: "A07", type: "A", text: "Tôi thích thiết kế giao diện ứng dụng hoặc website sao cho đẹp và có phong cách riêng." },
    { id: "A08", type: "A", text: "Tôi thích biểu diễn, thuyết trình hoặc thể hiện bản thân thông qua nghệ thuật." },
    { id: "A09", type: "A", text: "Tôi thích những công việc có nhiều cách giải quyết khác nhau và không chỉ có một đáp án đúng." },
    { id: "A10", type: "A", text: "Tôi thích biến một ý tưởng trừu tượng thành hình ảnh, câu chuyện, sản phẩm hoặc tác phẩm cụ thể." },

    // Nhóm S – Social (Xã hội / Hỗ trợ con người)
    { id: "S01", type: "S", text: "Tôi thích giải thích một vấn đề khó để người khác có thể hiểu được." },
    { id: "S02", type: "S", text: "Tôi thích giúp đỡ người khác giải quyết các vấn đề của họ." },
    { id: "S03", type: "S", text: "Tôi thích hướng dẫn, dạy học hoặc kèm người khác học tập." },
    { id: "S04", type: "S", text: "Tôi thích làm việc nhóm và hỗ trợ các thành viên khi họ gặp khó khăn." },
    { id: "S05", type: "S", text: "Tôi thích lắng nghe và tìm hiểu cảm xúc hoặc suy nghĩ của người khác." },
    { id: "S06", type: "S", text: "Tôi thích tham gia các hoạt động tình nguyện hoặc hoạt động vì cộng đồng." },
    { id: "S07", type: "S", text: "Tôi thích giúp hai người hoặc hai nhóm giải quyết bất đồng và tìm tiếng nói chung." },
    { id: "S08", type: "S", text: "Tôi thích tìm hiểu nhu cầu của một người trước khi đề xuất giải pháp cho họ." },
    { id: "S09", type: "S", text: "Tôi thích tổ chức các hoạt động nhằm giúp trẻ em, học sinh hoặc người khác phát triển." },
    { id: "S10", type: "S", text: "Tôi cảm thấy hứng thú khi công việc của mình trực tiếp giúp ích cho người khác." },

    // Nhóm E – Enterprising (Quản lý / Kinh doanh / Thuyết phục)
    { id: "E01", type: "E", text: "Tôi thích đứng ra tổ chức và điều phối một nhóm thực hiện công việc." },
    { id: "E02", type: "E", text: "Tôi thích thuyết phục người khác ủng hộ một ý tưởng hoặc kế hoạch." },
    { id: "E03", type: "E", text: "Tôi thích giới thiệu hoặc bán một sản phẩm, dịch vụ hoặc ý tưởng." },
    { id: "E04", type: "E", text: "Tôi thích thương lượng để đạt được một thỏa thuận mà các bên có thể chấp nhận." },
    { id: "E05", type: "E", text: "Tôi thích tổ chức sự kiện, chương trình hoặc hoạt động cho một tập thể." },
    { id: "E06", type: "E", text: "Tôi thích trình bày một ý tưởng kinh doanh hoặc dự án trước nhiều người." },
    { id: "E07", type: "E", text: "Tôi thích đặt mục tiêu cho bản thân hoặc nhóm và tìm cách đạt được mục tiêu đó." },
    { id: "E08", type: "E", text: "Tôi thích chủ động làm quen, xây dựng quan hệ và mở rộng mạng lưới với nhiều người." },
    { id: "E09", type: "E", text: "Tôi thích đưa ra quyết định trong những tình huống có mức độ rủi ro nhất định." },
    { id: "E10", type: "E", text: "Tôi thích quản lý thời gian, nguồn lực hoặc ngân sách để đạt được một mục tiêu cụ thể." },

    // Nhóm C – Conventional (Nghiệp vụ / Tổ chức / Dữ liệu)
    { id: "C01", type: "C", text: "Tôi thích sắp xếp hồ sơ, tài liệu hoặc thông tin theo một hệ thống rõ ràng." },
    { id: "C02", type: "C", text: "Tôi thích nhập dữ liệu và kiểm tra để đảm bảo thông tin chính xác." },
    { id: "C03", type: "C", text: "Tôi thích làm việc với bảng tính, danh sách số liệu hoặc dữ liệu có cấu trúc." },
    { id: "C04", type: "C", text: "Tôi thích làm việc theo quy trình và các bước được quy định rõ ràng." },
    { id: "C05", type: "C", text: "Tôi thích lập lịch, kế hoạch hoặc danh sách công việc chi tiết." },
    { id: "C06", type: "C", text: "Tôi thích phân loại, sắp xếp và lưu trữ thông tin để có thể tìm lại dễ dàng." },
    { id: "C07", type: "C", text: "Tôi thích kiểm tra các chi tiết nhỏ để phát hiện lỗi hoặc thiếu sót." },
    { id: "C08", type: "C", text: "Tôi thích theo dõi thu chi, ngân sách hoặc các con số tài chính." },
    { id: "C09", type: "C", text: "Tôi thích những công việc có quy tắc, thời hạn và yêu cầu rõ ràng." },
    { id: "C10", type: "C", text: "Tôi thích duy trì hồ sơ, tài liệu hoặc dữ liệu sao cho đầy đủ và ngăn nắp." }
];

module.exports = { hollandQuestions };