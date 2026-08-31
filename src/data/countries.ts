import generatedCatalog from './all-countries.json'
import { countryFacts } from './country-facts'
import populationCatalog from './populations.json'

export type ContinentCode = 'EU' | 'AS' | 'AF' | 'OC' | 'NA' | 'SA'
export const countryDifficultyLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const
export type CountryDifficulty = typeof countryDifficultyLevels[number]

export const countryLevelNames: Record<CountryDifficulty, string> = {
  1: 'Mes premiers pays',
  2: 'Petit explorateur',
  3: 'Explorateur',
  4: 'Aventurier',
  5: 'Voyageur curieux',
  6: 'Grand voyageur',
  7: 'Cartographe',
  8: 'Globe-trotteur',
  9: 'Connaisseur du monde',
  10: 'Grand cartographe',
  11: 'Maître géographe',
  12: 'Expert des frontières',
  13: 'Expert du monde',
}

export type Country = {
  iso2: string
  numericId: string
  name: string
  flag: string
  continent: ContinentCode
  continentName: string
  capital: string
  languages: string
  population: string
  populationSource?: string
  fact: string
  difficulty: CountryDifficulty
  label: [number, number]
  hints: string[]
}

export const continentLabels: Record<ContinentCode, string> = {
  EU: 'Europe',
  AS: 'Asie',
  AF: 'Afrique',
  OC: 'Océanie',
  NA: 'Amérique du Nord',
  SA: 'Amérique du Sud',
}

