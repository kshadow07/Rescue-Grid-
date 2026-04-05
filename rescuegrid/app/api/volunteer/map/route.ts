import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const zoom = parseInt(searchParams.get('zoom') ?? '10')
  const lat = parseFloat(searchParams.get('lat') ?? '0')
  const lng = parseFloat(searchParams.get('lng') ?? '0')
  const bbox = searchParams.get('bbox')

  let minLat = lat - 1, maxLat = lat + 1
  let minLng = lng - 1, maxLng = lng + 1

  if (bbox) {
    const [minLo, minLa, maxLo, maxLa] = bbox.split(',').map(parseFloat)
    minLng = minLo; minLat = minLa; maxLng = maxLo; maxLat = maxLa
  }

  if (zoom >= 12) {
    const { data: volunteers } = await supabase
      .from('volunteer')
      .select(`
        id,
        name,
        latitude,
        longitude,
        tier,
        status,
        volunteer_skills(skill_id)
      `)
      .eq('status', 'active')
      .gte('latitude', minLat)
      .lte('latitude', maxLat)
      .gte('longitude', minLng)
      .lte('longitude', maxLng)
      .limit(50)

    return NextResponse.json({
      type: 'pins',
      data: volunteers?.map((v: any) => ({
        id: v.id,
        name: v.name,
        latitude: v.latitude,
        longitude: v.longitude,
        tier: v.tier,
        status: v.status,
        skills: v.volunteer_skills?.map((vs: any) => vs.skill_id) || []
      })) || []
    })
  }

  const { data: volunteers } = await supabase
    .from('volunteer')
    .select(`
      id,
      latitude,
      longitude,
      tier,
      volunteer_skills(skill_definitions(category:skill_categories(code)))
    `)
    .eq('status', 'active')
    .gte('latitude', minLat)
    .lte('latitude', maxLat)
    .gte('longitude', minLng)
    .lte('longitude', maxLng)
    .limit(500)

  const transformed = volunteers?.map((v: any) => ({
    id: v.id,
    latitude: v.latitude,
    longitude: v.longitude,
    tier: v.tier,
    primary_category: v.volunteer_skills?.[0]?.skill_definitions?.category?.code || 'UNKNOWN'
  }))

  return NextResponse.json({ type: 'cluster_input', data: transformed || [] })
}
