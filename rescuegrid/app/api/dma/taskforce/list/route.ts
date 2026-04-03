import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('task_force')
      .select('id, name, status')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('TaskForce list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}