const featuredCountries: Country[] = [
  {
    iso2: 'PT', numericId: '620', name: 'Portugal', flag: '🇵🇹', continent: 'EU', continentName: 'Europe',
    capital: 'Lisbonne', languages: 'portugais', population: 'environ 10 millions', difficulty: 2, label: [-8, 39.5],
    fact: "Le Portugal possède l'une des plus anciennes frontières d'Europe, presque inchangée depuis le XIIIᵉ siècle.",
    hints: ["Il se trouve dans l’hémisphère Nord.", 'Il se trouve en Europe.', 'Il est situé en Europe du Sud.', 'Il possède une façade sur l’océan Atlantique.', 'Il ne partage sa frontière terrestre qu’avec l’Espagne.'],
  },
  {
    iso2: 'FR', numericId: '250', name: 'France', flag: '🇫🇷', continent: 'EU', continentName: 'Europe',
    capital: 'Paris', languages: 'français', population: 'environ 68 millions', difficulty: 1, label: [2.2, 46.4],
    fact: 'Avec ses territoires ultramarins, la France utilise douze fuseaux horaires : un record mondial.',
    hints: ["Elle se trouve dans l’hémisphère Nord.", 'Elle se situe en Europe occidentale.', 'Elle possède des côtes sur l’Atlantique et la Méditerranée.', 'Sa forme est parfois comparée à un hexagone.', 'Elle partage notamment ses frontières avec l’Espagne, l’Italie et l’Allemagne.'],
  },
  {
    iso2: 'JP', numericId: '392', name: 'Japon', flag: '🇯🇵', continent: 'AS', continentName: 'Asie',
    capital: 'Tokyo', languages: 'japonais', population: 'environ 124 millions', difficulty: 1, label: [138, 37],
    fact: 'Le Japon est formé de plus de 14 000 îles, même si quatre grandes îles regroupent presque toute sa population.',
    hints: ["Il se trouve dans l’hémisphère Nord.", 'Il se situe en Asie de l’Est.', 'C’est un archipel dans l’océan Pacifique.', 'Il se trouve à l’est de la péninsule coréenne.', 'Ses quatre îles principales dessinent un arc au large de la Chine.'],
  },
  {
    iso2: 'BR', numericId: '076', name: 'Brésil', flag: '🇧🇷', continent: 'SA', continentName: 'Amérique du Sud',
    capital: 'Brasília', languages: 'portugais', population: 'environ 203 millions', difficulty: 1, label: [-52, -10],
    fact: "Le Brésil abrite la plus grande partie de la forêt amazonienne et près d’un tiers des forêts tropicales du monde.",
    hints: ['Il est traversé par l’équateur.', 'Il se trouve en Amérique du Sud.', 'Il est bordé par l’océan Atlantique.', 'C’est le plus grand pays de son continent.', 'Il partage une frontière avec presque tous les pays d’Amérique du Sud.'],
  },
  {
    iso2: 'AU', numericId: '036', name: 'Australie', flag: '🇦🇺', continent: 'OC', continentName: 'Océanie',
    capital: 'Canberra', languages: 'anglais', population: 'environ 27 millions', difficulty: 1, label: [134, -25],
    fact: 'La Grande Barrière de corail, au nord-est du pays, est la plus vaste structure vivante de la planète.',
    hints: ["Elle se trouve dans l’hémisphère Sud.", 'Elle appartient à l’Océanie.', 'C’est un immense pays insulaire.', 'Elle se situe entre les océans Indien et Pacifique.', 'Elle est au sud de l’Indonésie et de la Papouasie-Nouvelle-Guinée.'],
  },
  {
    iso2: 'US', numericId: '840', name: 'États-Unis', flag: '🇺🇸', continent: 'NA', continentName: 'Amérique du Nord',
    capital: 'Washington', languages: 'anglais', population: 'environ 340 millions', difficulty: 1, label: [-101, 39],
    fact: 'Le pays compte 50 États, dont deux ne sont pas reliés au territoire principal : l’Alaska et Hawaï.',
    hints: ["Ils se trouvent surtout dans l’hémisphère Nord.", 'Ils se situent en Amérique du Nord.', 'Ils sont bordés par les océans Atlantique et Pacifique.', 'Ils partagent une très longue frontière avec le Canada.', 'Leur territoire principal est au nord du Mexique.'],
  },
  {
    iso2: 'CA', numericId: '124', name: 'Canada', flag: '🇨🇦', continent: 'NA', continentName: 'Amérique du Nord',
    capital: 'Ottawa', languages: 'anglais et français', population: 'environ 41 millions', difficulty: 1, label: [-108, 57],
    fact: 'Le Canada possède plus de lacs que tous les autres pays réunis.',
    hints: ["Il se trouve dans l’hémisphère Nord.", 'Il se situe en Amérique du Nord.', 'Il borde trois océans : Atlantique, Pacifique et Arctique.', 'C’est le deuxième plus grand pays du monde.', 'Il se trouve directement au nord des États-Unis.'],
  },
  {
    iso2: 'IN', numericId: '356', name: 'Inde', flag: '🇮🇳', continent: 'AS', continentName: 'Asie',
    capital: 'New Delhi', languages: 'hindi, anglais et de nombreuses langues régionales', population: 'environ 1,4 milliard', difficulty: 2, label: [79, 22],
    fact: 'L’Inde compte 22 langues reconnues par sa Constitution et des centaines d’autres langues parlées.',
    hints: ["Elle se trouve dans l’hémisphère Nord.", 'Elle se situe en Asie du Sud.', 'Elle forme une grande péninsule dans l’océan Indien.', 'L’Himalaya borde le nord du pays.', 'Elle se trouve entre le Pakistan et le Bangladesh.'],
  },
  {
    iso2: 'MA', numericId: '504', name: 'Maroc', flag: '🇲🇦', continent: 'AF', continentName: 'Afrique',
    capital: 'Rabat', languages: 'arabe et amazighe', population: 'environ 38 millions', difficulty: 2, label: [-6.3, 31.8],
    fact: 'Le Maroc est séparé de l’Espagne par le détroit de Gibraltar, large de seulement 14 km à son point le plus étroit.',
    hints: ["Il se trouve dans l’hémisphère Nord.", 'Il est situé en Afrique du Nord.', 'Il possède des côtes sur l’Atlantique et la Méditerranée.', 'Il est traversé par les montagnes de l’Atlas.', 'Il se trouve juste au sud de l’Espagne.'],
  },
  {
    iso2: 'EG', numericId: '818', name: 'Égypte', flag: '🇪🇬', continent: 'AF', continentName: 'Afrique',
    capital: 'Le Caire', languages: 'arabe', population: 'environ 115 millions', difficulty: 2, label: [30, 27],
    fact: 'Le Nil traverse l’Égypte du sud au nord et a permis à l’une des plus anciennes civilisations du monde de se développer.',
    hints: ["Elle se trouve dans l’hémisphère Nord.", 'Elle est située en Afrique du Nord.', 'Elle possède une côte sur la Méditerranée.', 'Le Nil traverse tout le pays.', 'Elle se trouve entre la Libye et la mer Rouge.'],
  },
  {
    iso2: 'ZA', numericId: '710', name: 'Afrique du Sud', flag: '🇿🇦', continent: 'AF', continentName: 'Afrique',
    capital: 'Pretoria', languages: 'douze langues officielles', population: 'environ 63 millions', difficulty: 3, label: [24, -29],
    fact: 'L’Afrique du Sud possède trois capitales, chacune accueillant une branche différente du gouvernement.',
    hints: ["Elle se trouve dans l’hémisphère Sud.", 'Elle est située en Afrique australe.', 'Elle borde les océans Atlantique et Indien.', 'Le Lesotho est entièrement enclavé dans son territoire.', 'Elle occupe l’extrémité sud du continent africain.'],
  },
  {
    iso2: 'MX', numericId: '484', name: 'Mexique', flag: '🇲🇽', continent: 'NA', continentName: 'Amérique du Nord',
    capital: 'Mexico', languages: 'espagnol et langues autochtones', population: 'environ 130 millions', difficulty: 2, label: [-102, 23],
    fact: 'Le Mexique est l’un des berceaux du chocolat : les peuples mésoaméricains consommaient déjà le cacao il y a des millénaires.',
    hints: ["Il se trouve dans l’hémisphère Nord.", 'Il appartient à l’Amérique du Nord.', 'Il possède des côtes sur le Pacifique et sur un grand golfe à l’est.', 'Sa partie sud-est forme la péninsule du Yucatán.', 'Il se trouve juste au sud des États-Unis.'],
  },
  {
    iso2: 'AR', numericId: '032', name: 'Argentine', flag: '🇦🇷', continent: 'SA', continentName: 'Amérique du Sud',
    capital: 'Buenos Aires', languages: 'espagnol', population: 'environ 46 millions', difficulty: 2, label: [-65, -35],
    fact: 'L’Aconcagua, en Argentine, est le plus haut sommet du monde en dehors de l’Asie.',
    hints: ["Elle se trouve surtout dans l’hémisphère Sud.", 'Elle se situe en Amérique du Sud.', 'Elle possède une longue façade sur l’Atlantique.', 'La cordillère des Andes borde tout son côté ouest.', 'Elle se trouve à l’est du Chili.'],
  },
  {
    iso2: 'GR', numericId: '300', name: 'Grèce', flag: '🇬🇷', continent: 'EU', continentName: 'Europe',
    capital: 'Athènes', languages: 'grec', population: 'environ 10 millions', difficulty: 2, label: [22, 39],
    fact: 'La Grèce compte environ 6 000 îles et îlots, mais seules un peu plus de 200 sont habitées.',
    hints: ["Elle se trouve dans l’hémisphère Nord.", 'Elle se situe en Europe du Sud.', 'Elle possède des milliers d’îles en Méditerranée.', 'Elle occupe le sud de la péninsule des Balkans.', 'Elle se trouve au sud de l’Albanie et de la Macédoine du Nord.'],
  },
  {
    iso2: 'TH', numericId: '764', name: 'Thaïlande', flag: '🇹🇭', continent: 'AS', continentName: 'Asie',
    capital: 'Bangkok', languages: 'thaï', population: 'environ 71 millions', difficulty: 3, label: [101, 15],
    fact: 'La Thaïlande n’a jamais été colonisée par une puissance européenne, contrairement à plusieurs de ses voisines.',
    hints: ["Elle se trouve dans l’hémisphère Nord.", 'Elle est située en Asie du Sud-Est.', 'Elle possède des côtes sur un golfe à l’est et sur la mer d’Andaman.', 'Sa partie sud forme une longue péninsule.', 'Elle se trouve entre le Myanmar, le Laos et le Cambodge.'],
  },
]

