import { writeFileSync } from 'node:fs'
import allCountries from 'world-countries'

const canonical = allCountries.filter(
  (country) => country.unMember || country.cca2 === 'VA' || country.cca2 === 'PS',
)
const byIso3 = new Map(canonical.map((country) => [country.cca3, country]))

function continent(country) {
  if (country.region === 'Europe') return ['EU', 'Europe']
  if (country.region === 'Asia') return ['AS', 'Asie']
  if (country.region === 'Africa') return ['AF', 'Afrique']
  if (country.region === 'Oceania') return ['OC', 'Océanie']
  if (country.region === 'Americas' && country.subregion === 'South America') return ['SA', 'Amérique du Sud']
  return ['NA', 'Amérique du Nord']
}

const catalog = canonical.map((country) => {
  const [continentCode, continentName] = continent(country)
  return {
    iso2: country.cca2,
    numericId: country.ccn3,
    name: country.translations?.fra?.common ?? country.name.common,
    flag: country.flag,
    continent: continentCode,
    continentName,
    subregion: country.subregion,
    capital: country.capital?.[0] ?? '—',
    languages: Object.values(country.languages ?? {}),
    population: country.population,
    label: [country.latlng?.[1] ?? 0, country.latlng?.[0] ?? 0],
    landlocked: Boolean(country.landlocked),
    island: !country.landlocked && (country.borders?.length ?? 0) === 0,
    neighbors: (country.borders ?? [])
      .map((iso3) => byIso3.get(iso3))
      .filter(Boolean)
      .slice(0, 3)
      .map((neighbor) => neighbor.translations?.fra?.common ?? neighbor.name.common),
  }
})

if (catalog.length !== 195) throw new Error(`Expected 195 countries, got ${catalog.length}`)
writeFileSync(
  new URL('../src/data/all-countries.json', import.meta.url),
  `${JSON.stringify(catalog)}\n`,
)
