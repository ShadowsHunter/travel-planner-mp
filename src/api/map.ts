import request from './request'

export interface PoiResult {
  id: string
  name: string
  address: string
  lat: string
  lng: string
  type: string
}

export function searchPOI(query: string, city?: string): Promise<PoiResult[]> {
  return request
    .get<{ pois: PoiResult[] }>('/map/search', { q: query, city: city || undefined })
    .then((res) => res.pois ?? [])
}