type CatalogCountry = {
  iso2: string
  numericId: string
  name: string
  flag: string
  continent: string
  continentName: string
  subregion: string
  capital: string
  languages: string[]
  label: number[]
  landlocked: boolean
  island: boolean
  neighbors: string[]
}

type PopulationEntry = {
  value: number
  year: number
  source: string
}

const populationByIso = (populationCatalog as { countries: Record<string, PopulationEntry> }).countries
const compactNumber = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const wholeNumber = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

function populationFor(iso2: string) {
  const entry = populationByIso[iso2]
  if (!entry) return { label: 'Population non disponible', source: undefined }

  let amount: string
  if (entry.value >= 1_000_000_000) {
    amount = `${compactNumber.format(entry.value / 1_000_000_000)} milliard${entry.value >= 2_000_000_000 ? 's' : ''}`
  } else if (entry.value >= 1_000_000) {
    amount = `${compactNumber.format(entry.value / 1_000_000)} million${entry.value >= 2_000_000 ? 's' : ''}`
  } else if (entry.value >= 10_000) {
    amount = wholeNumber.format(Math.round(entry.value / 1_000) * 1_000)
  } else {
    amount = wholeNumber.format(entry.value)
  }

  return {
    label: `${entry.value >= 10_000 ? 'environ ' : ''}${amount} habitants (${entry.year})`,
    source: entry.source,
  }
}

