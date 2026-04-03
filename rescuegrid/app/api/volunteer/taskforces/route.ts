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

    const { data: taskForces, error } = await supabase
      .from('task_force_member')
      .select(`
        task_force:task_force(id, name, status)
      `)
      .eq('volunteer_id', volunteerId);

    if (error) {
      console.error('Error fetching task forces:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const uniqueTfs = taskForces?.reduce((acc: any[], curr) => {
      if (curr.task_force && !acc.find((t: any) => t.id === curr.task_force.id)) {
        acc.push(curr.task_force);
      }
      return acc;
    }, []) || [];

    return NextResponse.json(uniqueTfs);
  } catch (error) {
    console.error('Error in GET /api/volunteer/taskforces:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
