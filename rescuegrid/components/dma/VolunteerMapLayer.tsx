'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Marker } from 'react-map-gl/mapbox'
import Supercluster from 'supercluster'
import { debounce } from '@/lib/utils'

interface VolunteerMapLayerProps {
  map: mapboxgl.Map | null
  onVolunteerSelect?: (volunteer: { id: string; name?: string }) => void
}

interface MapData {
  type: 'pins' | 'cluster_input'
  data: any[]
}

export function VolunteerMapLayer({ map, onVolunteerSelect }: VolunteerMapLayerProps) {
  const superclusterRef = useRef<Supercluster | null>(null)
  const [zoom, setZoom] = useState(10)
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [clusters, setClusters] = useState<any[]>([])

  const fetchMapData = useCallback(async () => {
    if (!map) return
    const bounds = map.getBounds()
    if (!bounds) return
    const z = Math.round(map.getZoom())
    const center = map.getCenter()

    const bbox = [
      bounds.getWest(), bounds.getSouth(),
      bounds.getEast(), bounds.getNorth()
    ].join(',')

    try {
      const res = await fetch(
        `/api/volunteer/map?zoom=${z}&lat=${center.lat}&lng=${center.lng}&bbox=${bbox}`
      )
      if (res.ok) {
        const json = await res.json()
        setMapData(json)
        setZoom(z)
      }
    } catch (error) {
      console.error('Failed to fetch map data:', error)
    }
  }, [map])

  useEffect(() => {
    if (!mapData || mapData.type !== 'cluster_input' || !map) return

    const sc = new Supercluster({
      radius: 60,
      maxZoom: 12,
      map: (props: any) => ({ tier: props.tier, category: props.category }),
      reduce: (acc: any, props: any) => {
        acc.count = (acc.count || 0) + 1
        acc.totalTier = (acc.totalTier || 0) + props.tier
        if (!acc.categories) acc.categories = {}
        acc.categories[props.category] = (acc.categories[props.category] || 0) + 1
      }
    })

    sc.load(mapData.data.map((v: any) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.longitude, v.latitude] },
      properties: { id: v.id, tier: v.tier, category: v.primary_category },
    })))

    superclusterRef.current = sc

    const bounds = map.getBounds()
    if (!bounds) return
    const initialClusters = sc.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom
    )
    setClusters(initialClusters)
  }, [mapData, map, zoom])

  useEffect(() => {
    if (!map || !superclusterRef.current) return

    const updateClusters = () => {
      const bounds = map.getBounds()
      if (!bounds) return
      const z = Math.round(map.getZoom())
      const newClusters = superclusterRef.current!.getClusters(
        [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        z
      )
      setClusters(newClusters)
      setZoom(z)
    }

    const debouncedUpdate = debounce(updateClusters, 100)
    map.on('moveend', debouncedUpdate)
    map.on('zoomend', debouncedUpdate)

    return () => {
      map.off('moveend', debouncedUpdate)
      map.off('zoomend', debouncedUpdate)
    }
  }, [map])

  useEffect(() => {
    fetchMapData()
  }, [fetchMapData])

  if (!mapData) return null

  if (mapData.type === 'pins') {
    return (
      <>
        {mapData.data.map((v: any) => (
          <Marker key={v.id} longitude={v.longitude} latitude={v.latitude}>
            <VolunteerPin
              tier={v.tier}
              score={v.score}
              skills={v.skills}
              onClick={() => onVolunteerSelect?.(v)}
            />
          </Marker>
        ))}
      </>
    )
  }

  if (mapData.type === 'cluster_input' && clusters.length > 0) {
    return (
      <>
        {clusters.map((cluster, idx) => {
          const [lng, lat] = cluster.geometry.coordinates
          if (cluster.properties.cluster) {
            const categories = cluster.properties.categories || {}
            const dominantCategory = Object.entries(categories)
              .sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'UNKNOWN'

            return (
              <Marker key={`cluster-${cluster.id || idx}`} longitude={lng} latitude={lat}>
                <ClusterBubble
                  count={cluster.properties.point_count}
                  dominantCategory={dominantCategory}
                  onClick={() => map?.flyTo({ center: [lng, lat], zoom: zoom + 2 })}
                />
              </Marker>
            )
          }
          return (
            <Marker key={cluster.properties.id || idx} longitude={lng} latitude={lat}>
              <SmallDot tier={cluster.properties.tier} />
            </Marker>
          )
        })}
      </>
    )
  }

  return null
}

function VolunteerPin({ tier, score, skills, onClick }: any) {
  const tierColors = ['#6B7280', '#F5A623', '#3B8BFF', '#2ECC71']
  return (
    <div
      className="relative cursor-pointer group"
      onClick={onClick}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg transition-transform group-hover:scale-110"
        style={{ backgroundColor: tierColors[(tier || 1) - 1] || tierColors[0] }}
      >
        {tier || 1}
      </div>
      {score !== undefined && (
        <div className="absolute -top-1 -right-1 bg-orange text-white text-[8px] px-1 rounded">
          {Math.round(score * 100)}
        </div>
      )}
    </div>
  )
}

function ClusterBubble({ count, dominantCategory, onClick }: any) {
  const categoryColors: Record<string, string> = {
    'MEDICAL': '#F5A623',
    'RESCUE': '#FF6B2B',
    'LOGISTICS': '#3B8BFF',
    'COMMUNICATION': '#9B59B6',
    'SPECIAL': '#2ECC71',
    'UNKNOWN': '#6B7280'
  }

  const size = Math.min(60, Math.max(30, count * 3))

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold cursor-pointer transition-transform hover:scale-110 shadow-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: categoryColors[dominantCategory] || categoryColors.UNKNOWN,
        border: '3px solid white'
      }}
      onClick={onClick}
    >
      {count}
    </div>
  )
}

function SmallDot({ tier }: { tier: number }) {
  const tierColors = ['#6B7280', '#F5A623', '#3B8BFF', '#2ECC71']
  return (
    <div
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: tierColors[(tier || 1) - 1] || tierColors[0] }}
    />
  )
}
