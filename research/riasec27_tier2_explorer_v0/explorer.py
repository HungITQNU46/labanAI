"""explorer.py - Catalog Discovery and Qualitative Tier 2 Explorer.
Module: research/riasec27_tier2_explorer_v0/explorer.py
Phase: B-05

Provides two decoupled capabilities:
1. Catalog Discovery: Browse all 33 majors from majors_registry.json with transparent
   metadata (status, eligibility, evidence quality, locked vs proposed mappings).
2. Tier 2 Qualitative Exploration: User-initiated exploration of 5 dedicated themes
   (7 Secondary Teachers, IT vs Software, Oriental vs Vietnamese Studies, Tourism,
   and Public Administration). Does NOT modify ML Top-3 rankings. Does NOT compute
   pseudo-probabilities or percent fit scores.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

RESEARCH_STATUS_HEADER = "RESEARCH_ONLY — TOP3_NOT_VALIDATED"

# Five Distinct Exploration Themes
THEMES_CONFIG = {
    "THEME_A_SECONDARY_PEDAGOGY": {
        "theme_id": "THEME_A_SECONDARY_PEDAGOGY",
        "title": "Nhóm Sư phạm Trung học phổ thông (7 ngành môn học)",
        "description": "Tìm hiểu và phân biệt 7 ngành đào tạo giáo viên bộ môn cấp THPT có cùng mã nghề O*NET 25-2031.00.",
        "member_majors": [
            "su_pham_toan_hoc",
            "su_pham_ngu_van",
            "su_pham_tieng_anh",
            "su_pham_tin_hoc",
            "su_pham_hoa_hoc",
            "su_pham_dia_ly",
            "giao_duc_chinh_tri"
        ],
        "question": {
            "question_id": "T2_THEME_A_Q1",
            "text": "Nếu có cơ hội chia sẻ và hướng dẫn bài học cho các bạn cùng trang lứa, bạn cảm thấy hào hứng nhất với chủ đề nào dưới đây?",
            "target_audience": "Học sinh phổ thông (THCS/THPT) quan tâm đến hướng đi giáo dục",
            "options": [
                {
                    "option_id": "OPT_A_MATH",
                    "text": "Tư duy logic, giải toán đại số, hình học và các bài toán suy luận trừu tượng.",
                    "focus_major": "su_pham_toan_hoc",
                    "focus_title": "Sư phạm Toán học",
                    "learning_focus": "Đào tạo kiến thức toán cao cấp, giải tích, hình học vi phân và phương pháp dạy học môn Toán cấp THPT.",
                    "comparative_note": "Khác biệt với Sư phạm Tin ở trọng tâm toán lý thuyết thuần túy; khác biệt với Sư phạm Hóa ở phương pháp suy luận hình thức không phụ thuộc phòng thí nghiệm."
                },
                {
                    "option_id": "OPT_A_LIT",
                    "text": "Đọc tác phẩm văn học, phân tích ngôn từ nghệ thuật và viết bài chia sẻ cảm xúc.",
                    "focus_major": "su_pham_ngu_van",
                    "focus_title": "Sư phạm Ngữ văn",
                    "learning_focus": "Đào tạo lý luận văn học, lịch sử văn học Việt Nam và thế giới, ngôn ngữ học tiếng Việt và phương pháp dạy Văn.",
                    "comparative_note": "Tập trung vào cảm thụ ngôn từ và phê bình văn học; khác với Sư phạm Tiếng Anh vốn tập trung vào cấu trúc ngữ pháp và kỹ năng giao tiếp song ngữ."
                },
                {
                    "option_id": "OPT_A_ENG",
                    "text": "Giao tiếp tiếng Anh, tìm hiểu văn hóa các nước nói tiếng Anh và phát âm ngoại ngữ.",
                    "focus_major": "su_pham_tieng_anh",
                    "focus_title": "Sư phạm Tiếng Anh",
                    "learning_focus": "Đào tạo ngữ âm học, ngữ pháp thực hành, văn hóa Anh-Mỹ và kỹ năng sư phạm giảng dạy tiếng Anh như một ngoại ngữ.",
                    "comparative_note": "Khác biệt với Ngôn ngữ Anh ở trọng tâm nghiệp vụ sư phạm trường học; khác với Sư phạm Văn ở đối tượng ngôn ngữ quốc tế."
                },
                {
                    "option_id": "OPT_A_CS",
                    "text": "Thuật toán máy tính, lập trình phần mềm, cơ sở dữ liệu và kỹ năng số.",
                    "focus_major": "su_pham_tin_hoc",
                    "focus_title": "Sư phạm Tin học",
                    "learning_focus": "Đào tạo cấu trúc dữ liệu, thuật toán, kiến trúc máy tính, an toàn thông tin trường học và phương pháp dạy Tin học phổ thông.",
                    "comparative_note": "Gắn liền với chuyển đổi số giáo dục; khác biệt với Kỹ thuật phần mềm ở mục tiêu sư phạm giáo dục thay vì sản xuất phần mềm công nghiệp."
                },
                {
                    "option_id": "OPT_A_CHEM",
                    "text": "Các phản ứng hóa học trực quan, thí nghiệm ống nghiệm và cấu trúc phân tử chất.",
                    "focus_major": "su_pham_hoa_hoc",
                    "focus_title": "Sư phạm Hóa học",
                    "learning_focus": "Đào tạo hóa đại cương, hóa vô cơ, hóa hữu cơ, thực hành phòng thí nghiệm an toàn và phương pháp dạy Hóa học.",
                    "comparative_note": "Đòi hỏi kỹ năng thao tác thực nghiệm phòng thí nghiệm; khác biệt với Sư phạm Toán/Lý ở tính chất quan sát biến đổi vật chất cụ thể."
                },
                {
                    "option_id": "OPT_A_GEO",
                    "text": "Khám phá bản đồ, địa hình tự nhiên, khí hậu và kinh tế - xã hội các vùng miền.",
                    "focus_major": "su_pham_dia_ly",
                    "focus_title": "Sư phạm Địa lý",
                    "learning_focus": "Đào tạo địa lý tự nhiên, địa lý kinh tế - xã hội Việt Nam và thế giới, bản đồ số, GIS và phương pháp dạy Địa lý.",
                    "comparative_note": "Giao thoa giữa khoa học trái đất và khoa học xã hội; khác biệt với Giáo dục chính trị ở đối tượng không gian tự nhiên và nhân văn."
                },
                {
                    "option_id": "OPT_A_POLITICS",
                    "text": "Quy tắc đạo đức, kiến thức pháp luật đời sống và tổ chức đời sống công dân.",
                    "focus_major": "giao_duc_chinh_tri",
                    "focus_title": "Giáo dục Chính trị",
                    "learning_focus": "Đào tạo triết học, kinh tế chính trị, chủ nghĩa xã hội khoa học, hệ thống pháp luật Việt Nam và phương pháp dạy môn Giáo dục kinh tế & pháp luật.",
                    "comparative_note": "Tập trung vào chuẩn mực pháp luật và thể chế xã hội; khác với Sư phạm Ngữ văn ở tính chuẩn tắc pháp lý thay vì biểu cảm nghệ thuật."
                },
                {
                    "option_id": "OPT_A_UNCERTAIN",
                    "text": "Chưa rõ / Chưa quyết định được môn học cụ thể.",
                    "focus_major": None,
                    "focus_title": "Chưa xác định môn chuyên ngành",
                    "learning_focus": "Cần thêm thời gian trải nghiệm các môn học ở cấp THPT và tham gia các hoạt động hướng dẫn dạy thử.",
                    "comparative_note": "Việc chưa chọn được môn học ở lứa tuổi phổ thông là hoàn toàn tự nhiên. Hãy tìm hiểu thêm sách giáo khoa và các câu lạc bộ học tập."
                }
            ],
            "bias_warning": "Sự hứng thú với môn học phản ánh thiên hướng tìm hiểu ban đầu, KHÔNG đại diện cho điểm thi THPT, học bạ hay điều kiện trúng tuyển đại học.",
            "skip_guidance": "Nếu bỏ qua, bạn có thể quay lại tra cứu thông tin mô tả chương trình của từng ngành sư phạm trên danh mục chính."
        }
    },
    "THEME_B_IT_AND_SOFTWARE": {
        "theme_id": "THEME_B_IT_AND_SOFTWARE",
        "title": "Nhóm Công nghệ thông tin & Kỹ thuật phần mềm",
        "description": "Đặt hai ngành công nghệ trọng điểm cạnh nhau để phân định rõ định hướng Phát triển phần mềm vs Quản trị hệ thống/mạng/an ninh.",
        "member_majors": [
            "ky_thuat_phan_mem",
            "cong_nghe_thong_tin"
        ],
        "question": {
            "question_id": "T2_THEME_B_Q1",
            "text": "Khi hình dung về môi trường làm việc trong ngành công nghệ, hoạt động nào kích thích trí tò mò của bạn nhất?",
            "target_audience": "Học sinh quan tâm đến thế giới máy tính và công nghệ số",
            "options": [
                {
                    "option_id": "OPT_B_SOFTWARE_DEV",
                    "text": "Trực tiếp thiết kế kiến trúc, viết mã nguồn (coding), kiểm thử và phát triển ứng dụng di động hoặc trò chơi.",
                    "focus_major": "ky_thuat_phan_mem",
                    "focus_title": "Kỹ thuật phần mềm (Software Engineering - 7480103)",
                    "learning_focus": "Tập trung chuyên sâu vào chu trình sản xuất phần mềm: đặc tả yêu cầu, kiến trúc hệ thống phần mềm, design patterns, lập trình hướng đối tượng, kiểm thử (QA/QC) và quản lý dự án Agile/Scrum.",
                    "comparative_note": "Khác với CNTT tổng quát ở việc đào tạo chuyên sâu về kỹ năng viết code và sản xuất sản phẩm phần mềm quy mô lớn."
                },
                {
                    "option_id": "OPT_B_SYSTEM_INFRA",
                    "text": "Thiết lập mạng máy tính, cấu hình máy chủ đám mây (Cloud), bảo mật thông tin và đảm bảo hệ thống vận hành liên tục.",
                    "focus_major": "cong_nghe_thong_tin",
                    "focus_title": "Công nghệ thông tin (Information Technology - 7480201)",
                    "learning_focus": "Đào tạo diện rộng: mạng máy tính, quản trị hệ điều hành máy chủ, dịch vụ đám mây, an toàn an ninh mạng, cơ sở dữ liệu doanh nghiệp và tích hợp hệ thống phần cứng - phần mềm.",
                    "comparative_note": "Khác với KTPM ở phạm vi rộng bao quát hạ tầng và vận hành hệ thống IT doanh nghiệp, không chỉ giới hạn ở việc viết code phần mềm."
                },
                {
                    "option_id": "OPT_B_UNCERTAIN",
                    "text": "Chưa rõ / Thích cả hai hướng / Cần tìm hiểu thêm.",
                    "focus_major": None,
                    "focus_title": "Chưa phân định giữa Phần mềm và Hạ tầng",
                    "learning_focus": "Năm thứ nhất tại các trường đại học, cả hai ngành đều học chung khối kiến thức cơ sở (Toán rời rạc, Lập trình C/C++, Cấu trúc dữ liệu).",
                    "comparative_note": "Sinh viên thường có thời gian 1-2 học kỳ đầu để trải nghiệm thực tế trước khi đăng ký chuyên ngành chuyên sâu."
                }
            ],
            "bias_warning": "Không có ngành nào 'cao hơn' ngành nào; lập trình viên cần hạ tầng ổn định để phần mềm chạy, và chuyên viên mạng cần hiểu phần mềm để cấu hình tự động hóa.",
            "skip_guidance": "Bỏ qua câu hỏi này sẽ đưa bạn quay lại danh mục 33 ngành."
        }
    },
    "THEME_C_REGIONAL_AND_CULTURE": {
        "theme_id": "THEME_C_REGIONAL_AND_CULTURE",
        "title": "Nhóm Khu vực học & Văn hóa học",
        "description": "Tìm hiểu sự khác biệt giữa hướng nghiên cứu quốc tế (châu Á) và hướng nghiên cứu chuyên sâu về đất nước, con người Việt Nam.",
        "member_majors": [
            "dong_phuong_hoc",
            "viet_nam_hoc"
        ],
        "question": {
            "question_id": "T2_THEME_C_Q1",
            "text": "Không gian văn hóa và phạm vi xã hội nào bạn mong muốn dành thời gian tìm hiểu và nghiên cứu sâu sắc nhất?",
            "target_audience": "Học sinh yêu thích lịch sử, văn hóa và khoa học xã hội nhân văn",
            "options": [
                {
                    "option_id": "OPT_C_ORIENTAL",
                    "text": "Lịch sử, ngôn ngữ, lối sống, kinh tế và quan hệ quốc tế của các nước châu Á (Nhật Bản, Hàn Quốc, Trung Quốc, Ấn Độ).",
                    "focus_major": "dong_phuong_hoc",
                    "focus_title": "Đông phương học (Oriental Studies - 7310608)",
                    "learning_focus": "Đào tạo khu vực học liên ngành: lịch sử, văn hóa, chính trị, kinh tế và chuyên ngữ khu vực (tiếng Nhật, tiếng Hàn, tiếng Trung hoặc tiếng Hindi).",
                    "comparative_note": "Là ngành nghiên cứu khu vực quốc tế (Area Studies); không đơn thuần là ngành học ngoại ngữ biên dịch tác nghiệp."
                },
                {
                    "option_id": "OPT_C_VIETNAMESE",
                    "text": "Bản sắc văn hóa các dân tộc Việt Nam, di sản lịch sử dân tộc và truyền bá tiếng Việt, văn hóa Việt cho bạn bè quốc tế.",
                    "focus_major": "viet_nam_hoc",
                    "focus_title": "Việt Nam học (Vietnamese Studies - 7310630)",
                    "learning_focus": "Đào tạo văn hóa học Việt Nam, địa lý nhân văn, lịch sử tư tưởng dân tộc, phong tục tập quán và phương pháp giảng dạy tiếng Việt như một ngôn ngữ thứ hai.",
                    "comparative_note": "Tập trung chuyên sâu vào hệ giá trị văn hóa và ngôn ngữ Việt Nam; không phải là khóa học đào tạo nghề hướng dẫn viên du lịch thương mại."
                },
                {
                    "option_id": "OPT_C_UNCERTAIN",
                    "text": "Chưa rõ / Thích tìm hiểu văn hóa nói chung / Cần thêm thông tin.",
                    "focus_major": None,
                    "focus_title": "Chưa xác định phạm vi văn hóa",
                    "learning_focus": "Cả hai ngành đều thuộc khối Khoa học Xã hội & Nhân văn, chia sẻ phương pháp luận nghiên cứu tài liệu và điền dã dân tộc học.",
                    "comparative_note": "Bạn có thể tham khảo thêm thông tin từ các khoa chuyên môn của Trường ĐH KHXH&NV (ĐHQGHN hoặc ĐHQG-HCM)."
                }
            ],
            "bias_warning": "Hai ngành này là các chương trình khoa học hàn lâm, đòi hỏi đọc nhiều tài liệu nghiên cứu và tư duy phê phán xã hội.",
            "skip_guidance": "Bỏ qua câu hỏi để tiếp tục xem danh mục tra cứu."
        }
    },
    "THEME_D_TOURISM_AND_HOSPITALITY": {
        "theme_id": "THEME_D_TOURISM_AND_HOSPITALITY",
        "title": "Nhóm Quản lý Dịch vụ Du lịch và Lữ hành",
        "description": "Luồng khám phá độc lập về các mảng hoạt động trong hệ sinh thái lữ hành và tổ chức sự kiện.",
        "member_majors": [
            "quan_ly_du_lich_lu_hanh"
        ],
        "question": {
            "question_id": "T2_THEME_D_Q1",
            "text": "Trong lĩnh vực dịch vụ du lịch và lữ hành, phương diện hoạt động nào gợi mở sự hứng thú lớn nhất cho bạn?",
            "target_audience": "Học sinh yêu thích dịch chuyển, tổ chức hoạt động và giao tiếp cộng đồng",
            "options": [
                {
                    "option_id": "OPT_D_TOUR_MGMT",
                    "text": "Thiết kế lộ trình tour, điều hành kinh doanh đại lý lữ hành, tổ chức sự kiện (MICE) và quản lý dịch vụ nghỉ dưỡng.",
                    "focus_major": "quan_ly_du_lich_lu_hanh",
                    "focus_title": "Quản trị dịch vụ du lịch và lữ hành (7810103)",
                    "learning_focus": "Đào tạo quản trị kinh doanh dịch vụ du lịch, marketing điểm đến, luật du lịch, thiết kế chương trình du lịch và quản trị rủi ro lữ hành.",
                    "comparative_note": "Khác biệt với Quản trị khách sạn (tập trung buồng, bàn, F&B, lưu trú) ở phạm vi không gian di chuyển rộng và quản lý chuỗi cung ứng vé, tour, điểm đến."
                },
                {
                    "option_id": "OPT_D_TOUR_GUIDING",
                    "text": "Trực tiếp thuyết minh di tích, hướng dẫn đoàn khách tại điểm tham quan và xử lý tình huống thực tế trên đường đi.",
                    "focus_major": "quan_ly_du_lich_lu_hanh",
                    "focus_title": "Nghiệp vụ Hướng dẫn viên du lịch",
                    "learning_focus": "Kỹ năng giao tiếp trước đám đông, kiến thức lịch sử văn hóa điểm đến, sơ cấp cứu và nghiệp vụ dẫn đoàn thực địa.",
                    "comparative_note": "Đây là kỹ năng nghề nghiệp cụ thể nằm trong chương trình cử nhân, nhưng cử nhân quản trị lữ hành hướng đến vai trò quản lý điều hành nhiều hơn."
                },
                {
                    "option_id": "OPT_D_UNCERTAIN",
                    "text": "Chưa rõ / Cần tìm hiểu thêm về ngành du lịch.",
                    "focus_major": None,
                    "focus_title": "Chưa xác định mảng du lịch",
                    "learning_focus": "Hệ sinh thái du lịch gồm: Lữ hành (tour/đại lý), Lưu trú (khách sạn/resort), Ẩm thực (F&B) và Vận chuyển/Sự kiện.",
                    "comparative_note": "Nên tìm hiểu thêm về sự khác nhau giữa học nghề hướng dẫn viên ngắn hạn và học cử nhân đại học quản lý lữ hành 4 năm."
                }
            ],
            "bias_warning": "Nghề dịch vụ du lịch đòi hỏi sức khỏe dẻo dai, khả năng làm việc ngoài giờ hành chính và kỹ năng chịu áp lực cao.",
            "skip_guidance": "Bỏ qua câu hỏi để quay lại danh mục."
        }
    },
    "THEME_E_PUBLIC_ADMINISTRATION": {
        "theme_id": "THEME_E_PUBLIC_ADMINISTRATION",
        "title": "Nhóm Quản lý Nhà nước",
        "description": "Luồng khám phá độc lập về hoạt động hành chính công vụ, quản lý cơ quan nhà nước và phân tích chính sách.",
        "member_majors": [
            "quan_ly_nha_nuoc"
        ],
        "question": {
            "question_id": "T2_THEME_E_Q1",
            "text": "Khi suy nghĩ về bộ máy công quyền và hoạt động của chính quyền xã hội, phương diện nào bạn muốn nghiên cứu sâu?",
            "target_audience": "Học sinh quan tâm đến tổ chức xã hội, quy định pháp luật và đời sống công vụ",
            "options": [
                {
                    "option_id": "OPT_E_CIVIL_MGMT",
                    "text": "Quy trình thủ tục hành chính, tổ chức văn phòng công sở, quản trị nhân sự công vụ và phục vụ người dân tại các cơ quan nhà nước.",
                    "focus_major": "quan_ly_nha_nuoc",
                    "focus_title": "Quản lý nhà nước (7310205) - Hướng Quản trị công vụ",
                    "learning_focus": "Đào tạo thể chế nhà nước, kỹ thuật xây dựng và ban hành văn bản quy phạm pháp luật, cải cách thủ tục hành chính và quản trị công quyền.",
                    "comparative_note": "Khác biệt với Quản trị kinh doanh ở mục tiêu phục vụ lợi ích công cộng và tuân thủ pháp luật nhà nước, không vì mục tiêu tối đa hóa lợi nhuận."
                },
                {
                    "option_id": "OPT_E_POLICY_ANALYST",
                    "text": "Nghiên cứu, đánh giá tác động của các chính sách kinh tế - xã hội đối với người dân và đề xuất giải pháp cải thiện đời sống cộng đồng.",
                    "focus_major": "quan_ly_nha_nuoc",
                    "focus_title": "Quản lý nhà nước (7310205) - Hướng Phân tích chính sách công",
                    "learning_focus": "Đào tạo chu trình chính sách công: hoạch định, thực thi, đánh giá tác động chính sách, phương pháp định lượng xã hội và quản lý ngân sách nhà nước.",
                    "comparative_note": "Khác biệt với Luật học ở trọng tâm quy trình thực thi và hiệu quả chính sách kinh tế - xã hội, thay vì tranh tụng hay giải thích quy phạm pháp lý thuần túy."
                },
                {
                    "option_id": "OPT_E_UNCERTAIN",
                    "text": "Chưa rõ / Cần tìm hiểu thêm về khu vực công.",
                    "focus_major": None,
                    "focus_title": "Chưa xác định hướng hành chính công",
                    "learning_focus": "Khu vực công quản lý các lĩnh vực y tế, giáo dục, trật tự xã hội, kinh tế thông qua các bộ, sở, ban ngành các cấp.",
                    "comparative_note": "Nên tìm hiểu thêm về Luật Cán bộ, công chức và mô hình tổ chức chính quyền địa phương tại Việt Nam."
                }
            ],
            "bias_warning": "Ngành Quản lý nhà nước yêu cầu tính cẩn trọng, tuân thủ kỷ luật nhà nước và tinh thần tận tụy phục vụ nhân dân.",
            "skip_guidance": "Bỏ qua câu hỏi để quay lại danh mục."
        }
    }
}


class CatalogExplorer:
    """Manages 33-major catalog discovery and user-initiated Tier 2 exploration."""

    def __init__(self, catalog_dir: Optional[str] = None):
        if catalog_dir is None:
            catalog_dir = str(Path(__file__).resolve().parent.parent / "riasec27_major_catalog_v1")
        self.catalog_dir = Path(catalog_dir)

        self._majors_path = self.catalog_dir / "majors_registry.json"
        self._evidence_path = self.catalog_dir / "evidence_registry.json"
        self._plan_path = self.catalog_dir / "differentiation_plan.json"

        self._load_data()

    def _load_data(self):
        with open(self._majors_path, "r", encoding="utf-8") as f:
            self._majors_registry = json.load(f)
        with open(self._evidence_path, "r", encoding="utf-8") as f:
            self._evidence_registry = json.load(f)
        with open(self._plan_path, "r", encoding="utf-8") as f:
            self._plan = json.load(f)

        self._majors_map: Dict[str, Dict[str, Any]] = {
            m["major_id"]: m for m in self._majors_registry.get("majors", [])
        }
        self._evidence_map: Dict[str, Dict[str, Any]] = {
            ev["major_id"]: ev for ev in self._evidence_registry.get("evidence_records", {}).values()
        }

        # Build major to theme mapping
        self._major_to_theme: Dict[str, str] = {}
        for theme_id, cfg in THEMES_CONFIG.items():
            for mid in cfg["member_majors"]:
                self._major_to_theme[mid] = theme_id

    def list_catalog(self) -> List[Dict[str, Any]]:
        """Returns all 33 majors with clear research transparency metadata."""
        items = []
        for mid, m in self._majors_map.items():
            ev = self._evidence_map.get(mid, {})
            theme_id = self._major_to_theme.get(mid)
            
            # Format proposed mappings safely
            proposed = [
                {
                    "soc_code": p.get("soc_code"),
                    "title": p.get("occupation_title_en"),
                    "status": "PENDING_REVIEW",
                    "source": p.get("source"),
                    "rationale": p.get("rationale")
                }
                for p in m.get("proposed_mappings", [])
            ]

            items.append({
                "major_id": mid,
                "major_name_vi": m.get("major_name_vi"),
                "moet_code": m.get("moet_code"),
                "status": m.get("status"),
                "automatic_ranking_eligibility": m.get("automatic_ranking_eligibility", False),
                "catalog_visibility": m.get("catalog_visibility", True),
                "reference_occupation": {
                    "soc_code": m.get("primary_soc_code"),
                    "title": m.get("occupation_title_en"),
                    "status": "LOCKED_BASELINE" if m.get("status") == "READY_FOR_PROTOTYPE" else "CONDITIONAL_REFERENCE"
                },
                "proposed_mappings": proposed,
                "evidence_status": ev.get("verification_status", "NOT_CHECKED"),
                "evidence_completeness": "EVIDENCE_INCOMPLETE" if ev.get("verification_status") != "VERIFIED_OFFICIAL_DIRECT" else "VERIFIED_COMPLETE",
                "institution": ev.get("institution"),
                "institution_url": ev.get("source_url"),
                "exploration_theme_id": theme_id,
                "scientific_disclaimer": "READY_FOR_PROTOTYPE là trạng thái phục vụ kỹ thuật mô hình, KHÔNG phải chứng nhận khoa học về sự phù hợp cá nhân."
            })
        return items

    def get_major(self, major_id: str) -> Optional[Dict[str, Any]]:
        """Returns full catalog details for a single major."""
        all_items = {it["major_id"]: it for it in self.list_catalog()}
        return all_items.get(major_id)

    def list_themes(self) -> List[Dict[str, Any]]:
        """Lists the 5 independent qualitative exploration themes."""
        return [
            {
                "theme_id": cfg["theme_id"],
                "title": cfg["title"],
                "description": cfg["description"],
                "member_majors_count": len(cfg["member_majors"]),
                "member_majors": cfg["member_majors"],
                "question": cfg["question"]
            }
            for cfg in THEMES_CONFIG.values()
        ]

    def get_theme_for_major(self, major_id: str) -> Optional[str]:
        """Maps any of the 12 non-ready majors to its corresponding exploration theme."""
        return self._major_to_theme.get(major_id)

    def get_theme_question(self, theme_id: str) -> Optional[Dict[str, Any]]:
        """Returns the qualitative exploration question for a theme."""
        cfg = THEMES_CONFIG.get(theme_id)
        if not cfg:
            return None
        q = cfg["question"]
        return {
            "research_status": RESEARCH_STATUS_HEADER,
            "theme_id": theme_id,
            "theme_title": cfg["title"],
            "question_id": q["question_id"],
            "text": q["text"],
            "target_audience": q["target_audience"],
            "options": [
                {
                    "option_id": opt["option_id"],
                    "text": opt["text"],
                    "focus_title": opt["focus_title"]
                }
                for opt in q["options"]
            ],
            "bias_warning": q["bias_warning"],
            "skip_guidance": q["skip_guidance"],
            "can_skip": True
        }

    def explore_theme(
        self,
        theme_id: str,
        option_id: Optional[str] = None,
        is_skip: bool = False
    ) -> Dict[str, Any]:
        """
        Executes qualitative exploration for a theme.
        Returns neutral comparative information. Never modifies ML Top-3 rankings.
        Never outputs percentage or numeric suitability scores.
        """
        cfg = THEMES_CONFIG.get(theme_id)
        if not cfg:
            return {
                "research_status": RESEARCH_STATUS_HEADER,
                "status": "INVALID_SELECTION",
                "message": f"Theme '{theme_id}' không tồn tại trong danh mục 5 chủ đề nghiên cứu."
            }

        q = cfg["question"]
        options_map = {opt["option_id"]: opt for opt in q["options"]}

        # Case 1: User chooses to skip
        if is_skip:
            return {
                "research_status": RESEARCH_STATUS_HEADER,
                "status": "USER_SKIPPED",
                "theme_id": theme_id,
                "theme_title": cfg["title"],
                "message": "Người dùng chủ động bỏ qua câu hỏi phân biệt. Không có ngành nào bị tự động gán ép.",
                "overview_comparison": [
                    {
                        "major_id": opt.get("focus_major"),
                        "title": opt.get("focus_title"),
                        "learning_focus": opt.get("learning_focus")
                    }
                    for opt in q["options"] if opt.get("focus_major") is not None
                ],
                "evidence_limitation": "Các ngành trong nhóm hiện có bằng chứng CTĐT ở mức trang chủ (EVIDENCE_INCOMPLETE), chưa qua kiểm chứng độc lập cấp quốc gia.",
                "navigation_options": ["QUAY_LAI_DANH_MUC", "CHON_CHU_DE_KHAC"]
            }

        # Case 2: User selected an option
        if option_id not in options_map:
            return {
                "research_status": RESEARCH_STATUS_HEADER,
                "status": "INVALID_SELECTION",
                "message": f"Tùy chọn '{option_id}' không hợp lệ cho chủ đề '{theme_id}'."
            }

        chosen = options_map[option_id]

        # Case 2A: User selected "Chưa rõ / Cần tìm hiểu thêm"
        if chosen.get("focus_major") is None:
            return {
                "research_status": RESEARCH_STATUS_HEADER,
                "status": "QUALITATIVE_EXPLORATION",
                "theme_id": theme_id,
                "theme_title": cfg["title"],
                "chosen_option_id": option_id,
                "chosen_text": chosen["text"],
                "focus_summary": chosen["focus_title"],
                "learning_orientation": chosen["learning_focus"],
                "comparative_analysis": chosen["comparative_note"],
                "all_options_summary": [
                    {
                        "major_id": opt.get("focus_major"),
                        "title": opt.get("focus_title"),
                        "learning_focus": opt.get("learning_focus")
                    }
                    for opt in q["options"] if opt.get("focus_major") is not None
                ],
                "scientific_caveats": {
                    "score_impact": "Hoàn toàn KHÔNG làm thay đổi điểm số hay thứ hạng Top-3 ML.",
                    "evidence_level": "EVIDENCE_INCOMPLETE — Bằng chứng CTĐT chưa được thẩm định đề cương chi tiết.",
                    "competency_warning": "Sở thích khám phá học tập ban đầu không đồng nhất với năng lực nghề nghiệp hoặc điều kiện trúng tuyển."
                },
                "navigation_options": ["XEM_CHI_TIET_NGANH", "QUAY_LAI_DANH_MUC"]
            }

        # Case 2B: User selected a specific direction
        target_mid = chosen["focus_major"]
        major_info = self.get_major(target_mid)

        return {
            "research_status": RESEARCH_STATUS_HEADER,
            "status": "QUALITATIVE_EXPLORATION",
            "theme_id": theme_id,
            "theme_title": cfg["title"],
            "chosen_option_id": option_id,
            "chosen_text": chosen["text"],
            "explored_major": {
                "major_id": target_mid,
                "major_name_vi": major_info.get("major_name_vi") if major_info else chosen["focus_title"],
                "moet_code": major_info.get("moet_code") if major_info else None,
                "ranking_status": major_info.get("status") if major_info else "CONDITIONAL",
                "ranking_eligibility": False
            },
            "learning_orientation": chosen["learning_focus"],
            "comparative_analysis": chosen["comparative_note"],
            "neighboring_options": [
                {
                    "major_id": opt.get("focus_major"),
                    "title": opt.get("focus_title"),
                    "brief_note": opt.get("comparative_note")
                }
                for opt in q["options"] if opt.get("focus_major") not in (None, target_mid)
            ],
            "scientific_caveats": {
                "score_impact": "Hoàn toàn KHÔNG làm thay đổi điểm số hay thứ hạng Top-3 ML.",
                "evidence_level": "EVIDENCE_INCOMPLETE — Bằng chứng CTĐT chưa được thẩm định đề cương chi tiết.",
                "competency_warning": "Sở thích khám phá học tập ban đầu không đồng nhất với năng lực nghề nghiệp hoặc điều kiện trúng tuyển."
            },
            "navigation_options": ["XEM_CHI_TIET_NGANH", "CHON_HUONG_KHAC", "QUAY_LAI_DANH_MUC"]
        }
