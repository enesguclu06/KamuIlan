import { UserProfile, Position, MatchEvaluation, MatchStatus, AnnouncementMatchSummary } from '@/types';

const YDS_WEIGHTS: Record<string, number> = {
  YOK: 0,
  E: 1,
  D: 2,
  C: 3,
  B: 4,
  A: 5,
};

export function normalizeTurkish(text: string): string {
  if (!text) return '';
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ş/g, 'ş')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü')
    .replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .toLowerCase()
    .trim();
}

export function calculateAge(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  try {
    const birth = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

export function checkDepartmentMatch(
  userDepartment?: string,
  allowedDepartments: string[] = [],
  isAnyDepartment: boolean = false
): boolean {
  if (isAnyDepartment) return true;
  if (!allowedDepartments || allowedDepartments.length === 0) return true;
  if (!userDepartment) return false;

  const normUser = normalizeTurkish(userDepartment);

  for (const dept of allowedDepartments) {
    const normAllowed = normalizeTurkish(dept);
    if (normAllowed.includes(normUser) || normUser.includes(normAllowed)) {
      return true;
    }
    // Kelime bazlı eşleşme (örn: "bilgisayar mühendisliği" ve "bilgisayar müh.")
    const words = normUser.split(' ').filter(w => w.length > 3);
    if (words.length > 0 && words.every(w => normAllowed.includes(w))) {
      return true;
    }
  }

  return false;
}

export function evaluateMatch(
  user: UserProfile | null,
  position: Position,
  announcementDeadline?: string
): MatchEvaluation {
  // Eğer kullanıcı profili hiç girilmemişse nötr/bilgi durumu döndür
  if (!user || (!user.education_level && !user.department && !user.kpss_score)) {
    return {
      status: 'BELKI',
      reasons: ['Kriterlerinizi karşılaştırmak için profilinizi doldurunuz.'],
      isMatch: false,
      criteriaMatrix: {
        education: { match: false, user: 'Girilmedi', required: position.education_level },
        department: { match: false, user: 'Girilmedi', required: position.is_any_department ? 'Tüm Bölümler' : position.allowed_departments.join(', ') || 'Belirtilmedi' },
        kpss: { match: false, user: 'Girilmedi', required: `${position.kpss_type} (${position.min_kpss_score})` },
        yds: { match: true, user: 'Girilmedi', required: position.min_yds_level },
        age: { match: true, user: 'Girilmedi', required: position.max_age ? `Azami ${position.max_age}` : 'Sınır Yok' },
        gender: { match: true, user: 'Girilmedi', required: position.gender_requirement },
        graduation: { match: true, message: 'Mezuniyet durumu girilmedi' },
        specialConditions: { match: position.special_conditions.length === 0, pendingConditions: position.special_conditions },
      },
    };
  }

  const reasons: string[] = [];
  let isUnfit = false;
  let isMaybe = false;

  // 1. EĞİTİM SEVİYESİ
  const eduMatch = !user.education_level || user.education_level === position.education_level;
  if (user.education_level && user.education_level !== position.education_level) {
    isUnfit = true;
    reasons.push(`Eğitim seviyeniz (${user.education_level}) ilanın talep ettiği seviyeye (${position.education_level}) uymuyor.`);
  }

  // 2. BÖLÜM
  const deptMatch = checkDepartmentMatch(
    user.department,
    position.allowed_departments,
    position.is_any_department
  );
  if (!deptMatch) {
    isUnfit = true;
    reasons.push(
      `Bölümünüz (${user.department || 'Belirtilmemiş'}), bu kadro için kabul edilen bölümler arasında yer almıyor.`
    );
  }

  // 3. KPSS PUANI VE TÜRÜ
  let kpssMatch = true;
  let kpssDetail = 'Uyumlu';
  if (position.kpss_type !== 'KPSS_YOK') {
    if (!user.kpss_type || user.kpss_type !== position.kpss_type) {
      isUnfit = true;
      kpssMatch = false;
      kpssDetail = `İlan ${position.kpss_type} istiyor, sizde ${user.kpss_type || 'Tanımsız'}`;
      reasons.push(`Bu kadro ${position.kpss_type} puanı istemektedir.`);
    } else if (position.min_kpss_score > 0 && (user.kpss_score || 0) < position.min_kpss_score) {
      isUnfit = true;
      kpssMatch = false;
      kpssDetail = `Puanınız: ${user.kpss_score || 0} (Taban: ${position.min_kpss_score})`;
      reasons.push(
        `KPSS puanınız (${user.kpss_score || 0}), istenen taban puanın (${position.min_kpss_score}) altındadır.`
      );
    }
  }

  // 4. YAŞ KONTROLÜ
  let ageMatch = true;
  const userAge = calculateAge(user.birth_date);
  if (position.max_age && position.max_age > 0) {
    if (userAge !== null) {
      if (userAge > position.max_age) {
        isUnfit = true;
        ageMatch = false;
        reasons.push(`Yaşınız (${userAge}), ilanın belirlediği azami yaş sınırını (${position.max_age}) aşıyor.`);
      }
    } else {
      isMaybe = true;
      reasons.push(`İlanda ${position.max_age} yaş sınırı var, profilinizde doğum tarihiniz eksik.`);
    }
  }

  // 5. CİNSİYET
  let genderMatch = true;
  if (position.gender_requirement !== 'HEPSI' && user.gender && user.gender !== 'BELIRTILMEMIS') {
    if (user.gender !== position.gender_requirement) {
      isUnfit = true;
      genderMatch = false;
      reasons.push(`Bu kadro sadece ${position.gender_requirement} adaylara yöneliktir.`);
    }
  }

  // 6. YDS KONTROLÜ
  let ydsMatch = true;
  if (position.min_yds_level !== 'YOK') {
    const requiredWeight = YDS_WEIGHTS[position.min_yds_level] || 0;
    const userWeight = YDS_WEIGHTS[user.yds_level || 'YOK'] || 0;

    if (!user.yds_level || user.yds_level === 'YOK') {
      isMaybe = true;
      ydsMatch = false;
      reasons.push(`En az ${position.min_yds_level} düzeyinde YDS isteniyor, profilinizde YDS bilgisi boş.`);
    } else if (userWeight < requiredWeight) {
      isUnfit = true;
      ydsMatch = false;
      reasons.push(`YDS seviyeniz (${user.yds_level}), istenen (${position.min_yds_level}) seviyesinin altındadır.`);
    }
  }

  // 7. MEZUNİYET DURUMU
  let gradMatch = true;
  let gradMsg = 'Mezun';
  if (user.graduation_status === 'OGRENCI') {
    isMaybe = true;
    gradMatch = false;
    gradMsg = 'Öğrenci';
    reasons.push('Halen öğrencisiniz. Başvuru son gününe kadar mezun olmanız gerekebilir.');
  }

  // 8. ÖZEL ŞARTLAR / SERTİFİKALAR
  const pendingConditions: string[] = [];
  if (position.special_conditions && position.special_conditions.length > 0) {
    const userCerts = (user.certificates || []).map(normalizeTurkish);

    for (const cond of position.special_conditions) {
      const normCond = normalizeTurkish(cond);
      const hasCert = userCerts.some(c => normCond.includes(c) || c.includes(normCond));
      if (!hasCert) {
        pendingConditions.push(cond);
      }
    }

    if (pendingConditions.length > 0) {
      isMaybe = true;
      reasons.push(
        `Özel şartlar/belgeler aranıyor: ${pendingConditions.slice(0, 2).join(', ')}. Lütfen sağladığınızı kontrol ediniz.`
      );
    }
  }

  // Nihai Durum Belirleme
  let finalStatus: MatchStatus = 'UYGUN';
  if (isUnfit) {
    finalStatus = 'UYMADI';
  } else if (isMaybe) {
    finalStatus = 'BELKI';
  } else {
    finalStatus = 'UYGUN';
    reasons.push('Profiliniz bu kadronun tüm şartlarını eksiksiz karşılamaktadır!');
  }

  return {
    status: finalStatus,
    reasons,
    isMatch: finalStatus === 'UYGUN',
    criteriaMatrix: {
      education: {
        match: eduMatch,
        user: user.education_level || 'Belirtilmedi',
        required: position.education_level,
      },
      department: {
        match: deptMatch,
        user: user.department || 'Belirtilmedi',
        required: position.is_any_department ? 'Herhangi Bir Program' : position.allowed_departments.slice(0, 3).join(', ') || 'Belirtilmedi',
      },
      kpss: {
        match: kpssMatch,
        user: `${user.kpss_type || 'Girilmedi'} (${user.kpss_score || 0})`,
        required: position.kpss_type === 'KPSS_YOK' ? 'Şart Yok' : `${position.kpss_type} ≥ ${position.min_kpss_score}`,
      },
      yds: {
        match: ydsMatch,
        user: user.yds_level || 'YOK',
        required: position.min_yds_level,
      },
      age: {
        match: ageMatch,
        user: userAge !== null ? `${userAge} Yaşında` : 'Girilmedi',
        required: position.max_age ? `Azami ${position.max_age}` : 'Sınır Yok',
      },
      gender: {
        match: genderMatch,
        user: user.gender || 'Hepsi',
        required: position.gender_requirement,
      },
      graduation: {
        match: gradMatch,
        message: gradMsg,
      },
      specialConditions: {
        match: pendingConditions.length === 0,
        pendingConditions,
      },
    },
  };
}

export function computeAnnouncementMatch(
  user: UserProfile | null,
  positions: Position[] = []
): AnnouncementMatchSummary {
  if (!positions || positions.length === 0) {
    return {
      bestStatus: 'BELKI',
      suitableCount: 0,
      maybeCount: 0,
      unfitCount: 0,
      matchedPositions: [],
    };
  }

  let suitableCount = 0;
  let maybeCount = 0;
  let unfitCount = 0;

  const matchedPositions = positions.map(pos => {
    const evaluation = evaluateMatch(user, pos);
    if (evaluation.status === 'UYGUN') suitableCount++;
    else if (evaluation.status === 'BELKI') maybeCount++;
    else unfitCount++;

    return { position: pos, evaluation };
  });

  let bestStatus: MatchStatus = 'UYMADI';
  if (suitableCount > 0) bestStatus = 'UYGUN';
  else if (maybeCount > 0) bestStatus = 'BELKI';

  return {
    bestStatus,
    suitableCount,
    maybeCount,
    unfitCount,
    matchedPositions,
  };
}
