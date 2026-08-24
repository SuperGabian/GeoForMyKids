import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Compass, Download, LockKeyhole, PencilLine, Smartphone, Sparkles, UserPlus, UsersRound } from 'lucide-react'
import { continentLabels, countries, countryDifficultyLevels, countryLevelNames, type ContinentCode } from '../data/countries'
import type { PlayerProfile } from '../data/profiles'
import { fr } from '../i18n/fr'

export type CountryProgress = Record<string, {
  encounters: number
  stage: number
  needsReview?: boolean
  nextReviewLevel?: number
}>

type ProgressViewProps = {
  progress: CountryProgress
  activeProfile: PlayerProfile
  profiles: PlayerProfile[]
  onClose: () => void
  onSelectProfile: (profileId: string) => void
  onCreateProfile: (name: string) => void
  onRenameProfile: (profileId: string, name: string) => void
  canInstallApp: boolean
  isAppInstalled: boolean
  onInstallApp: () => Promise<boolean>
}

export function ProgressView({ progress, activeProfile, profiles, onClose, onSelectProfile, onCreateProfile, onRenameProfile, canInstallApp, isAppInstalled, onInstallApp }: ProgressViewProps) {
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [profileError, setProfileError] = useState('')
  const [renamedProfileName, setRenamedProfileName] = useState(activeProfile.name)
  const [renameError, setRenameError] = useState('')
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const discovered = countries.filter((country) => progress[country.iso2]?.encounters)
  const mastered = countries.filter((country) => {
    const item = progress[country.iso2]
    return (item?.stage ?? 0) >= 3 && !item?.needsReview
  })
  const continents = Object.keys(continentLabels) as ContinentCode[]

  useEffect(() => {
    if (!showProfileSwitcher) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowProfileSwitcher(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showProfileSwitcher])

  const submitNewProfile = (event: FormEvent) => {
    event.preventDefault()
    const name = newProfileName.trim()
    if (!name) {
      setProfileError('Choisis un nom pour ce profil.')
      return
    }
    if (profiles.some((profile) => profile.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))) {
      setProfileError('Ce nom de profil existe déjà.')
      return
    }
    onCreateProfile(name)
  }

  const submitProfileRename = (event: FormEvent) => {
    event.preventDefault()
    const name = renamedProfileName.trim()
    if (!name) {
      setRenameError('Choisis un pseudo.')
      return
    }
    if (profiles.some((profile) => profile.id !== activeProfile.id && profile.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))) {
      setRenameError('Ce nom de profil existe déjà.')
      return
    }
    onRenameProfile(activeProfile.id, name)
    setRenamedProfileName(name)
    setRenameError('')
  }

  const installApplication = async () => {
    if (isAppInstalled) return
    const promptWasShown = await onInstallApp()
    setShowInstallHelp(!promptWasShown)
  }

  return (
    <main className="progress-page">
      <div className="progress-toolbar">
        <button className="text-button back-button" onClick={onClose} type="button">
          <ArrowLeft size={19} />{fr.close}
        </button>
        <button className="profile-switch-button" type="button" onClick={() => {
          setRenamedProfileName(activeProfile.name)
          setRenameError('')
          setShowProfileSwitcher(true)
        }}>
          <UsersRound size={20} />
          <span><small>Profil : {activeProfile.name}</small><strong>Changer d’utilisateur</strong></span>
        </button>
      </div>

      <header className="progress-hero">
        <div className="progress-orbit" aria-hidden="true"><span>🌍</span><i>✦</i></div>
        <div>
          <span className="eyebrow"><Sparkles size={15} /> Carnet d’exploration</span>
          <h1>{fr.collectionTitle}</h1>
          <p>{fr.collectionSubtitle}</p>
        </div>
      </header>

      <section className="progress-summary">
        <div><strong>{discovered.length}</strong><span>{fr.discovered}</span></div>
        <div><strong>{mastered.length}</strong><span>{fr.mastered}</span></div>
        <div><strong>{countries.length}</strong><span>pays à explorer dans ce prototype</span></div>
      </section>

      <section className={`pwa-install-card ${isAppInstalled ? 'is-installed' : ''}`} aria-labelledby="pwa-install-title">
        <span className="pwa-install-icon" aria-hidden="true">{isAppInstalled ? <Check size={25} /> : <Smartphone size={25} />}</span>
        <div>
          <span className="eyebrow">Application GeoForMyKids</span>
          <strong id="pwa-install-title">{isAppInstalled ? 'Installée sur cet appareil' : 'Emporte ta planète partout'}</strong>
          <p>{isAppInstalled ? 'GeoForMyKids peut être lancé directement depuis ton écran d’accueil.' : 'Installe l’application pour l’ouvrir comme un jeu et y accéder même hors connexion.'}</p>
          {showInstallHelp ? <p className="pwa-install-help" role="status">Ouvre le menu de ton navigateur, puis choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p> : null}
        </div>
        <button type="button" disabled={isAppInstalled} onClick={installApplication}>
          {isAppInstalled ? <Check size={18} /> : <Download size={18} />}
          {isAppInstalled ? 'Application installée' : canInstallApp ? 'Installer GeoForMyKids' : 'Comment l’installer ?'}
        </button>
      </section>

      <section className="continent-progress" aria-labelledby="continent-title">
        <div className="section-title">
          <div><span className="eyebrow">Ton voyage</span><h2 id="continent-title">Exploration par continent</h2></div>
          <Compass size={26} />
        </div>
        <div className="continent-grid">
          {continents.map((code) => {
            const pool = countries.filter((country) => country.continent === code)
            const done = pool.filter((country) => progress[country.iso2]?.encounters).length
            const percent = pool.length ? (done / pool.length) * 100 : 0
            return (
              <article className="continent-card" key={code}>
                <div><i className={`legend-dot continent-${code.toLowerCase()}`} /><strong>{continentLabels[code]}</strong><span>{done} / {pool.length}</span></div>
                <div className="progress-track"><i style={{ width: `${percent}%` }} /></div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="passport" aria-labelledby="passport-title">
        <div className="section-title"><div><span className="eyebrow">Mon passeport</span><h2 id="passport-title">Les pays du voyage</h2></div></div>
        <div className="passport-levels">
          {countryDifficultyLevels.map((difficulty) => {
            const levelCountries = countries.filter((country) => country.difficulty === difficulty)
            const discoveredInLevel = levelCountries.filter((country) => progress[country.iso2]?.encounters).length

            return (
              <section className="passport-level" data-difficulty={difficulty} key={difficulty} aria-labelledby={`passport-level-${difficulty}`}>
                <header className="passport-level-heading">
                  <div><span>Niveau {difficulty}</span><h3 id={`passport-level-${difficulty}`}>{countryLevelNames[difficulty]}</h3></div>
                  <strong>{discoveredInLevel} / {levelCountries.length}</strong>
                </header>

                {continents.map((code) => {
                  const continentCountries = levelCountries
                    .filter((country) => country.continent === code)
                    .sort((first, second) => first.name.localeCompare(second.name, 'fr'))
                  if (!continentCountries.length) return null

                  return (
                    <div className="passport-continent" data-continent={code} key={code}>
                      <h4><i className={`legend-dot continent-${code.toLowerCase()}`} />{continentLabels[code]} <span>{continentCountries.length}</span></h4>
                      <div className="passport-grid">
                        {continentCountries.map((country) => {
                          const item = progress[country.iso2]
                          const isMastered = Boolean(item && item.stage >= 3 && !item.needsReview)
                          return (
                            <article className={`passport-country ${item ? 'is-discovered' : ''} ${item?.needsReview ? 'needs-review' : ''} ${isMastered ? 'is-mastered' : ''}`} data-country={country.iso2} key={country.iso2}>
                              <span className="passport-flag" aria-hidden="true">{item ? country.flag : <LockKeyhole size={18} />}</span>
                              <div><strong>{item ? country.name : 'À découvrir'}</strong><span>{item ? `${item.encounters} rencontre${item.encounters > 1 ? 's' : ''}` : continentLabels[country.continent]}</span></div>
                              {item?.needsReview ? <span className="review-status">À réviser</span> : null}
                              {isMastered ? <span className="mastery-status" title="Bien connu">✓ Bien connu</span> : null}
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>
      </section>

      {showProfileSwitcher ? (
        <div className="profile-switcher-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-switcher-title" onClick={() => setShowProfileSwitcher(false)}>
          <section className="profile-switcher-card" onClick={(event) => event.stopPropagation()}>
            <span className="profile-switcher-icon" aria-hidden="true"><UsersRound size={26} /></span>
            <span className="eyebrow">Profils GeoForMyKids</span>
            <h2 id="profile-switcher-title">Changer d’utilisateur</h2>
            <p>Chaque profil conserve séparément ses niveaux, ses pays connus et ses révisions.</p>

            <div className="profile-list" aria-label="Profils disponibles">
              {profiles.map((profile) => {
                const isActive = profile.id === activeProfile.id
                return (
                  <button
                    type="button"
                    className={isActive ? 'is-active' : ''}
                    disabled={isActive}
                    aria-label={isActive ? `Profil actuel : ${profile.name}` : `Utiliser le profil ${profile.name}`}
                    key={profile.id}
                    onClick={() => onSelectProfile(profile.id)}
                  >
                    <span aria-hidden="true">{profile.name.slice(0, 1).toLocaleUpperCase('fr')}</span>
                    <div><strong>{profile.name}</strong><small>{isActive ? 'Profil actuel' : 'Utiliser ce profil'}</small></div>
                    {isActive ? <Check size={18} /> : null}
                  </button>
                )
              })}
            </div>

            <form className="rename-profile-form" onSubmit={submitProfileRename}>
              <label htmlFor="rename-profile-name"><PencilLine size={17} />Personnaliser mon pseudo</label>
              <div>
                <input
                  id="rename-profile-name"
                  type="text"
                  value={renamedProfileName}
                  maxLength={30}
                  autoComplete="off"
                  onChange={(event) => {
                    setRenamedProfileName(event.target.value)
                    setRenameError('')
                  }}
                />
                <button type="submit">Enregistrer</button>
              </div>
              {renameError ? <p role="alert">{renameError}</p> : <small>Ta progression sera conservée.</small>}
            </form>

            <form className="new-profile-form" onSubmit={submitNewProfile}>
              <label htmlFor="new-profile-name"><UserPlus size={17} />Créer un profil</label>
              <div>
                <input
                  id="new-profile-name"
                  type="text"
                  value={newProfileName}
                  maxLength={30}
                  placeholder="Par exemple : Joueur 2"
                  autoComplete="off"
                  onChange={(event) => {
                    setNewProfileName(event.target.value)
                    setProfileError('')
                  }}
                />
                <button type="submit">Créer</button>
              </div>
              {profileError ? <p role="alert">{profileError}</p> : null}
            </form>

            <button className="text-button profile-switcher-cancel" type="button" onClick={() => setShowProfileSwitcher(false)}>Annuler</button>
          </section>
        </div>
      ) : null}
    </main>
  )
}
