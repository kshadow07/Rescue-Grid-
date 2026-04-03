import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('volunteer_session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const volunteerId = session.volunteer_id;

    const { data: assignments, error } = await supabase
      .from('assignment')
      .select(`
        *,
        volunteer:assigned_to_volunteer(id, name, mobile_no, type),
        task_force:assigned_to_taskforce(id, name),
        victim_report:victim_report_id(id, situation, urgency, status)
      `)
      .eq('assigned_to_volunteer', volunteerId)
      .in('status', ['completed', 'failed'])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json(assignments || []);
  } catch (error) {
    console.error('Error in GET /api/volunteer/assignment/history:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
