import { readFileSync, writeFileSync } from 'node:fs'
import allCountries from 'world-countries'

const WORLD_BANK_URL = 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2020:2025&per_page=2000'
const inputPath = process.argv[2]
const payload = inputPath
  ? JSON.parse(readFileSync(inputPath, 'utf8'))
  : await fetch(WORLD_BANK_URL).then((response) => {
      if (!response.ok) throw new Error(`World Bank API returned ${response.status}`)
      return response.json()
    })

const observations = payload[1] ?? []
const latestByIso3 = new Map()
for (const observation of observations) {
  if (observation.value == null || latestByIso3.has(observation.countryiso3code)) continue
  latestByIso3.set(observation.countryiso3code, {
    value: observation.value,
    year: Number(observation.date),
    source: 'Banque mondiale',
  })
}

const canonical = allCountries.filter(
  (country) => country.unMember || country.cca2 === 'VA' || country.cca2 === 'PS',
)
const countries = Object.fromEntries(canonical.map((country) => {
  const population = country.cca2 === 'VA'
    ? { value: 882, year: 2024, source: 'État de la Cité du Vatican' }
    : latestByIso3.get(country.cca3)
  if (!population) throw new Error(`Missing population for ${country.cca2} (${country.cca3})`)
  return [country.cca2, population]
}))

if (Object.keys(countries).length !== 195) {
  throw new Error(`Expected 195 population entries, got ${Object.keys(countries).length}`)
}

writeFileSync(
  new URL('../src/data/populations.json', import.meta.url),
  `${JSON.stringify({ indicator: 'SP.POP.TOTL', countries })}\n`,
)
