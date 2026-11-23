import datetime
from typing import Dict, Any, List, Tuple

YDS_LEVEL_VALUES = {
    "YOK": 0,
    "E": 1,
    "D": 2,
    "C": 3,
    "B": 4,
    "A": 5,
}

def normalize_text(text: str) -> str:
    """Türkçe karakterleri ve noktalama işaretlerini normalize eder."""
    if not text:
        return ""
    mapping = {
        "İ": "i", "I": "ı", "Ş": "ş", "Ğ": "ğ", "Ü": "ü", "Ö": "ö", "Ç": "ç"
    }
    for tr, en in mapping.items():
        text = text.replace(tr, en)
    return text.lower().strip()

def calculate_age(birth_date_str: str) -> int:
    """Doğum tarihinden bugünkü yaşı hesaplar."""
    try:
        birth_date = datetime.date.fromisoformat(str(birth_date_str).split("T")[0])
        today = datetime.date.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return age
    except Exception:
        return 0

def check_department_match(user_dept: str, allowed_departments: List[str], is_any: bool) -> bool:
    """Kullanıcının bölümünün ilandaki izin verilen bölümlerle eşleşip eşleşmediğini kontrol eder."""
    if is_any:
        return True
    if not allowed_departments:
        return True

    norm_user = normalize_text(user_dept)
    if not norm_user:
        return False

    for dept in allowed_departments:
        norm_allowed = normalize_text(dept)
        if norm_user in norm_allowed or norm_allowed in norm_user:
            return True
        # Temel kelime bazlı eşleşme (örn: bilgisayar müh)
        words = [w for w in norm_user.split() if len(w) > 3]
        if words and all(w in norm_allowed for w in words):
            return True

    return False

def evaluate_match(user: Dict[str, Any], position: Dict[str, Any], announcement_deadline: str = "") -> Tuple[str, List[str]]:
    """
    Kullanıcı profili ve pozisyon şartlarını deterministik olarak eşleştirir.
    Dönüş: ("UYGUN" | "BELKI" | "UYMADI", [nedenler listesi])
    """
    reasons: List[str] = []
    has_maybe = False

    # 1. EĞİTİM SEVİYESİ
    pos_edu = position.get("education_level")
    user_edu = user.get("education_level")
    if pos_edu and user_edu and pos_edu != user_edu:
        return "UYMADI", [f"Eğitim seviyeniz ({user_edu}) ilanın talep ettiği seviyeye ({pos_edu}) uymuyor."]

    # 2. BÖLÜM ŞARTI
    user_dept = user.get("department", "")
    allowed_depts = position.get("allowed_departments", [])
    is_any_dept = position.get("is_any_department", False)

    if not check_department_match(user_dept, allowed_depts, is_any_dept):
        return "UYMADI", [f"Bölümünüz ({user_dept or 'Belirtilmemiş'}), ilanın talep ettiği bölümler arasında bulunmuyor."]

    # 3. KPSS ŞARTI
    pos_kpss_type = position.get("kpss_type", "KPSS_YOK")
    min_kpss = float(position.get("min_kpss_score") or 0.0)
    user_kpss_type = user.get("kpss_type")
    user_kpss_score = float(user.get("kpss_score") or 0.0)

    if pos_kpss_type != "KPSS_YOK":
        if not user_kpss_type or user_kpss_type != pos_kpss_type:
            return "UYMADI", [f"İlan {pos_kpss_type} puanı istiyor; profilinizde {user_kpss_type or 'KPSS puanı'} tanımlı."]
        if min_kpss > 0 and user_kpss_score < min_kpss:
            return "UYMADI", [f"KPSS puanınız ({user_kpss_score}), ilandaki taban puanın ({min_kpss}) altında."]

    # 4. YAŞ ŞARTI
    max_age = position.get("max_age")
    birth_date = user.get("birth_date")
    if max_age is not None and max_age > 0:
        if birth_date:
            user_age = calculate_age(birth_date)
            if user_age > max_age:
                return "UYMADI", [f"Yaşınız ({user_age}), ilanda belirtilen azami yaş sınırını ({max_age}) aşıyor."]
        else:
            has_maybe = True
            reasons.append(f"İlanda {max_age} yaş sınırı var; profilinizde doğum tarihi girilmemiş.")

    # 5. CİNSİYET ŞARTI
    pos_gender = position.get("gender_requirement", "HEPSI")
    user_gender = user.get("gender", "BELIRTILMEMIS")
    if pos_gender in ("ERKEK", "KADIN") and user_gender in ("ERKEK", "KADIN"):
        if pos_gender != user_gender:
            return "UYMADI", [f"İlan sadece {pos_gender} adaylar içindir."]

    # 6. YDS ŞARTI
    pos_yds = position.get("min_yds_level", "YOK")
    user_yds = user.get("yds_level", "YOK")
    if pos_yds != "YOK":
        pos_yds_val = YDS_LEVEL_VALUES.get(pos_yds, 0)
        user_yds_val = YDS_LEVEL_VALUES.get(user_yds, 0)
        if user_yds == "YOK" or not user_yds:
            has_maybe = True
            reasons.append(f"İlanda en az {pos_yds} seviyesinde YDS isteniyor; profilinizde YDS boş bırakılmış.")
        elif user_yds_val < pos_yds_val:
            return "UYMADI", [f"YDS seviyeniz ({user_yds}), istenen ({pos_yds}) seviyesinin altında."]

    # 7. MEZUNİYET DURUMU (ÖĞRENCİ)
    grad_status = user.get("graduation_status", "MEZUN")
    if grad_status == "OGRENCI":
        has_maybe = True
        reasons.append("Halen öğrencisiniz. Son başvuru tarihine kadar mezun olunması gerekebilir.")

    # 8. ÖZEL ŞARTLAR VE SERTİFİKALAR
    special_conds = position.get("special_conditions", [])
    if special_conds:
        user_certs = user.get("certificates", []) or []
        norm_certs = [normalize_text(c) for c in user_certs]
        missing_conds = []

        for cond in special_conds:
            norm_cond = normalize_text(cond)
            # Kullanıcı sertifikalarında aranır
            found = any(c in norm_cond or norm_cond in c for c in norm_certs)
            if not found:
                missing_conds.append(cond)

        if missing_conds:
            has_maybe = True
            reasons.append(f"Özel şartlar/belgeler aranıyor: {', '.join(missing_conds[:2])}. Lütfen sağladığınızdan emin olun.")

    if has_maybe:
        return "BELKI", reasons

    return "UYGUN", ["Profiliniz bu kadronun tüm şartlarını eksiksiz karşılıyor!"]
