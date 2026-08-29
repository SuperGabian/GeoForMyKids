import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const BASE_URL = 'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/latest/geojson'
const METROPOLITAN_REGIONS = new Set(['11', '24', '27', '28', '32', '44', '52', '53', '75', '76', '84', '93', '94'])

async function fetchGeoJson(fileName) {
  const response = await fetch(`${BASE_URL}/${fileName}`)
  if (!response.ok) throw new Error(`Impossible de télécharger ${fileName} (${response.status})`)
  return response.json()
}

function compactFeature(feature) {
  return {
    type: 'Feature',
    properties: {
      code: String(feature.properties.code),
      name: feature.properties.nom,
    },
    geometry: feature.geometry,
  }
}

const [regionsSource, departmentsSource] = await Promise.all([
  fetchGeoJson('regions-1000m.geojson'),
  fetchGeoJson('departements-1000m.geojson'),
])

const regions = {
  type: 'FeatureCollection',
  features: regionsSource.features
    .filter((feature) => METROPOLITAN_REGIONS.has(String(feature.properties.code)))
    .map(compactFeature),
}

const departments = {
  type: 'FeatureCollection',
  features: departmentsSource.features
    .filter((feature) => String(feature.properties.code).length === 2)
    .map(compactFeature),
}

await Promise.all([
  writeFile(resolve('src/data/france-regions.json'), `${JSON.stringify(regions)}\n`),
  writeFile(resolve('src/data/france-departments.json'), `${JSON.stringify(departments)}\n`),
])

console.log(`France: ${regions.features.length} régions et ${departments.features.length} départements exportés.`)
