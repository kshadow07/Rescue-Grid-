import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: messages, error } = await supabase
      .from('message')
      .select('*')
      .is('task_force_id', null)
      .is('victim_report_id', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(messages || []);
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
