import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const WFS_URL = 'https://services.sandre.eaufrance.fr/geo/topage2026'
const RIVERS = [
  { code: 'SEINE', name: 'Seine', sourceName: 'la Seine', bounds: [0, 47.3, 5, 49.8] },
  { code: 'LOIRE', name: 'Loire', sourceName: 'la Loire', bounds: [-2.4, 44.5, 5, 48.3] },
  { code: 'GARONNE', name: 'Garonne', sourceName: 'la Garonne', bounds: [-1, 42.3, 1.7, 45.3] },
  { code: 'RHONE', name: 'Rhône', sourceName: 'le Rhône', bounds: [4, 43, 7, 47] },
  { code: 'RHIN', name: 'Rhin', sourceName: 'le Rhin', bounds: [7.2, 47.3, 8.7, 49.9] },
]

function pointDistance(point, start, end) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1])
  const ratio = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point[0] - (start[0] + ratio * dx), point[1] - (start[1] + ratio * dy))
}

function simplify(points, tolerance = .004) {
  if (points.length <= 2) return points
  let furthestIndex = 0
  let furthestDistance = 0
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointDistance(points[index], points[0], points.at(-1))
    if (distance > furthestDistance) {
      furthestDistance = distance
      furthestIndex = index
    }
  }
  if (furthestDistance <= tolerance) return [points[0], points.at(-1)]
  return [...simplify(points.slice(0, furthestIndex + 1), tolerance).slice(0, -1), ...simplify(points.slice(furthestIndex), tolerance)]
}

async function downloadRiver(river) {
  const filter = `<fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0"><fes:PropertyIsLike wildCard="*" singleChar="?" escapeChar="!"><fes:ValueReference>TopoOH</fes:ValueReference><fes:Literal>*${river.name}*</fes:Literal></fes:PropertyIsLike></fes:Filter>`
  const parameters = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'sa:CoursEau_FXX_Topage2026',
    outputFormat: 'application/json; subtype=geojson',
    srsName: 'EPSG:4326',
    filter,
  })
  const response = await fetch(`${WFS_URL}?${parameters}`)
  if (!response.ok) throw new Error(`Impossible de télécharger ${river.name} (${response.status})`)
  const source = await response.json()
  const lines = source.features
    .filter((feature) => feature.properties.TopoOH?.toLocaleLowerCase('fr') === river.sourceName.toLocaleLowerCase('fr'))
    .flatMap((feature) => feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates : [feature.geometry.coordinates])
    .filter((line) => line.length >= 2)
    .filter((line) => {
      const center = line.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]).map((value) => value / line.length)
      return center[0] >= river.bounds[0] && center[0] <= river.bounds[2]
        && center[1] >= river.bounds[1] && center[1] <= river.bounds[3]
    })
    .map((line) => simplify(line))
  if (!lines.length) throw new Error(`Aucun tracé trouvé pour ${river.name}`)
  return {
    type: 'Feature',
    properties: { code: river.code, name: river.name },
    geometry: { type: 'MultiLineString', coordinates: lines },
  }
}

const features = await Promise.all(RIVERS.map(downloadRiver))
await writeFile(resolve('src/data/france-rivers.json'), `${JSON.stringify({ type: 'FeatureCollection', features })}\n`)
console.log(`France: ${features.length} fleuves exportés depuis la BD TOPAGE 2026.`)