export const countriesByDifficulty: Record<CountryDifficulty, readonly string[]> = {
  1: [
    'FR', // France
    'US', // États-Unis
    'CN', // Chine
    'JP', // Japon
    'BR', // Brésil
    'AU', // Australie
    'GB', // Royaume-Uni
    'IT', // Italie
    'ES', // Espagne
    'CA', // Canada
    'DE', // Allemagne
    'RU', // Russie
  ],
  2: [
    'PT', // Portugal
    'IN', // Inde
    'MX', // Mexique
    'AR', // Argentine
    'MA', // Maroc
    'EG', // Égypte
    'GR', // Grèce
    'NO', // Norvège
    'SE', // Suède
    'FI', // Finlande
    'DK', // Danemark
    'NL', // Pays-Bas
    'BE', // Belgique
  ],
  3: [
    'CH', // Suisse
    'AT', // Autriche
    'IE', // Irlande
    'PL', // Pologne
    'UA', // Ukraine
    'TR', // Turquie
    'SA', // Arabie Saoudite
    'IL', // Israël
    'ID', // Indonésie
    'KR', // Corée du Sud
    'NZ', // Nouvelle-Zélande
    'CL', // Chili
  ],
  4: [
    'ZA', // Afrique du Sud
    'TH', // Thaïlande
    'VN', // Viêt Nam
    'PK', // Pakistan
    'IS', // Islande
    'PH', // Philippines
    'MY', // Malaisie
    'LU', // Luxembourg
    'IR', // Iran
    'IQ', // Irak
    'MG', // Madagascar
    'JO', // Jordanie
    'LB', // Liban
    'KE', // Kenya
  ],
  5: [
    'NG', // Nigéria
    'BD', // Bangladesh
    'GH', // Ghana
    'SN', // Sénégal
    'TZ', // Tanzanie
    'DZ', // Algérie
    'TN', // Tunisie
    'LY', // Libye
    'CM', // Cameroun
    'CI', // Côte d'Ivoire
    'AE', // Émirats arabes unis
    'CO', // Colombie
    'PE', // Pérou
    'VE', // Venezuela
  ],
  6: [
    'EC', // Équateur
    'BO', // Bolivie
    'PY', // Paraguay
    'UY', // Uruguay
    'CU', // Cuba
    'CR', // Costa Rica
    'PA', // Panama
    'ET', // Éthiopie
    'CZ', // Tchéquie
    'HU', // Hongrie
    'RO', // Roumanie
    'BG', // Bulgarie
    'HR', // Croatie
    'RS', // Serbie
  ],
  7: [
    'AF', // Afghanistan
    'AO', // Angola
    'AL', // Albanie
    'AM', // Arménie
    'AZ', // Azerbaïdjan
    'BJ', // Bénin
    'BF', // Burkina Faso
    'BH', // Bahreïn
    'BS', // Bahamas
    'BA', // Bosnie-Herzégovine
    'BY', // Biélorussie
    'BB', // Barbade
    'BN', // Brunei
    'BW', // Botswana
    'CF', // République centrafricaine
    'CD', // Congo (Rép. dém.)
    'CG', // Congo
  ],
  8: [
    'CV', // Îles du Cap-Vert
    'CY', // Chypre
    'DO', // République dominicaine
    'EE', // Estonie
    'FJ', // Fidji
    'GA', // Gabon
    'GE', // Géorgie
    'GN', // Guinée
    'GQ', // Guinée équatoriale
    'GT', // Guatemala
    'GY', // Guyana
    'HN', // Honduras
    'HT', // Haïti
    'JM', // Jamaïque
    'KZ', // Kazakhstan
    'KH', // Cambodge
    'KW', // Koweït
  ],
  9: [
    'LA', // Laos
    'LK', // Sri Lanka
    'LT', // Lituanie
    'LV', // Lettonie
    'MD', // Moldavie
    'MV', // Maldives
    'MK', // Macédoine du Nord
    'ML', // Mali
    'MT', // Malte
    'MM', // Birmanie
    'ME', // Monténégro
    'MN', // Mongolie
    'MZ', // Mozambique
    'MR', // Mauritanie
    'MU', // Île Maurice
    'SG', // Singapour
  ],
  10: [
    'NA', // Namibie
    'NE', // Niger
    'NI', // Nicaragua
    'NP', // Népal
    'OM', // Oman
    'PG', // Papouasie-Nouvelle-Guinée
    'KP', // Corée du Nord
    'PS', // Palestine
    'QA', // Qatar
    'RW', // Rwanda
    'SD', // Soudan
    'SB', // Îles Salomon
    'SV', // Salvador
    'SO', // Somalie
    'SS', // Soudan du Sud
    'SK', // Slovaquie
  ],
  11: [
    'SI', // Slovénie
    'SC', // Seychelles
    'SY', // Syrie
    'TD', // Tchad
    'TG', // Togo
    'TJ', // Tadjikistan
    'TM', // Turkménistan
    'TO', // Tonga
    'TT', // Trinité-et-Tobago
    'UG', // Ouganda
    'UZ', // Ouzbékistan
    'VU', // Vanuatu
    'WS', // Samoa
    'YE', // Yémen
    'ZM', // Zambie
    'ZW', // Zimbabwe
  ],
  12: [
    'BT', // Bhoutan
    'LS', // Lesotho
    'SR', // Surinam
    'KG', // Kirghizistan
    'GW', // Guinée-Bissau
    'TL', // Timor oriental
    'VA', // Cité du Vatican
    'SM', // Saint-Marin
    'MC', // Monaco
    'LI', // Liechtenstein
    'AD', // Andorre
    'NR', // Nauru
    'TV', // Tuvalu
    'KI', // Kiribati
    'PW', // Palaos (Palau)
    'MH', // Îles Marshall
    'FM', // Micronésie
  ],
  13: [
    'ST', // São Tomé et Príncipe
    'KM', // Comores
    'DJ', // Djibouti
    'ER', // Érythrée
    'SZ', // Swaziland
    'GM', // Gambie
    'BI', // Burundi
    'MW', // Malawi
    'SL', // Sierra Leone
    'LR', // Liberia
    'BZ', // Belize
    'KN', // Saint-Christophe-et-Niévès
    'DM', // Dominique
    'GD', // Grenade
    'VC', // Saint-Vincent-et-les-Grenadines
    'LC', // Sainte-Lucie
    'AG', // Antigua-et-Barbuda
  ],
}

