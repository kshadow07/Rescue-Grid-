import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const DISTRICT_BOUNDS = {
  lat_min: 23.62, lat_max: 23.92,
  lng_min: 86.20, lng_max: 86.58,
}

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
    const [bMinLng, bMinLat, bMaxLng, bMaxLat] = bbox.split(',').map(parseFloat)
    minLat = Math.max(bMinLat, DISTRICT_BOUNDS.lat_min)
    maxLat = Math.min(bMaxLat, DISTRICT_BOUNDS.lat_max)
    minLng = Math.max(bMinLng, DISTRICT_BOUNDS.lng_min)
    maxLng = Math.min(bMaxLng, DISTRICT_BOUNDS.lng_max)
  } else {
    minLat = Math.max(minLat, DISTRICT_BOUNDS.lat_min)
    maxLat = Math.min(maxLat, DISTRICT_BOUNDS.lat_max)
    minLng = Math.max(minLng, DISTRICT_BOUNDS.lng_min)
    maxLng = Math.min(maxLng, DISTRICT_BOUNDS.lng_max)
  }

  const statusFilter = zoom >= 12 
    ? { in: 'active,standby' } 
    : { in: 'active,standby,on-mission' }

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
      .in('status', ['active', 'standby'])
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
      name,
      latitude,
      longitude,
      tier,
      status,
      volunteer_skills(skill_definitions(category:skill_categories(code)))
    `)
    .in('status', ['active', 'standby', 'on-mission'])
    .gte('latitude', minLat)
    .lte('latitude', maxLat)
    .gte('longitude', minLng)
    .lte('longitude', maxLng)
    .limit(500)

  const transformed = volunteers?.map((v: any) => ({
    id: v.id,
    name: v.name,
    latitude: v.latitude,
    longitude: v.longitude,
    tier: v.tier,
    status: v.status,
    primary_category: v.volunteer_skills?.[0]?.skill_definitions?.category?.code || 'UNKNOWN'
  }))

  return NextResponse.json({ type: 'cluster_input', data: transformed || [] })
}
