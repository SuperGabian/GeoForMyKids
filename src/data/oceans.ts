export type OceanCode = 'PAC' | 'ATL' | 'IND' | 'ARC' | 'SOU'

export type Ocean = {
  code: OceanCode
  name: string
  articleName: string
  centers: Array<[number, number]>
  radius: [number, number]
}

export const oceans: Ocean[] = [
  { code: 'PAC', name: 'Pacifique', articleName: 'l’océan Pacifique', centers: [[-150, 0], [150, 0]], radius: [112, 155] },
  { code: 'ATL', name: 'Atlantique', articleName: 'l’océan Atlantique', centers: [[-35, 5]], radius: [88, 150] },
  { code: 'IND', name: 'Indien', articleName: 'l’océan Indien', centers: [[75, -15]], radius: [94, 112] },
  { code: 'ARC', name: 'Arctique', articleName: 'l’océan Arctique', centers: [[0, 72]], radius: [285, 38] },
  { code: 'SOU', name: 'Austral', articleName: 'l’océan Austral', centers: [[0, -65]], radius: [365, 34] },
]
