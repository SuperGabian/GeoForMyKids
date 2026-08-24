export type OceanCode = 'PAC' | 'ATL' | 'IND' | 'ARC' | 'SOU'

export type Ocean = {
  code: OceanCode
  name: string
  articleName: string
  fact: string
  centers: Array<[number, number]>
  radius: [number, number]
}

export const oceans: Ocean[] = [
  {
    code: 'PAC',
    name: 'Pacifique',
    articleName: 'l’océan Pacifique',
    fact: 'L’océan Pacifique est plus vaste que toutes les terres émergées de la planète réunies.',
    centers: [[-150, 0], [150, 0]],
    radius: [112, 155],
  },
  {
    code: 'ATL',
    name: 'Atlantique',
    articleName: 'l’océan Atlantique',
    fact: 'Son nom vient d’Atlas, un personnage de la mythologie grecque.',
    centers: [[-35, 5]],
    radius: [88, 150],
  },
  {
    code: 'IND',
    name: 'Indien',
    articleName: 'l’océan Indien',
    fact: 'Ses eaux tropicales de surface comptent parmi les plus chaudes de tous les océans.',
    centers: [[75, -15]],
    radius: [94, 112],
  },
  {
    code: 'ARC',
    name: 'Arctique',
    articleName: 'l’océan Arctique',
    fact: 'C’est le plus petit des cinq océans et aussi l’un des moins explorés.',
    centers: [[0, 72]],
    radius: [285, 38],
  },
  {
    code: 'SOU',
    name: 'Austral',
    articleName: 'l’océan Austral',
    fact: 'Son grand courant circumpolaire est le seul courant marin qui fasse le tour complet de la Terre.',
    centers: [[0, -65]],
    radius: [365, 34],
  },
]
