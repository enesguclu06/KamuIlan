import { UserProfile, Position, MatchEvaluation, MatchStatus, AnnouncementMatchSummary, YdsLevel } from '@/types';

const YDS_WEIGHTS: Record<string, number> = {
  YOK: 0,
  E: 1,
  D: 2,
  C: 3,
  B: 4,
  A: 5,
};

export function scoreToYdsLevel(score?: number): YdsLevel {
  if (!score || score < 50) return 'YOK';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}

export function normalizeTurkish(text: string): string {
  if (!text) return '';
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
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

const GENERIC_DEPT_WORDS = new Set([
  'muhendisligi', 'muhendisi', 'muhendis',
  'mühendisliği', 'mühendisi', 'mühendis',
  'ogretmenligi', 'ogretmeni', 'ogretmen',
  'öğretmenliği', 'öğretmeni', 'öğretmen',
  'teknikerligi', 'teknikeri', 'tekniker',
  'teknisyenligi', 'teknisyeni', 'teknisyen',
  'uzmanligi', 'uzmani', 'uzman',
  'uzmanlığı', 'uzmanı',
  'hekimligi', 'hekim', 'doktorlugu',
  'hekimliği', 'doktorluğu',
  'bolumu', 'bölümü', 'programi', 'programı', 'fakultesi', 'fakültesi',
  'anabilim', 'dali', 'dalı', 'yuksekokulu', 'yüksekokulu',
  'lisans', 'onlisans', 'önlisans', 've', 'ile', 'veya', 've/veya'
]);

export function extractCoreKeywords(deptName: string): string[] {
  if (!deptName) return [];
  const norm = normalizeTurkish(deptName);
  return norm
    .split(/[\s\-_/,()]+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3 && !GENERIC_DEPT_WORDS.has(w));
}

export function checkDepartmentMatch(
  userDepartment?: string,
  allowedDepartments: string[] = [],
  isAnyDepartment?: boolean | null
): boolean {
  // isAnyDepartment null/undefined gelirse false kabul et
  if (isAnyDepartment === true) return true;
  if (!allowedDepartments || allowedDepartments.length === 0) return true;
  if (!userDepartment) return false;

  const userCore = extractCoreKeywords(userDepartment);
  if (userCore.length === 0) return false;

  for (const dept of allowedDepartments) {
    const allowedCore = extractCoreKeywords(dept);
    if (allowedCore.length === 0) continue;

    // Kullanıcının bölüm ana disipliniyle ilan bölümleri tam çakışıyor mu?
    // Kısmen örtüşme YETERLİ DEĞİL — her iki taraf da aynı ana kelimeyi paylaşmalı
    const hasCoreMatch = userCore.some(uk =>
      allowedCore.some(ak => {
        // Tam eşitlik (örn: "bilgisayar" === "bilgisayar")
        if (ak === uk) return true;
        // Biri diğerinin prefix'i ve yeterince uzun (örn: "bilgisay" → "bilgisayar")
        if (uk.length >= 5 && ak.startsWith(uk)) return true;
        if (ak.length >= 5 && uk.startsWith(ak)) return true;
        return false;
      })
    );

    if (hasCoreMatch) {
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
  // Eğer kullanıcı profili hiç girilmemişse veya boşsa
  if (!user || (!user.education_level && !user.department && !user.kpss_score && !user.ales_score)) {
    return {
      status: 'BELKI',
      reasons: ['Kriterlerinizi karşılaştırmak için profilinizi doldurunuz.'],
      isMatch: false,
      criteriaMatrix: {
        education: { match: false, user: 'Girilmedi', required: position.education_level },
        department: { match: false, user: 'Girilmedi', required: position.is_any_department ? 'Tüm Bölümler' : position.allowed_departments.join(', ') || 'Belirtilmedi' },
        kpss: { match: false, user: 'Girilmedi', required: `${position.kpss_type} (${position.min_kpss_score})` },
        ales: position.min_ales_score ? { match: false, user: 'Girilmedi', required: `En az ${position.min_ales_score}` } : undefined,
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
  let eduMatch = true;
  if (user.education_level) {
    if (position.education_level === 'YUKSEK_LISANS' && user.education_level !== 'YUKSEK_LISANS') {
      isUnfit = true;
      eduMatch = false;
      reasons.push(`Bu kadro Yüksek Lisans derecesi istemektedir. Profiliniz: ${user.education_level}`);
    } else if (position.education_level === 'LISANS' && user.education_level !== 'LISANS' && user.education_level !== 'YUKSEK_LISANS') {
      isUnfit = true;
      eduMatch = false;
      reasons.push(`Bu kadro 4 yıllık Lisans mezuniyeti istemektedir. Profiliniz: ${user.education_level}`);
    } else if (position.education_level === 'ONLISANS' && user.education_level !== 'ONLISANS') {
      isUnfit = true;
      eduMatch = false;
      reasons.push(`Bu kadro 2 yıllık Önlisans mezuniyeti istemektedir.`);
    } else if (position.education_level === 'LISE' && user.education_level !== 'LISE') {
      isUnfit = true;
      eduMatch = false;
      reasons.push(`Bu kadro ortaöğretim / lise düzeyindedir. Lisans mezunları lise kadrolarına başvuramaz.`);
    }
  }

  // 2. BÖLÜM
  const deptMatch = checkDepartmentMatch(
    user.department,
    position.allowed_departments ?? [],
    position.is_any_department ?? false
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

  // 4. ALES PUANI KONTROLÜ
  let alesMatch = true;
  if (position.min_ales_score && position.min_ales_score > 0) {
    if (user.ales_score && user.ales_score > 0) {
      if (user.ales_score < position.min_ales_score) {
        isUnfit = true;
        alesMatch = false;
        reasons.push(`ALES puanınız (${user.ales_score}), istenen taban puanın (${position.min_ales_score}) altındadır.`);
      }
    } else {
      isMaybe = true;
      alesMatch = false;
      reasons.push(`Bu ilan en az ${position.min_ales_score} ALES puanı istemektedir; profilinizde ALES girilmemiş.`);
    }
  }

  // 5. YAŞ KONTROLÜ
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
      // Doğum tarihi girilmemişse adayın yaşı uygun kabul edilir, sadece bilgi notu düşülür
      ageMatch = true;
    }
  }

  // 6. CİNSİYET
  let genderMatch = true;
  if (position.gender_requirement !== 'HEPSI' && user.gender && user.gender !== 'BELIRTILMEMIS') {
    if (user.gender !== position.gender_requirement) {
      isUnfit = true;
      genderMatch = false;
      reasons.push(`Bu kadro sadece ${position.gender_requirement} adaylara yöneliktir.`);
    }
  }

  // 7. YABANCI DİL (YDS / YÖKDİL) KONTROLÜ
  let ydsMatch = true;
  if (position.min_yds_level !== 'YOK') {
    const effectiveUserLevel = user.yds_level && user.yds_level !== 'YOK' 
      ? user.yds_level 
      : scoreToYdsLevel(user.yds_score);

    const requiredWeight = YDS_WEIGHTS[position.min_yds_level] || 0;
    const userWeight = YDS_WEIGHTS[effectiveUserLevel] || 0;

    if (userWeight === 0) {
      isMaybe = true;
      ydsMatch = false;
      reasons.push(`En az ${position.min_yds_level} düzeyinde yabancı dil (YDS/YÖKDİL) isteniyor; profilinizde dil puanı boş.`);
    } else if (userWeight < requiredWeight) {
      isUnfit = true;
      ydsMatch = false;
      reasons.push(`Yabancı dil seviyeniz (${effectiveUserLevel}), istenen (${position.min_yds_level}) düzeyinin altındadır.`);
    }
  }

  // 8. MEZUNİYET DURUMU
  let gradMatch = true;
  let gradMsg = 'Mezun';
  if (user.graduation_status === 'OGRENCI') {
    isMaybe = true;
    gradMatch = false;
    gradMsg = 'Öğrenci';
    reasons.push('Halen öğrencisiniz. Son başvuru tarihine kadar mezun olunması gerekebilir.');
  }

  // 9. BOY ŞARTI KONTROLÜ (İtfaiye, Zabıta, Polis, İnfaz Koruma vb.)
  let heightMatch = true;
  let requiredMinHeight: number | null = null;

  if (position.gender_requirement === 'KADIN' || user.gender === 'KADIN') {
    requiredMinHeight = position.min_height_female || position.min_height || null;
  } else if (position.gender_requirement === 'ERKEK' || user.gender === 'ERKEK') {
    requiredMinHeight = position.min_height_male || position.min_height || null;
  } else {
    requiredMinHeight = position.min_height || null;
  }

  // Eğer position alanlarında doğrudan tanımlı değilse special_conditions içini tara
  if (!requiredMinHeight && position.special_conditions) {
    for (const sc of position.special_conditions) {
      const lower = sc.toLowerCase();
      if (lower.includes('boy') || lower.includes('1.67') || lower.includes('1.60') || lower.includes('1.70') || lower.includes('167') || lower.includes('160') || lower.includes('170')) {
        if (user.gender === 'KADIN') {
          if (lower.includes('1.60') || lower.includes('160')) requiredMinHeight = 160;
          else if (lower.includes('1.65') || lower.includes('165')) requiredMinHeight = 165;
        } else {
          if (lower.includes('1.67') || lower.includes('167')) requiredMinHeight = 167;
          else if (lower.includes('1.70') || lower.includes('170')) requiredMinHeight = 170;
          else if (lower.includes('1.65') || lower.includes('165')) requiredMinHeight = 165;
        }
      }
    }
  }

  if (requiredMinHeight && requiredMinHeight > 0) {
    if (user.height && user.height > 0) {
      if (user.height < requiredMinHeight) {
        isUnfit = true;
        heightMatch = false;
        reasons.push(
          `Boyunuz (${user.height} cm), bu kadro için aranan asgari boy şartının (${requiredMinHeight} cm) altındadır.`
        );
      } else {
        heightMatch = true;
      }
    } else {
      isMaybe = true;
      heightMatch = false;
      reasons.push(
        `Bu kadro için en az ${requiredMinHeight} cm boy şartı aranmaktadır; profilinizde boy bilginiz girilmemiş.`
      );
    }
  }

  // 10. ÖZEL ŞARTLAR / SERTİFİKALAR (Bilgilendirme Amaçlı)
  const pendingConditions: string[] = [];
  if (position.special_conditions && position.special_conditions.length > 0) {
    const userCerts = (user.certificates || []).map(normalizeTurkish);

    for (const cond of position.special_conditions) {
      const normCond = normalizeTurkish(cond);

      // Eğer boy şartıysa ve kullanıcının boyu gereksinimi karşılıyorsa, şartı karşılandı say
      const isHeightCond = normCond.includes('boy') || normCond.includes('1.67') || normCond.includes('1.60') || normCond.includes('167') || normCond.includes('160');
      if (isHeightCond && user.height && requiredMinHeight && user.height >= requiredMinHeight) {
        continue;
      }

      const hasCert = userCerts.some(c => normCond.includes(c) || c.includes(normCond));
      if (!hasCert) {
        pendingConditions.push(cond);
      }
    }

    if (pendingConditions.length > 0) {
      isMaybe = true;
      reasons.push(
        `Özel şart/belge aranmaktadır: ${pendingConditions.slice(0, 2).join(', ')}`
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
      ales: position.min_ales_score ? {
        match: alesMatch,
        user: user.ales_score ? `${user.ales_type || 'ALES'}: ${user.ales_score}` : 'Girilmedi',
        required: `ALES ≥ ${position.min_ales_score}`,
      } : undefined,
      yds: {
        match: ydsMatch,
        user: user.yds_score ? `${user.yds_score} Puan (${scoreToYdsLevel(user.yds_score)})` : (user.yds_level || 'YOK'),
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
      height: requiredMinHeight ? {
        match: heightMatch,
        user: user.height ? `${user.height} cm` : 'Girilmedi',
        required: `En az ${requiredMinHeight} cm`,
      } : undefined,
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
