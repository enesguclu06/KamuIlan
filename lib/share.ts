export function getWhatsappShareUrl(announcement: {
  id: string;
  institution: string;
  title: string;
  deadline: string;
  positions?: { quota?: number; title?: string }[];
}): string {
  const totalQuota = (announcement.positions || []).reduce((acc, p) => acc + (p.quota || 0), 0);
  const deadlineStr = new Date(announcement.deadline).toLocaleDateString('tr-TR');
  
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://kamuilan-one.vercel.app';
  const url = `${origin}/ilan/${announcement.id}`;

  const text = `📢 *${announcement.institution} Personel Alım İlanı*\n` +
    `📌 ${announcement.title}\n` +
    (totalQuota > 0 ? `👥 Kontenjan: ${totalQuota} Kadro\n` : '') +
    `🗓️ Son Başvuru: ${deadlineStr}\n\n` +
    `🎯 Şartların uyuyor mu hemen incele:\n${url}`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export function openWhatsappShare(announcement: {
  id: string;
  institution: string;
  title: string;
  deadline: string;
  positions?: { quota?: number; title?: string }[];
}) {
  const shareUrl = getWhatsappShareUrl(announcement);
  if (typeof window !== 'undefined') {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }
}
