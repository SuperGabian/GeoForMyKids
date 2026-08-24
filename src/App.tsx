import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ChevronRight, Globe2, Lightbulb, Map, RotateCcw, Sparkles } from 'lucide-react'
import { WorldMap } from './components/WorldMap'
import { SuccessCard } from './components/SuccessCard'
import { ProgressView, type CountryProgress } from './components/ProgressView'
import {
  continentLabels,
  countries,
  countryByIso,
  countryDifficultyLevels,
  countryLevelNames,
  flagFromIso,
  type ContinentCode,
  type Country,
} from './data/countries'
import { oceans, type OceanCode } from './data/oceans'
import { seas, type SeaCode } from './data/seas'
import {
  ACTIVE_PROFILE_KEY,
  PROFILES_KEY,
  createProfileId,
  loadProfileRegistry,
  profileStorageKey,
  type PlayerProfile,
} from './data/profiles'
import { fr } from './i18n/fr'

const STORAGE_KEY = 'globidoo.progress.v1'
const TUTORIAL_KEY = 'globidoo.tutorial.completed.v1'
const OCEAN_TUTORIAL_KEY = 'globidoo.ocean-tutorial.completed.v1'
const SEA_TUTORIAL_KEY = 'globidoo.sea-tutorial.completed.v1'
const continentTargets = ['FR', 'JP', 'EG', 'AU', 'US', 'BR'].map((iso2) => countryByIso[iso2])

