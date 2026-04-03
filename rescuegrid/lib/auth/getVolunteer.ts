import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getVolunteer() {
  const cookieStore = await cookies();
  const volunteerCookie = cookieStore.get('volunteer_session');

  if (!volunteerCookie) return null;

  try {
    const session = JSON.parse(volunteerCookie.value);
    return session;
  } catch {
    return null;
  }
}

export async function getVolunteerFromDb() {
  const session = await getVolunteer();
  if (!session?.volunteer_id) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: volunteer } = await supabase
    .from('volunteer')
    .select('*')
    .eq('id', session.volunteer_id)
    .single();

  return volunteer;
}
