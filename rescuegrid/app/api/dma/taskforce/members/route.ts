import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskforceId = searchParams.get('taskforce_id');

    if (!taskforceId) {
      return NextResponse.json({ error: 'taskforce_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: members, error } = await supabase
      .from('task_force_member')
      .select(`
        member_type,
        role,
        volunteer:volunteer(id, name, mobile_no, type, status)
      `)
      .eq('task_force_id', taskforceId);

    if (error) throw error;

    const volunteers = members?.map(m => ({
      id: m.volunteer.id,
      name: m.volunteer.name,
      mobile_no: m.volunteer.mobile_no,
      type: m.volunteer.type,
      status: m.volunteer.status,
      member_type: m.member_type,
      role: m.role
    })) || [];

    return NextResponse.json(volunteers);
  } catch (error) {
    console.error('Error fetching TF members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}