const subregionNames: Record<string, string> = {
  'Western Europe': 'Europe occidentale',
  'Eastern Europe': 'Europe orientale',
  'Northern Europe': 'Europe du Nord',
  'Southern Europe': 'Europe du Sud',
  'Western Asia': 'Asie de l’Ouest',
  'Eastern Asia': 'Asie de l’Est',
  'Central Asia': 'Asie centrale',
  'Southern Asia': 'Asie du Sud',
  'South-Eastern Asia': 'Asie du Sud-Est',
  'Northern Africa': 'Afrique du Nord',
  'Western Africa': 'Afrique de l’Ouest',
  'Middle Africa': 'Afrique centrale',
  'Eastern Africa': 'Afrique de l’Est',
  'Southern Africa': 'Afrique australe',
  Caribbean: 'Caraïbes',
  'Central America': 'Amérique centrale',
  'North America': 'Amérique du Nord',
  'South America': 'Amérique du Sud',
  Melanesia: 'Mélanésie',
  Micronesia: 'Micronésie',
  Polynesia: 'Polynésie',
  'Australia and New Zealand': 'Australie et Nouvelle-Zélande',
}

const languageNames: Record<string, string> = {
  English: 'anglais', French: 'français', Spanish: 'espagnol', Portuguese: 'portugais', Arabic: 'arabe',
  German: 'allemand', Italian: 'italien', Dutch: 'néerlandais', Russian: 'russe', Chinese: 'chinois',
  Japanese: 'japonais', Korean: 'coréen', Hindi: 'hindi', Turkish: 'turc', Greek: 'grec',
}

