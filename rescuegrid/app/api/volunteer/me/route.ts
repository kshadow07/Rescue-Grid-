import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

export async function PATCH(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('volunteer_session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const volunteerId = session.volunteer_id;

    const body = await request.json();
    const { skills, equipment } = body;

    const updateData: { skills?: string; equipment?: string } = {};
    
    if (skills !== undefined) {
      updateData.skills = skills;
    }
    if (equipment !== undefined) {
      updateData.equipment = equipment;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: volunteer, error } = await supabase
      .from('volunteer')
      .update(updateData)
      .eq('id', volunteerId)
      .select('id, name, mobile_no, type, skills, equipment, status, last_seen')
      .single();

    if (error) {
      console.error('Error updating volunteer:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json(volunteer);
  } catch (error) {
    console.error('Error in PATCH /api/volunteer/me:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
