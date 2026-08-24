export type SeaCode = 'MED' | 'CAR' | 'RED' | 'BLA' | 'BAL' | 'NOR' | 'ARA' | 'SCS'

export type Sea = {
  code: SeaCode
  name: string
  articleName: string
  center: [number, number]
  radius: [number, number]
}

export const seas: Sea[] = [
  { code: 'MED', name: 'Méditerranée', articleName: 'la mer Méditerranée', center: [17, 35], radius: [58, 18] },
  { code: 'CAR', name: 'des Caraïbes', articleName: 'la mer des Caraïbes', center: [-75, 16], radius: [47, 22] },
  { code: 'RED', name: 'Rouge', articleName: 'la mer Rouge', center: [38, 20], radius: [14, 28] },
  { code: 'BLA', name: 'Noire', articleName: 'la mer Noire', center: [34, 43], radius: [22, 11] },
  { code: 'BAL', name: 'Baltique', articleName: 'la mer Baltique', center: [20, 58], radius: [15, 18] },
  { code: 'NOR', name: 'du Nord', articleName: 'la mer du Nord', center: [3, 56], radius: [15, 14] },
  { code: 'ARA', name: 'd’Arabie', articleName: 'la mer d’Arabie', center: [65, 13], radius: [44, 32] },
  { code: 'SCS', name: 'de Chine méridionale', articleName: 'la mer de Chine méridionale', center: [113, 12], radius: [31, 37] },
]