const difficultyByIso = new Map(countryDifficultyLevels.flatMap((difficulty) => (
  countriesByDifficulty[difficulty].map((iso2) => [iso2, difficulty] as const)
)))

function difficultyFor(iso2: string): Country['difficulty'] {
  const difficulty = difficultyByIso.get(iso2)
  if (!difficulty) throw new Error(`Le pays ${iso2} n’est rangé dans aucun niveau de difficulté.`)
  return difficulty
}

function genericCountry(source: CatalogCountry): Country {
  const [longitude, latitude] = source.label as [number, number]
  const subregion = subregionNames[source.subregion] ?? source.continentName
  const hemisphere = Math.abs(latitude) <= 4
    ? 'Ce pays se trouve près de l’équateur.'
    : `Ce pays se trouve dans l’hémisphère ${latitude > 0 ? 'Nord' : 'Sud'}.`
  const geographyHint = source.landlocked
    ? 'Ce pays ne possède aucun accès à la mer.'
    : source.island
      ? 'C’est un pays insulaire.'
      : 'Ce pays possède une façade maritime.'
  const neighborHint = source.neighbors.length
    ? `Il partage notamment une frontière avec ${source.neighbors.join(' et ')}.`
    : `Il se situe dans la région appelée ${subregion}.`
  const population = populationFor(source.iso2)

  return {
    iso2: source.iso2,
    numericId: source.numericId,
    name: source.name,
    flag: source.flag,
    continent: source.continent as ContinentCode,
    continentName: source.continentName,
    capital: source.capital,
    languages: source.languages.map((language) => languageNames[language] ?? language).join(', ') || 'Non renseigné',
    population: population.label,
    populationSource: population.source,
    fact: countryFacts[source.iso2] ?? `${source.name} possède une géographie et une histoire qui lui sont propres.`,
    difficulty: difficultyFor(source.iso2),
    label: [longitude, latitude],
    hints: [
      hemisphere,
      `Ce pays se trouve en ${source.continentName}.`,
      `Il se situe en ${subregion}.`,
      geographyHint,
      neighborHint,
    ],
  }
}

const featuredIso = new Set(featuredCountries.map((country) => country.iso2))
export const countries: Country[] = [
  ...featuredCountries.map((country) => {
    const population = populationFor(country.iso2)
    return { ...country, difficulty: difficultyFor(country.iso2), population: population.label, populationSource: population.source }
  }),
  ...(generatedCatalog as CatalogCountry[])
    .filter((country) => !featuredIso.has(country.iso2))
    .map(genericCountry),
]

export const countryByIso = Object.fromEntries(countries.map((country) => [country.iso2, country]))
export const countryByNumericId = Object.fromEntries(countries.map((country) => [country.numericId, country]))

export function flagFromIso(iso2: string) {
  return iso2
    .toUpperCase()
    .split('')
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join('')
}
