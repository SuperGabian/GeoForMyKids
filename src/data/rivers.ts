import type { Feature, FeatureCollection, MultiLineString } from 'geojson'
import riverGeoJson from './france-rivers.json'

export type FrenchRiverCode = 'SEINE' | 'LOIRE' | 'GARONNE' | 'RHONE' | 'RHIN'

export type FrenchRiver = {
  code: FrenchRiverCode
  name: string
  articleName: string
  fact: string
  geometry: Feature<MultiLineString, { code: FrenchRiverCode; name: string }>
}

const details: Record<FrenchRiverCode, Pick<FrenchRiver, 'articleName' | 'fact'>> = {
  SEINE: { articleName: 'la Seine', fact: 'La Seine traverse Paris avant de rejoindre la Manche.' },
  LOIRE: { articleName: 'la Loire', fact: 'La Loire est le plus long fleuve qui coule entièrement en France.' },
  GARONNE: { articleName: 'la Garonne', fact: 'La Garonne naît dans les Pyrénées espagnoles et rejoint l’Atlantique par l’estuaire de la Gironde.' },
  RHONE: { articleName: 'le Rhône', fact: 'Le Rhône vient de Suisse, traverse le lac Léman et se jette dans la Méditerranée.' },
  RHIN: { articleName: 'le Rhin', fact: 'Le Rhin longe une partie de la frontière entre la France et l’Allemagne avant de rejoindre la mer du Nord.' },
}

const collection = riverGeoJson as FeatureCollection<MultiLineString, { code: FrenchRiverCode; name: string }>

export const frenchRivers: FrenchRiver[] = collection.features.map((geometry) => ({
  code: geometry.properties.code,
  name: geometry.properties.name,
  geometry,
  ...details[geometry.properties.code],
}))
