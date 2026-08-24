export type SeaCode = 'MED' | 'CAR' | 'RED' | 'BLA' | 'BAL' | 'NOR' | 'ARA' | 'SCS'

export type Sea = {
  code: SeaCode
  name: string
  articleName: string
  fact: string
  center: [number, number]
  radius: [number, number]
}

export const seas: Sea[] = [
  {
    code: 'MED',
    name: 'Méditerranée',
    articleName: 'la mer Méditerranée',
    fact: 'Presque entièrement entourée de terres, elle ne rejoint naturellement l’océan Atlantique que par le détroit de Gibraltar.',
    center: [17, 35],
    radius: [58, 18],
  },
  {
    code: 'CAR',
    name: 'des Caraïbes',
    articleName: 'la mer des Caraïbes',
    fact: 'Elle abrite le récif mésoaméricain, deuxième plus grand système de récifs-barrières au monde.',
    center: [-75, 16],
    radius: [47, 22],
  },
  {
    code: 'RED',
    name: 'Rouge',
    articleName: 'la mer Rouge',
    fact: 'De minuscules organismes appelés Trichodesmium peuvent parfois donner une teinte rougeâtre à son eau.',
    center: [38, 20],
    radius: [14, 28],
  },
  {
    code: 'BLA',
    name: 'Noire',
    articleName: 'la mer Noire',
    fact: 'Ses eaux profondes manquent presque totalement d’oxygène, ce qui peut conserver d’anciennes épaves pendant des siècles.',
    center: [34, 43],
    radius: [22, 11],
  },
  {
    code: 'BAL',
    name: 'Baltique',
    articleName: 'la mer Baltique',
    fact: 'Son eau est saumâtre : c’est un mélange d’eau salée et d’eau douce apportée par de nombreux fleuves.',
    center: [20, 58],
    radius: [15, 18],
  },
  {
    code: 'NOR',
    name: 'du Nord',
    articleName: 'la mer du Nord',
    fact: 'À la préhistoire, une terre appelée Doggerland occupait une partie de son emplacement et reliait la Grande-Bretagne à l’Europe.',
    center: [3, 56],
    radius: [15, 14],
  },
  {
    code: 'ARA',
    name: 'd’Arabie',
    articleName: 'la mer d’Arabie',
    fact: 'Ses vents de mousson changent de direction selon les saisons et inversent même ses courants de surface.',
    center: [65, 13],
    radius: [44, 32],
  },
  {
    code: 'SCS',
    name: 'de Chine méridionale',
    articleName: 'la mer de Chine méridionale',
    fact: 'Elle compte plus de 280 îles formées notamment d’atolls, de récifs coralliens et de bancs de sable.',
    center: [113, 12],
    radius: [31, 37],
  },
]
