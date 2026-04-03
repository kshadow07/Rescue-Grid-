import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = createServiceClient();
    
    const { data: taskForces, error } = await supabase
      .from('task_force')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enrichedTaskForces = await Promise.all(
      (taskForces || []).map(async (tf) => {
        const { data: members } = await supabase
          .from('task_force_member')
          .select('id, volunteer_id, volunteer:volunteer_id(id, name, type, status)')
          .eq('task_force_id', tf.id);

        let assignmentName = null;
        if (tf.assignment_id) {
          const { data: assignment } = await supabase
            .from('assignment')
            .select('task')
            .eq('id', tf.assignment_id)
            .single();
          assignmentName = assignment?.task || null;
        }

        return {
          ...tf,
          member_count: members?.length || 0,
          members: members || [],
          assignment_name: assignmentName,
        };
      })
    );

    return NextResponse.json(enrichedTaskForces);
  } catch (err) {
    console.error('TaskForce list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
