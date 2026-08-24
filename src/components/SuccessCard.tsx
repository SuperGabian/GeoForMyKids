import { ArrowRight, BookOpen, Languages, Landmark, UsersRound } from 'lucide-react'
import type { Country } from '../data/countries'
import { fr } from '../i18n/fr'

type SuccessCardProps = {
  country: Country
  appreciation: string
  remembered: boolean
  onNext: () => void
  nextLabel?: string
}

export function SuccessCard({ country, appreciation, remembered, onNext, nextLabel }: SuccessCardProps) {
  return (
    <section className="success-card" aria-live="polite">
      <div className="success-heading">
        <span className="success-burst" aria-hidden="true">✦</span>
        <div>
          <span className="eyebrow">{remembered ? 'Tu t’en souvenais !' : 'Pays découvert'}</span>
          <h2>{appreciation}</h2>
        </div>
      </div>

      <div className="country-title">
        <span className="big-flag" role="img" aria-label={`Drapeau du ${country.name}`}>{country.flag}</span>
        <div><strong>{country.name}</strong><span>{country.continentName}</span></div>
      </div>

      <dl className="country-details">
        <div><dt><Landmark size={18} />{fr.capital}</dt><dd>{country.capital}</dd></div>
        <div><dt><Languages size={18} />{fr.language}</dt><dd>{country.languages}</dd></div>
        <div><dt><UsersRound size={18} />{fr.inhabitants}</dt><dd title={country.populationSource ? `Source : ${country.populationSource}` : undefined}>{country.population}</dd></div>
      </dl>

      <div className="fun-fact">
        <BookOpen size={19} aria-hidden="true" />
        <div><strong>{fr.fact}</strong><p>{country.fact}</p></div>
      </div>

      <button className="primary-button" type="button" onClick={onNext} autoFocus>
        {nextLabel ?? fr.next}<ArrowRight size={19} />
      </button>
    </section>
  )
}
