import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { POPULAR_DEPARTMENTS } from '@/lib/sample-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const level = searchParams.get('level')?.toUpperCase() || '';

  // 1. Supabase bağlıysa veritabanından çek
  if (supabaseAdmin) {
    try {
      let dbQuery = supabaseAdmin.from('departments').select('id, name, education_level, aliases');
      if (level && ['LISE', 'ONLISANS', 'LISANS'].includes(level)) {
        dbQuery = dbQuery.eq('education_level', level);
      }
      if (query) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
      }
      const { data, error } = await dbQuery.limit(50);
      if (data && data.length > 0 && !error) {
        return NextResponse.json({ departments: data });
      }
    } catch (e) {
      console.warn('Supabase departments query error, fallback used:', e);
    }
  }

  // 2. Fallback popüler bölümler
  const filtered = POPULAR_DEPARTMENTS.filter(d => 
    !query || d.toLowerCase().includes(query)
  ).map((name, i) => ({
    id: `dep-${i}`,
    name,
    education_level: name.includes('Lise') ? 'LISE' : (name.includes('Önlisans') || name.includes('Programcılığı') || name.includes('Sekreterlik') ? 'ONLISANS' : 'LISANS'),
    aliases: [],
  }));

  return NextResponse.json({ departments: filtered });
}
