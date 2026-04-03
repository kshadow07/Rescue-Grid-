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

    const { data: volunteer, error } = await supabase
      .from('volunteer')
      .select('id, name, mobile_no, type, skills, equipment, status, last_seen')
      .eq('id', volunteerId)
      .single();

    if (error) {
      console.error('Error fetching volunteer:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json(volunteer);
  } catch (error) {
    console.error('Error in GET /api/volunteer/me:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