type GameMode = 'continents' | 'oceans' | 'seas' | 'country'
type WrongAnswer = { iso2: string; name: string; continent: ContinentCode | 'AN' }
type LevelTransition = { from: Country['difficulty']; to: Country['difficulty']; total: number }
type ReviewSession = {
  completedLevel: Country['difficulty']
  queue: string[]
  index: number
}
type ReplaySession = {
  level: Country['difficulty']
  returnLevel: Country['difficulty']
  returnCountryIso: string
  queue: string[]
  index: number
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function appIsInstalled() {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
  return standaloneNavigator.standalone === true
    || (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
}

function loadProgress(profileId: string): CountryProgress {
  try {
    const saved = localStorage.getItem(profileStorageKey(STORAGE_KEY, profileId))
    return saved ? JSON.parse(saved) as CountryProgress : {}
  } catch {
    return {}
  }
}

function seaTutorialIsPending(progress: CountryProgress, profileId: string) {
  try {
    if (localStorage.getItem(profileStorageKey(SEA_TUTORIAL_KEY, profileId)) === 'true') return false
  } catch {
    return false
  }

  const firstTwoLevelsCompleted = countries
    .filter((country) => country.difficulty <= 2)
    .every((country) => progress[country.iso2]?.encounters)
  return firstTwoLevelsCompleted && countriesDueForReview(progress, 2).length === 0
}

function initialMode(progress: CountryProgress, profileId: string): GameMode {
  try {
    if (localStorage.getItem(profileStorageKey(TUTORIAL_KEY, profileId)) !== 'true') return 'continents'
    if (localStorage.getItem(profileStorageKey(OCEAN_TUTORIAL_KEY, profileId)) !== 'true') return 'oceans'
    return seaTutorialIsPending(progress, profileId) ? 'seas' : 'country'
  } catch {
    return 'continents'
  }
}

function qualityFor(wrongAnswers: number, elapsedSeconds: number) {
  if (wrongAnswers === 0 && elapsedSeconds <= 12) return 4
  if (wrongAnswers <= 1) return 3
  if (wrongAnswers <= 3) return 2
  return 1
}

function appreciationFor(quality: number) {
  if (quality === 4) return 'Incroyable !'
  if (quality === 3) return 'Super explorateur !'
  if (quality === 2) return 'Bien joué !'
  return 'Bravo, tu l’as trouvé !'
}

function chooseNextCountry(current: Country, progress: CountryProgress) {
  const unseen = countries.filter((country) => country.iso2 !== current.iso2 && !progress[country.iso2]?.encounters)
  const lowestAvailableTier = unseen.length ? Math.min(...unseen.map((country) => country.difficulty)) : null
  const pool = unseen.filter((country) => country.difficulty === lowestAvailableTier)
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null
}

function initialCountry(progress: CountryProgress) {
  const unseen = countries.filter((country) => !progress[country.iso2]?.encounters)
  if (!unseen.length) return countries[0]
  const lowestAvailableTier = Math.min(...unseen.map((country) => country.difficulty))
  return unseen.find((country) => country.difficulty === lowestAvailableTier)!
}

function countriesDueForReview(progress: CountryProgress, completedLevel: Country['difficulty']) {
  return countries.filter((country) => {
    const item = progress[country.iso2]
    return item?.needsReview && (item.nextReviewLevel ?? country.difficulty) <= completedLevel
  })
}

function createJourneyStart(progress: CountryProgress) {
  const unseen = countries.filter((country) => !progress[country.iso2]?.encounters)
  const completedLevel = unseen.length
    ? Math.max(0, Math.min(...unseen.map((country) => country.difficulty)) - 1)
    : countryDifficultyLevels.at(-1)!
  const dueCountries = completedLevel > 0
    ? countriesDueForReview(progress, completedLevel as Country['difficulty'])
    : []
  const reviewSession = dueCountries.length ? {
    completedLevel: completedLevel as Country['difficulty'],
    queue: dueCountries.map((country) => country.iso2),
    index: 0,
  } : undefined

  return {
    country: reviewSession ? dueCountries[0] : initialCountry(progress),
    reviewSession,
  }
}

function continentQuestion(continentName: string) {
  return `Où se trouve l’${continentName} ?`
}

type ProfileGameProps = {
  activeProfile: PlayerProfile
  profiles: PlayerProfile[]
  onSelectProfile: (profileId: string) => void
  onCreateProfile: (name: string) => void
  canInstallApp: boolean
  isAppInstalled: boolean
  onInstallApp: () => Promise<boolean>
}

export default function App() {
  const [profileRegistry, setProfileRegistry] = useState(loadProfileRegistry)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent>()
  const [isAppInstalled, setIsAppInstalled] = useState(appIsInstalled)
  const activeProfile = profileRegistry.profiles.find((profile) => profile.id === profileRegistry.activeProfileId)
    ?? profileRegistry.profiles[0]

  const selectProfile = (profileId: string) => {
    if (!profileRegistry.profiles.some((profile) => profile.id === profileId)) return
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId)
    setProfileRegistry((registry) => ({ ...registry, activeProfileId: profileId }))
  }

  const createProfile = (rawName: string) => {
    const name = rawName.trim().slice(0, 30)
    if (!name) return
    const profile = { id: createProfileId(), name }
    const profiles = [...profileRegistry.profiles, profile]
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id)
    setProfileRegistry({ profiles, activeProfileId: profile.id })
  }

  useEffect(() => {
    const rememberInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const markAsInstalled = () => {
      setInstallPrompt(undefined)
      setIsAppInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', rememberInstallPrompt)
    window.addEventListener('appinstalled', markAsInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', rememberInstallPrompt)
      window.removeEventListener('appinstalled', markAsInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) return false
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(undefined)
    return true
  }

  return (
    <ProfileGame
      key={activeProfile.id}
      activeProfile={activeProfile}
      profiles={profileRegistry.profiles}
      onSelectProfile={selectProfile}
      onCreateProfile={createProfile}
      canInstallApp={Boolean(installPrompt)}
      isAppInstalled={isAppInstalled}
      onInstallApp={installApp}
    />
  )
}

function ProfileGame({ activeProfile, profiles, onSelectProfile, onCreateProfile, canInstallApp, isAppInstalled, onInstallApp }: ProfileGameProps) {
  const [screen, setScreen] = useState<'game' | 'progress'>('game')
  const [progress, setProgress] = useState<CountryProgress>(() => loadProgress(activeProfile.id))
  const [gameMode, setGameMode] = useState<GameMode>(() => initialMode(progress, activeProfile.id))
  const [journeyStart] = useState(() => createJourneyStart(progress))
  const initiallyCompleted = gameMode === 'country'
    && countries.every((country) => progress[country.iso2]?.encounters)
    && !journeyStart.reviewSession
  const [tutorialStep, setTutorialStep] = useState(0)
  const [oceanStep, setOceanStep] = useState(0)
  const [seaStep, setSeaStep] = useState(0)
  const [countryTarget, setCountryTarget] = useState(journeyStart.country)
  const [reviewSession, setReviewSession] = useState<ReviewSession | undefined>(journeyStart.reviewSession)
  const [replaySession, setReplaySession] = useState<ReplaySession>()
  const [showLevelPicker, setShowLevelPicker] = useState(false)
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([])
  const [lastSelected, setLastSelected] = useState<string>()
  const [isCorrect, setIsCorrect] = useState(initiallyCompleted)
  const [appreciation, setAppreciation] = useState('')
  const [remembered, setRemembered] = useState(false)
  const [allCountriesCompleted, setAllCountriesCompleted] = useState(initiallyCompleted)
  const [levelTransition, setLevelTransition] = useState<LevelTransition>()
  const startedAt = useRef(performance.now())

  const target = gameMode === 'continents' ? continentTargets[tutorialStep] : countryTarget
  const oceanTarget = oceans[oceanStep]
  const seaTarget = seas[seaStep]
  const visibleHints = gameMode === 'country' ? target.hints.slice(0, wrongAnswers.length) : []
  const lastWrongAnswer = wrongAnswers.at(-1)
  const continentTutorialFinished = gameMode === 'continents' && tutorialStep === continentTargets.length - 1
  const oceanTutorialFinished = gameMode === 'oceans' && oceanStep === oceans.length - 1
  const seaTutorialFinished = gameMode === 'seas' && seaStep === seas.length - 1
  const tutorialPhaseFinished = continentTutorialFinished || oceanTutorialFinished || seaTutorialFinished

  const discoveredCount = useMemo(
    () => Object.values(progress).filter((item) => item.encounters > 0).length,
    [progress],
  )
  const masteredCount = useMemo(
    () => Object.values(progress).filter((item) => item.stage >= 3 && !item.needsReview).length,
    [progress],
  )
  const isCountryMilestone = gameMode === 'country' && !reviewSession && !replaySession && isCorrect && discoveredCount > 0 && discoveredCount % 5 === 0
  const targetTierCountries = countries.filter((country) => country.difficulty === target.difficulty)
  const targetTierDiscovered = targetTierCountries.filter((country) => progress[country.iso2]?.encounters).length
  const activeJourneyLevel = reviewSession?.completedLevel ?? replaySession?.returnLevel ?? countryTarget.difficulty
  const replayableLevels = countryDifficultyLevels.filter((difficulty) => (
    difficulty < activeJourneyLevel
    && countries
      .filter((country) => country.difficulty === difficulty)
      .every((country) => progress[country.iso2]?.encounters)
  ))

  useEffect(() => {
    if (!showLevelPicker) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowLevelPicker(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showLevelPicker])

  const resetRoundState = () => {
    setWrongAnswers([])
    setLastSelected(undefined)
    setIsCorrect(false)
    setAppreciation('')
    setRemembered(false)
    setAllCountriesCompleted(false)
    startedAt.current = performance.now()
  }

  const beginSeaTutorial = (nextCountry: Country) => {
    setCountryTarget(nextCountry)
    setReviewSession(undefined)
    setSeaStep(0)
    setGameMode('seas')
    resetRoundState()
  }

  const startLevelReplay = (level: Country['difficulty']) => {
    const queue = countries
      .filter((country) => country.difficulty === level)
      .map((country) => country.iso2)
    if (!queue.length) return

    setReplaySession({
      level,
      returnLevel: replaySession?.returnLevel ?? activeJourneyLevel,
      returnCountryIso: replaySession?.returnCountryIso ?? countryTarget.iso2,
      queue,
      index: 0,
    })
    setCountryTarget(countryByIso[queue[0]])
    setShowLevelPicker(false)
    resetRoundState()
  }

  const returnToCurrentJourney = () => {
    if (!replaySession) return
    setCountryTarget(countryByIso[replaySession.returnCountryIso])
    setReplaySession(undefined)
    setShowLevelPicker(false)
    resetRoundState()
  }

  const submitAnswer = (iso2: string, name: string, selectedContinent: ContinentCode | 'AN') => {
    if (isCorrect) return
    setLastSelected(iso2)

    if (gameMode === 'continents') {
      if (selectedContinent !== target.continent) {
        setWrongAnswers((answers) => [...answers, {
          iso2,
          name: selectedContinent === 'AN' ? name : continentLabels[selectedContinent],
          continent: selectedContinent,
        }])
        return
      }

      setAppreciation('Bravo !')
      setIsCorrect(true)
      return
    }

    if (gameMode === 'oceans' || gameMode === 'seas') return

    if (iso2 !== target.iso2) {
      setWrongAnswers((answers) => [...answers, { iso2, name, continent: selectedContinent }])
      return
    }

    const elapsedSeconds = (performance.now() - startedAt.current) / 1000
    const quality = qualityFor(wrongAnswers.length, elapsedSeconds)
    const previous = progress[target.iso2]
    const struggled = wrongAnswers.length >= 2
    const isScheduledReview = Boolean(reviewSession && !replaySession)
    const needsReview = isScheduledReview ? struggled : Boolean(previous?.needsReview || struggled)
    const nextReviewLevel = isScheduledReview
      ? struggled ? reviewSession!.completedLevel + 1 : undefined
      : struggled ? replaySession?.returnLevel ?? target.difficulty : previous?.nextReviewLevel
    const nextStage = wrongAnswers.length === 0
      ? Math.max(3, previous?.stage ?? 0)
      : wrongAnswers.length === 1
        ? Math.min(2, previous?.stage ?? 2)
        : 1
    const nextProgress = {
      ...progress,
      [target.iso2]: {
        encounters: (previous?.encounters ?? 0) + 1,
        stage: nextStage,
        needsReview,
        nextReviewLevel,
      },
    }

    setRemembered(Boolean(previous && wrongAnswers.length === 0))
    setAppreciation(isScheduledReview
      ? struggled ? 'On y reviendra !' : 'C’est acquis !'
      : appreciationFor(quality))
    setProgress(nextProgress)
    localStorage.setItem(profileStorageKey(STORAGE_KEY, activeProfile.id), JSON.stringify(nextProgress))
    setIsCorrect(true)
  }

  const submitOceanAnswer = (code: OceanCode, name: string) => {
    if (isCorrect || gameMode !== 'oceans') return
    setLastSelected(code)

    if (code !== oceanTarget.code) {
      setWrongAnswers((answers) => [...answers, { iso2: code, name: `océan ${name}`, continent: 'AN' }])
      return
    }

    setAppreciation('Bravo !')
    setIsCorrect(true)
  }

  const submitSeaAnswer = (code: SeaCode, name: string) => {
    if (isCorrect || gameMode !== 'seas') return
    setLastSelected(code)

    if (code !== seaTarget.code) {
      setWrongAnswers((answers) => [...answers, { iso2: code, name: `mer ${name}`, continent: 'AN' }])
      return
    }

    setAppreciation('Bravo !')
    setIsCorrect(true)
  }

  const nextCountryRound = () => {
    if (replaySession) {
      const nextReplayIndex = replaySession.index + 1
      if (nextReplayIndex < replaySession.queue.length) {
        setReplaySession({ ...replaySession, index: nextReplayIndex })
        setCountryTarget(countryByIso[replaySession.queue[nextReplayIndex]])
        resetRoundState()
        return
      }

      setCountryTarget(countryByIso[replaySession.returnCountryIso])
      setReplaySession(undefined)
      resetRoundState()
      return
    }

    if (reviewSession) {
      const nextReviewIndex = reviewSession.index + 1
      if (nextReviewIndex < reviewSession.queue.length) {
        setReviewSession({ ...reviewSession, index: nextReviewIndex })
        setCountryTarget(countryByIso[reviewSession.queue[nextReviewIndex]])
        resetRoundState()
        return
      }

      const completedLevel = reviewSession.completedLevel
      setReviewSession(undefined)
      const next = chooseNextCountry(countryTarget, progress)
      if (!next) {
        setAllCountriesCompleted(true)
        return
      }
      if (completedLevel === 2 && next.difficulty > 2 && seaTutorialIsPending(progress, activeProfile.id)) {
        beginSeaTutorial(next)
        return
      }
      if (next.difficulty > completedLevel) {
        setLevelTransition({
          from: completedLevel,
          to: next.difficulty,
          total: countries.filter((country) => country.difficulty === next.difficulty).length,
        })
      }
      setCountryTarget(next)
      resetRoundState()
      return
    }

    const next = chooseNextCountry(countryTarget, progress)
    const levelFinished = !next || next.difficulty > countryTarget.difficulty
    if (levelFinished) {
      const dueCountries = countriesDueForReview(progress, countryTarget.difficulty)
      if (dueCountries.length) {
        setReviewSession({
          completedLevel: countryTarget.difficulty,
          queue: dueCountries.map((country) => country.iso2),
          index: 0,
        })
        setCountryTarget(dueCountries[0])
        resetRoundState()
        return
      }
    }

    if (!next) {
      setAllCountriesCompleted(true)
      return
    }
    if (countryTarget.difficulty === 2 && next.difficulty > 2 && seaTutorialIsPending(progress, activeProfile.id)) {
      beginSeaTutorial(next)
      return
    }
    if (next.difficulty !== countryTarget.difficulty) {
      setLevelTransition({
        from: countryTarget.difficulty,
        to: next.difficulty,
        total: countries.filter((country) => country.difficulty === next.difficulty).length,
      })
    }
    setCountryTarget(next)
    resetRoundState()
  }

  const nextTutorialRound = () => {
    if (gameMode === 'seas' && seaTutorialFinished) {
      localStorage.setItem(profileStorageKey(SEA_TUTORIAL_KEY, activeProfile.id), 'true')
      setGameMode('country')
      if (countries.every((country) => progress[country.iso2]?.encounters)) {
        setWrongAnswers([])
        setLastSelected(undefined)
        setAllCountriesCompleted(true)
        setIsCorrect(true)
        return
      }
      setLevelTransition({
        from: 2,
        to: countryTarget.difficulty,
        total: countries.filter((country) => country.difficulty === countryTarget.difficulty).length,
      })
      resetRoundState()
      return
    }

    if (gameMode === 'continents' && continentTutorialFinished) {
      localStorage.setItem(profileStorageKey(TUTORIAL_KEY, activeProfile.id), 'true')
      setGameMode('oceans')
      setOceanStep(0)
      resetRoundState()
      return
    }

    if (gameMode === 'oceans' && oceanTutorialFinished) {
      localStorage.setItem(profileStorageKey(OCEAN_TUTORIAL_KEY, activeProfile.id), 'true')
      if (seaTutorialIsPending(progress, activeProfile.id)) {
        setGameMode('seas')
        setSeaStep(0)
        resetRoundState()
        return
      }
      setGameMode('country')
      if (countries.every((country) => progress[country.iso2]?.encounters) && !reviewSession) {
        setWrongAnswers([])
        setLastSelected(undefined)
        setAllCountriesCompleted(true)
        setIsCorrect(true)
        return
      }
      resetRoundState()
      return
    }

    if (gameMode === 'continents') setTutorialStep((step) => step + 1)
    if (gameMode === 'oceans') setOceanStep((step) => step + 1)
    if (gameMode === 'seas') setSeaStep((step) => step + 1)
    resetRoundState()
  }

  if (screen === 'progress') {
    return (
      <ProgressView
        progress={progress}
        activeProfile={activeProfile}
        profiles={profiles}
        onClose={() => setScreen('game')}
        onSelectProfile={onSelectProfile}
        onCreateProfile={onCreateProfile}
        canInstallApp={canInstallApp}
        isAppInstalled={isAppInstalled}
        onInstallApp={onInstallApp}
      />
    )
  }

  const promptQuestion = gameMode === 'continents'
    ? continentQuestion(target.continentName)
    : gameMode === 'oceans'
      ? `Où se trouve ${oceanTarget.articleName} ?`
      : gameMode === 'seas'
        ? `Où se trouve ${seaTarget.articleName} ?`
      : fr.prompt

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#game" aria-label="GeoForMyKids, accueil du jeu">
          <span className="brand-mark" aria-hidden="true"><i /><b>G</b></span>
          <span><strong>GeoForMyKids</strong><small>{fr.brandTagline}</small></span>
        </a>

        <div className="topbar-actions">
          <div className="journey-count" aria-label={`${discoveredCount} pays découverts`}>
            <span>✦</span><div><strong>{discoveredCount}</strong><small>explorés</small></div>
          </div>
          <button className="planet-button" type="button" onClick={() => setScreen('progress')}>
            <Map size={18} />{fr.progress}<ChevronRight size={17} />
          </button>
        </div>
      </header>

      <main className="game-layout" id="game">
        <section className={`game-panel ${isCorrect ? 'has-result' : ''} ${lastWrongAnswer ? 'has-feedback' : ''}`}>
          {!isCorrect ? (
            <>
              {lastWrongAnswer ? (
                <div className="feedback-card is-active" aria-live="polite">
                  <span className="feedback-icon" aria-hidden="true"><Sparkles size={18} /></span>
                  <div>
                    <strong>Pas tout à fait ! Essaie encore.</strong>
                    <p>{gameMode !== 'country' ? <>Tu as choisi <b>{lastWrongAnswer.name}</b>.</> : 'Un nouvel indice vient de se débloquer.'}</p>
                  </div>
                </div>
              ) : null}

              {gameMode === 'country' && visibleHints.length ? (
                <section className="hints-panel" aria-labelledby="hints-title">
                  <div className="hints-heading">
                    <span><Lightbulb size={18} /><strong id="hints-title">{fr.hintTitle}</strong></span>
                    <small>{visibleHints.length} / {target.hints.length}</small>
                  </div>
                  <ol className="hint-list">
                    {visibleHints.map((hint, index) => (
                      <li key={hint}><span>{index + 1}</span><p>{hint}</p></li>
                    ))}
                  </ol>
                </section>
              ) : null}
            </>
          ) : gameMode !== 'country' ? (
            <section className="tutorial-success" aria-live="polite">
              <span className="tutorial-success-icon" aria-hidden="true">✦</span>
              <span className="eyebrow">{gameMode === 'continents' ? 'Continent découvert' : gameMode === 'oceans' ? 'Océan découvert' : 'Mer découverte'}</span>
              <h2>{gameMode === 'continents' ? target.continentName : gameMode === 'oceans' ? `Océan ${oceanTarget.name}` : `Mer ${seaTarget.name}`} !</h2>
              <p>Tu sais maintenant où se trouve <strong>{gameMode === 'continents' ? `l’${target.continentName}` : gameMode === 'oceans' ? oceanTarget.articleName : seaTarget.articleName}</strong> sur la carte.</p>
              {tutorialPhaseFinished ? (
                <div className="tutorial-finale">
                  {gameMode === 'continents'
                    ? 'Bravo ! Tu connais maintenant les six continents. Découvrons les cinq grands océans qui les séparent.'
                    : gameMode === 'oceans'
                      ? 'Bravo ! Tu connais maintenant les cinq grands océans. Partons à la recherche des pays !'
                      : 'Bravo ! Tu sais maintenant repérer huit mers essentielles. Le niveau 3 peut commencer !'}
                </div>
              ) : null}
              <button className="primary-button" type="button" onClick={nextTutorialRound} autoFocus>
                {gameMode === 'continents'
                  ? continentTutorialFinished ? 'Découvrir les océans' : 'Continent suivant'
                  : gameMode === 'oceans'
                    ? oceanTutorialFinished ? 'Chercher les pays' : 'Océan suivant'
                    : seaTutorialFinished ? 'Continuer vers le niveau 3' : 'Mer suivante'}<ArrowRight size={19} />
              </button>
            </section>
          ) : allCountriesCompleted ? (
            <section className="tutorial-success all-countries-success" aria-live="polite">
              <span className="tutorial-success-icon" aria-hidden="true">🌍</span>
              <span className="eyebrow">Voyage accompli</span>
              <h2>Quelle aventure !</h2>
              <p>Tu as découvert tous les pays disponibles dans cette première version de GeoForMyKids.</p>
              <button className="primary-button" type="button" onClick={() => setScreen('progress')}>Voir ma planète<ArrowRight size={19} /></button>
            </section>
          ) : (
            <SuccessCard
              country={target}
              appreciation={appreciation}
              remembered={remembered}
              onNext={nextCountryRound}
              nextLabel={replaySession
                ? replaySession.index === replaySession.queue.length - 1 ? `Revenir au niveau ${replaySession.returnLevel}` : 'Pays suivant à revoir'
                : reviewSession
                ? reviewSession.index === reviewSession.queue.length - 1 ? 'Terminer les révisions' : 'Révision suivante'
                : undefined}
            />
          )}
        </section>

        <section className="map-panel">
          {!isCorrect ? (
            <div className={`map-target-banner ${gameMode === 'country' ? 'is-country-mode' : ''} ${lastWrongAnswer ? 'has-wrong-choice' : ''}`}>
              {gameMode !== 'country' ? (
                <span className="map-target-globe" aria-hidden="true"><Globe2 size={29} /></span>
              ) : (
                <span className="map-target-flag" role="img" aria-label={`Drapeau de ${target.name}`}>{target.flag}</span>
              )}
              <div>
                <span className="eyebrow">{gameMode === 'continents'
                  ? `Niveau 0 · Continent ${tutorialStep + 1} sur ${continentTargets.length}`
                  : gameMode === 'oceans'
                    ? `Niveau 0 · Océan ${oceanStep + 1} sur ${oceans.length}`
                    : gameMode === 'seas'
                      ? `Niveau spécial · Mer ${seaStep + 1} sur ${seas.length}`
                    : replaySession
                      ? `Niveau ${replaySession.level} · Parcours libre`
                      : reviewSession
                      ? `Révision · Après le niveau ${reviewSession.completedLevel}`
                      : `Niveau ${target.difficulty} · ${countryLevelNames[target.difficulty]}`}</span>
                <h1>{gameMode === 'continents' ? target.continentName : gameMode === 'oceans' ? `Océan ${oceanTarget.name}` : gameMode === 'seas' ? `Mer ${seaTarget.name}` : target.name}</h1>
              </div>
              {gameMode === 'country' && lastWrongAnswer ? (
                <div className="map-wrong-choice" key={`${lastWrongAnswer.iso2}-${wrongAnswers.length}`} aria-live="polite">
                  <span role="img" aria-label={`Drapeau de ${lastWrongAnswer.name}`}>{flagFromIso(lastWrongAnswer.iso2)}</span>
                  <div><small>Tu as choisi</small><strong>{lastWrongAnswer.name}</strong></div>
                  <p>Observe le nouvel indice et réessaie.</p>
                </div>
              ) : gameMode !== 'country' ? (
                <div className="map-question-block">
                  <p>{promptQuestion}</p>
                  <div className="map-tutorial-progress" aria-label={gameMode === 'continents' ? `Continent ${tutorialStep + 1} sur ${continentTargets.length}` : gameMode === 'oceans' ? `Océan ${oceanStep + 1} sur ${oceans.length}` : `Mer ${seaStep + 1} sur ${seas.length}`}>
                    {(gameMode === 'continents' ? continentTargets : gameMode === 'oceans' ? oceans : seas).map((item, index) => (
                      <i key={'iso2' in item ? item.iso2 : item.code} className={index < (gameMode === 'continents' ? tutorialStep : gameMode === 'oceans' ? oceanStep : seaStep) ? 'is-done' : index === (gameMode === 'continents' ? tutorialStep : gameMode === 'oceans' ? oceanStep : seaStep) ? 'is-current' : ''} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : allCountriesCompleted ? (
            <div className="map-answer-banner"><span>🌍</span><strong>Tous les pays disponibles ont été découverts</strong></div>
          ) : (
            <div className="map-answer-banner">
              <span>{gameMode !== 'country' ? <Globe2 size={25} /> : target.flag}</span>
              <strong>{gameMode === 'continents' ? `${target.continentName} trouvée !` : gameMode === 'oceans' ? `Océan ${oceanTarget.name} trouvé !` : gameMode === 'seas' ? `Mer ${seaTarget.name} trouvée !` : `${target.name} trouvé !`}</strong>
            </div>
          )}

          <WorldMap
            gameMode={gameMode}
            targetIso={gameMode === 'oceans' ? oceanTarget.code : gameMode === 'seas' ? seaTarget.code : target.iso2}
            targetName={gameMode === 'oceans' ? `océan ${oceanTarget.name}` : gameMode === 'seas' ? `mer ${seaTarget.name}` : target.name}
            targetLabel={gameMode === 'oceans' ? [0, 0] : gameMode === 'seas' ? seaTarget.center : target.label}
            targetContinent={gameMode === 'oceans' || gameMode === 'seas' ? 'EU' : target.continent}
            targetOcean={gameMode === 'oceans' ? oceanTarget.code : undefined}
            targetSea={gameMode === 'seas' ? seaTarget.code : undefined}
            hintLevel={visibleHints.length}
            lastSelectedIso={lastSelected}
            isCorrect={isCorrect && !allCountriesCompleted}
            disabled={isCorrect || allCountriesCompleted || Boolean(levelTransition)}
            levelProgress={gameMode === 'country' && !allCountriesCompleted ? {
              level: replaySession?.level ?? reviewSession?.completedLevel ?? target.difficulty,
              name: replaySession ? `Niveau ${replaySession.level} à refaire` : reviewSession ? 'Pays à réviser' : countryLevelNames[target.difficulty],
              completed: replaySession
                ? replaySession.index + (isCorrect ? 1 : 0)
                : reviewSession
                  ? reviewSession.index + (isCorrect ? 1 : 0)
                  : targetTierDiscovered,
              total: replaySession ? replaySession.queue.length : reviewSession ? reviewSession.queue.length : targetTierCountries.length,
              label: replaySession
                ? `Progression du niveau ${replaySession.level} rejoué`
                : reviewSession
                  ? `Progression des révisions du niveau ${reviewSession.completedLevel}`
                  : undefined,
              selectable: Boolean(replaySession) || (!isCorrect && replayableLevels.length > 0),
            } : undefined}
            onSelect={submitAnswer}
            onSelectOcean={submitOceanAnswer}
            onSelectSea={submitSeaAnswer}
            onLevelProgressClick={() => setShowLevelPicker(true)}
          />

          {isCorrect && !allCountriesCompleted ? (
            <div className={`success-celebration ${tutorialPhaseFinished ? 'is-level-finale' : ''}`} aria-hidden="true">
              {Array.from({ length: tutorialPhaseFinished ? 28 : isCountryMilestone ? 24 : 16 }, (_, index) => <i key={index} className={`particle particle-${(index % 12) + 1}`} />)}
            </div>
          ) : null}

          {isCorrect && tutorialPhaseFinished ? (
            <div className="level-finale-visual" aria-hidden="true">
              <div className="finale-rays" />
              <div className="finale-orbit"><span>{gameMode === 'continents' ? '🌍' : '🌊'}</span><i>✦</i><b>✦</b></div>
              <strong>{gameMode === 'continents' ? 'Les 6 continents découverts !' : gameMode === 'oceans' ? 'Les 5 océans découverts !' : 'Les 8 mers découvertes !'}</strong>
            </div>
          ) : null}

          {isCountryMilestone && !allCountriesCompleted ? (
            <div className="country-milestone-visual" aria-live="polite">
              <div className="milestone-medal"><span>★</span><i /></div>
              <strong>{discoveredCount} pays trouvés !</strong>
              <p>Bravo, ta planète se remplit.</p>
            </div>
          ) : null}
        </section>
      </main>

      <footer className="game-footer">
        <span>{gameMode === 'continents'
          ? 'Commence par les continents, puis découvre les océans.'
          : gameMode === 'oceans'
            ? 'Repère les cinq grands océans avant de partir à la recherche des pays.'
            : gameMode === 'seas'
              ? 'Repère les grandes mers qui t’aideront à situer les prochains pays.'
            : 'Une erreur révèle un indice — il n’y a jamais de mauvaise partie.'}</span>
        <button type="button" onClick={() => setScreen('progress')}>{masteredCount} pays bien connus</button>
      </footer>

      {showLevelPicker ? (
        <div className="level-picker-overlay" role="dialog" aria-modal="true" aria-labelledby="level-picker-title" onClick={() => setShowLevelPicker(false)}>
          <section className="level-picker-card" onClick={(event) => event.stopPropagation()}>
            <span className="level-picker-icon" aria-hidden="true"><RotateCcw size={25} /></span>
            <span className="eyebrow">Parcours libre</span>
            <h2 id="level-picker-title">Choisir un niveau</h2>
            <p>Choisis une étape déjà terminée. Si un pays te pose de nouveau problème, il sera ajouté à « À réviser ».</p>
            <div className="level-picker-grid">
              {replaySession ? (
                <button className="is-current-journey" type="button" aria-label={`Revenir au niveau ${replaySession.returnLevel}`} onClick={returnToCurrentJourney}>
                  <span>Parcours en cours</span>
                  <strong>Niveau {replaySession.returnLevel} · {countryLevelNames[replaySession.returnLevel]}</strong>
                  <small>Reprendre là où tu t’étais arrêté</small>
                </button>
              ) : null}
              {replayableLevels.map((difficulty) => {
                const total = countries.filter((country) => country.difficulty === difficulty).length
                return (
                  <button className={replaySession?.level === difficulty ? 'is-replayed' : ''} type="button" key={difficulty} aria-label={`Refaire le niveau ${difficulty}`} onClick={() => startLevelReplay(difficulty)}>
                    <span>Niveau {difficulty}</span>
                    <strong>{countryLevelNames[difficulty]}</strong>
                    <small>{total} pays</small>
                  </button>
                )
              })}
            </div>
            <button className="text-button level-picker-cancel" type="button" onClick={() => setShowLevelPicker(false)}>Annuler</button>
          </section>
        </div>
      ) : null}

      {levelTransition ? (
        <div className="level-transition-overlay" role="dialog" aria-modal="true" aria-labelledby="level-transition-title">
          <div className="level-transition-rays" aria-hidden="true" />
          {Array.from({ length: 36 }, (_, index) => <i key={index} className={`level-transition-particle particle-${(index % 12) + 1}`} aria-hidden="true" />)}
          <section className="level-transition-card">
            <span className="eyebrow">Niveau {levelTransition.from} terminé !</span>
            <div className="level-transition-badge" aria-hidden="true"><small>NIVEAU</small><strong>{levelTransition.to}</strong><i>✦</i></div>
            <h2 id="level-transition-title">Niveau {levelTransition.to} débloqué !</h2>
            <h3>{countryLevelNames[levelTransition.to]}</h3>
            <p>{levelTransition.total} nouveaux pays t’attendent dans cette étape.</p>
            <div className="level-transition-path" aria-hidden="true"><span>{levelTransition.from} ✓</span><i /><strong>{levelTransition.to}</strong></div>
            <button className="primary-button" type="button" autoFocus onClick={() => setLevelTransition(undefined)}>
              C’est parti !<ArrowRight size={19} />
            </button>
          </section>
        </div>
      ) : null}
    </div>
  )
}
