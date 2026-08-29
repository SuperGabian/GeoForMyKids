import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ChevronRight, Globe2, Lightbulb, Map, RotateCcw, Sparkles, Users } from 'lucide-react'
import { WorldMap } from './components/WorldMap'
import { SuccessCard } from './components/SuccessCard'
import { CountryFlag } from './components/CountryFlag'
import { FranceMap } from './components/FranceMap'
import { ProgressView, type CountryProgress, type FoundationProgress, type ProgressItem } from './components/ProgressView'
import {
  continentLabels,
  countries,
  countryByIso,
  countryDifficultyLevels,
  countryLevelNames,
  type ContinentCode,
  type Country,
} from './data/countries'
import { oceans, type OceanCode } from './data/oceans'
import { seas, type SeaCode } from './data/seas'
import {
  DEFAULT_FRENCH_REGION_CODE,
  departmentsForRegion,
  frenchRegions,
  frenchRegionByCode,
  type FrenchArea,
} from './data/france'
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
const TUTORIAL_KEY = 'globidoo.tutorial.completed.v2'
const OCEAN_TUTORIAL_KEY = 'globidoo.ocean-tutorial.completed.v1'
const SEA_TUTORIAL_KEY = 'globidoo.sea-tutorial.completed.v1'
const FOUNDATION_PROGRESS_KEY = 'globidoo.foundations.progress.v1'
const PREFERRED_REGION_KEY = 'globidoo.france.preferred-region.v1'
const REGION_TUTORIAL_KEY = 'globidoo.france-regions.completed.v1'
const DEPARTMENT_TUTORIAL_KEY = 'globidoo.france-departments.completed.v1'

type TutorialContinentCode = ContinentCode | 'AN'
type ContinentTarget = {
  iso2: string
  name: string
  continent: TutorialContinentCode
  continentName: string
  label: [number, number]
  population: string
  fact: string
}

const continentDetails: Record<TutorialContinentCode, Pick<ContinentTarget, 'population' | 'fact'>> = {
  EU: {
    population: 'Environ 744 millions',
    fact: 'L’Europe et l’Asie forment une seule immense masse terrestre appelée Eurasie. Leur frontière est une convention géographique.',
  },
  AS: {
    population: 'Environ 4,84 milliards',
    fact: 'Les quatorze plus hautes montagnes de la planète se trouvent toutes en Asie.',
  },
  AF: {
    population: 'Environ 1,55 milliard',
    fact: 'L’Afrique est le berceau de l’humanité. C’est sur ce continent que l’homo sapiens a évolué il y a environ 300 000 ans.',
  },
  OC: {
    population: 'Environ 47 millions',
    fact: 'L’Océanie réunit l’Australie, qui est en fait un continent à part entière, et des milliers d’îles dispersées dans l’océan Pacifique.',
  },
  NA: {
    population: 'Environ 1,06 milliard sur l’ensemble de l’Amérique',
    fact: 'L’Amérique s’étire des régions arctiques jusqu’aux portes de l’Antarctique et traverse presque toutes les zones climatiques.',
  },
  SA: {
    population: 'Environ 1,06 milliard sur l’ensemble de l’Amérique',
    fact: 'L’Amérique s’étire des régions arctiques jusqu’aux portes de l’Antarctique et traverse presque toutes les zones climatiques.',
  },
  AN: {
    population: 'Aucun habitant permanent',
    fact: 'L’Antarctique est le continent le plus froid, le plus sec et le plus venteux de la planète.',
  },
}

const continentTargets: ContinentTarget[] = [
  ...['FR', 'JP', 'EG', 'AU', 'US', 'BR'].map((iso2) => {
    const country = countryByIso[iso2]
    return {
      iso2: country.iso2,
      name: country.name,
      continent: country.continent,
      continentName: country.continentName,
      label: country.label,
      ...continentDetails[country.continent],
    }
  }),
  {
    iso2: 'AQ',
    name: 'Antarctique',
    continent: 'AN',
    continentName: 'Antarctique',
    label: [0, -80],
    ...continentDetails.AN,
  },
]

type GameMode = 'continents' | 'oceans' | 'seas' | 'country' | 'regions' | 'departments'
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
type FoundationReview = {
  mode: 'continents' | 'oceans'
  queue: number[]
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

function loadFoundationProgress(profileId: string): FoundationProgress {
  try {
    const storageKey = profileStorageKey(FOUNDATION_PROGRESS_KEY, profileId)
    const saved = localStorage.getItem(storageKey)
    if (saved) return JSON.parse(saved) as FoundationProgress

    const migrated: FoundationProgress = {}
    if (localStorage.getItem(profileStorageKey(TUTORIAL_KEY, profileId)) === 'true') {
      for (const code of ['EU', 'AS', 'AF', 'OC', 'NA', 'SA', 'AN']) {
        migrated[`continent:${code}`] = { encounters: 1, stage: 3, needsReview: false }
      }
    }
    if (localStorage.getItem(profileStorageKey(OCEAN_TUTORIAL_KEY, profileId)) === 'true') {
      for (const ocean of oceans) migrated[`ocean:${ocean.code}`] = { encounters: 1, stage: 3, needsReview: false }
    }
    if (Object.keys(migrated).length) localStorage.setItem(storageKey, JSON.stringify(migrated))
    return migrated
  } catch {
    return {}
  }
}

function loadPreferredRegion(profileId: string) {
  try {
    const saved = localStorage.getItem(profileStorageKey(PREFERRED_REGION_KEY, profileId))
    return saved && frenchRegionByCode[saved] ? saved : DEFAULT_FRENCH_REGION_CODE
  } catch {
    return DEFAULT_FRENCH_REGION_CODE
  }
}

function progressAfterAnswer(previous: ProgressItem | undefined, wrongAnswerCount: number, forceReviewOnMistake = false): ProgressItem {
  const struggled = forceReviewOnMistake ? wrongAnswerCount > 0 : wrongAnswerCount >= 2
  return {
    encounters: (previous?.encounters ?? 0) + 1,
    stage: wrongAnswerCount === 0 ? Math.max(3, previous?.stage ?? 0) : wrongAnswerCount === 1 ? Math.min(2, previous?.stage ?? 2) : 1,
    needsReview: struggled,
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

function pendingFoundationReview(foundationProgress: FoundationProgress, profileId: string, isAdmin = false): FoundationReview | undefined {
  if (isAdmin) return undefined
  try {
    if (localStorage.getItem(profileStorageKey(TUTORIAL_KEY, profileId)) === 'true') {
      const continentQueue = continentTargets.flatMap((item, index) => (
        foundationProgress[`continent:${item.continent}`]?.needsReview ? [index] : []
      ))
      if (continentQueue.length) return { mode: 'continents', queue: continentQueue, index: 0 }
    }
    if (localStorage.getItem(profileStorageKey(OCEAN_TUTORIAL_KEY, profileId)) === 'true') {
      const oceanQueue = oceans.flatMap((item, index) => (
        foundationProgress[`ocean:${item.code}`]?.needsReview ? [index] : []
      ))
      if (oceanQueue.length) return { mode: 'oceans', queue: oceanQueue, index: 0 }
    }
  } catch {
    return undefined
  }
  return undefined
}

function initialMode(progress: CountryProgress, foundationProgress: FoundationProgress, profileId: string, isAdmin = false): GameMode {
  try {
    if (isAdmin) return 'country'
    if (localStorage.getItem(profileStorageKey(TUTORIAL_KEY, profileId)) !== 'true') return 'continents'
    if (localStorage.getItem(profileStorageKey(OCEAN_TUTORIAL_KEY, profileId)) !== 'true') return 'oceans'
    const foundationReview = pendingFoundationReview(foundationProgress, profileId)
    if (foundationReview) return foundationReview.mode
    if (seaTutorialIsPending(progress, profileId)) return 'seas'
    const unseen = countries.filter((country) => !progress[country.iso2]?.encounters)
    const completedLevel = unseen.length ? Math.max(0, Math.min(...unseen.map((country) => country.difficulty)) - 1) : countryDifficultyLevels.at(-1)!
    if (completedLevel > 0 && countriesDueForReview(progress, completedLevel as Country['difficulty']).length) return 'country'
    const firstThreeLevelsCompleted = countries.filter((country) => country.difficulty <= 3).every((country) => progress[country.iso2]?.encounters)
    if (firstThreeLevelsCompleted && localStorage.getItem(profileStorageKey(REGION_TUTORIAL_KEY, profileId)) !== 'true') return 'regions'
    const firstFourLevelsCompleted = countries.filter((country) => country.difficulty <= 4).every((country) => progress[country.iso2]?.encounters)
    if (firstFourLevelsCompleted && localStorage.getItem(profileStorageKey(DEPARTMENT_TUTORIAL_KEY, profileId)) !== 'true') return 'departments'
    return 'country'
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

function continentProgressNumber(step: number) {
  if (step < 4) return step + 1
  if (step < 6) return 5
  return 6
}

type ProfileGameProps = {
  activeProfile: PlayerProfile
  profiles: PlayerProfile[]
  onSelectProfile: (profileId: string) => void
  onCreateProfile: (name: string) => void
  onRenameProfile: (profileId: string, name: string) => void
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

  const renameProfile = (profileId: string, rawName: string) => {
    const name = rawName.trim().slice(0, 30)
    if (!name || !profileRegistry.profiles.some((profile) => profile.id === profileId)) return
    const profiles = profileRegistry.profiles.map((profile) => (
      profile.id === profileId ? { ...profile, name } : profile
    ))
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
    setProfileRegistry((registry) => ({ ...registry, profiles }))
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
      key={`${activeProfile.id}:${activeProfile.name.trim().toLocaleLowerCase('fr') === 'admin' ? 'admin' : 'player'}`}
      activeProfile={activeProfile}
      profiles={profileRegistry.profiles}
      onSelectProfile={selectProfile}
      onCreateProfile={createProfile}
      onRenameProfile={renameProfile}
      canInstallApp={Boolean(installPrompt)}
      isAppInstalled={isAppInstalled}
      onInstallApp={installApp}
    />
  )
}

function ProfileGame({ activeProfile, profiles, onSelectProfile, onCreateProfile, onRenameProfile, canInstallApp, isAppInstalled, onInstallApp }: ProfileGameProps) {
  const isAdmin = activeProfile.name.trim().toLocaleLowerCase('fr') === 'admin'
  const [screen, setScreen] = useState<'game' | 'progress'>('game')
  const [progress, setProgress] = useState<CountryProgress>(() => loadProgress(activeProfile.id))
  const [foundationProgress, setFoundationProgress] = useState<FoundationProgress>(() => loadFoundationProgress(activeProfile.id))
  const [preferredRegionCode, setPreferredRegionCode] = useState(() => loadPreferredRegion(activeProfile.id))
  const [gameMode, setGameMode] = useState<GameMode>(() => initialMode(progress, foundationProgress, activeProfile.id, isAdmin))
  const [journeyStart] = useState(() => createJourneyStart(progress))
  const initiallyCompleted = gameMode === 'country'
    && countries.every((country) => progress[country.iso2]?.encounters)
    && !journeyStart.reviewSession
  const [tutorialStep, setTutorialStep] = useState(0)
  const [oceanStep, setOceanStep] = useState(0)
  const [seaStep, setSeaStep] = useState(0)
  const [regionStep, setRegionStep] = useState(0)
  const [departmentStep, setDepartmentStep] = useState(0)
  const [foundationReview, setFoundationReview] = useState<FoundationReview | undefined>(() => pendingFoundationReview(foundationProgress, activeProfile.id, isAdmin))
  const [specialIsReplay, setSpecialIsReplay] = useState(false)
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

  const continentTargetIndex = foundationReview?.mode === 'continents' ? foundationReview.queue[foundationReview.index] : tutorialStep
  const oceanTargetIndex = foundationReview?.mode === 'oceans' ? foundationReview.queue[foundationReview.index] : oceanStep
  const continentTarget = continentTargets[continentTargetIndex]
  const oceanTarget = oceans[oceanTargetIndex]
  const seaTarget = seas[seaStep]
  const preferredRegion = frenchRegionByCode[preferredRegionCode] ?? frenchRegionByCode[DEFAULT_FRENCH_REGION_CODE]
  const departmentTargets = departmentsForRegion(preferredRegion.code)
  const regionTarget = frenchRegions[regionStep]
  const departmentTarget = departmentTargets[departmentStep]
  const visibleHints = gameMode === 'country' ? countryTarget.hints.slice(0, wrongAnswers.length) : []
  const lastWrongAnswer = wrongAnswers.at(-1)
  const continentTutorialFinished = gameMode === 'continents' && !foundationReview && tutorialStep === continentTargets.length - 1
  const oceanTutorialFinished = gameMode === 'oceans' && !foundationReview && oceanStep === oceans.length - 1
  const seaTutorialFinished = gameMode === 'seas' && seaStep === seas.length - 1
  const regionTutorialFinished = gameMode === 'regions' && regionStep === frenchRegions.length - 1
  const departmentTutorialFinished = gameMode === 'departments' && departmentStep === departmentTargets.length - 1
  const tutorialPhaseFinished = continentTutorialFinished || oceanTutorialFinished || seaTutorialFinished || regionTutorialFinished || departmentTutorialFinished
  const oceansAlreadyKnown = gameMode === 'continents'
    && localStorage.getItem(profileStorageKey(OCEAN_TUTORIAL_KEY, activeProfile.id)) === 'true'

  const discoveredCount = useMemo(
    () => Object.values(progress).filter((item) => item.encounters > 0).length,
    [progress],
  )
  const masteredCount = useMemo(
    () => Object.values(progress).filter((item) => item.stage >= 3 && !item.needsReview).length,
    [progress],
  )
  const isCountryMilestone = gameMode === 'country' && !reviewSession && !replaySession && isCorrect && discoveredCount > 0 && discoveredCount % 5 === 0
  const targetTierCountries = countries.filter((country) => country.difficulty === countryTarget.difficulty)
  const targetTierDiscovered = targetTierCountries.filter((country) => progress[country.iso2]?.encounters).length
  const activeJourneyLevel = reviewSession?.completedLevel ?? replaySession?.returnLevel ?? countryTarget.difficulty
  const replayableLevels = countryDifficultyLevels.filter((difficulty) => (
    isAdmin || (
      difficulty < activeJourneyLevel
      && countries
        .filter((country) => country.difficulty === difficulty)
        .every((country) => progress[country.iso2]?.encounters)
    )
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

  const changePreferredRegion = (regionCode: string) => {
    if (!frenchRegionByCode[regionCode]) return
    localStorage.setItem(profileStorageKey(PREFERRED_REGION_KEY, activeProfile.id), regionCode)
    setPreferredRegionCode(regionCode)
    setDepartmentStep(0)
  }

  const beginSeaTutorial = (nextCountry: Country) => {
    setCountryTarget(nextCountry)
    setReviewSession(undefined)
    setSeaStep(0)
    setGameMode('seas')
    resetRoundState()
  }

  const beginFranceTutorial = (mode: 'regions' | 'departments', nextCountry: Country, replay = false) => {
    setCountryTarget(nextCountry)
    setReviewSession(undefined)
    setSpecialIsReplay(replay)
    if (mode === 'regions') setRegionStep(0)
    if (mode === 'departments') setDepartmentStep(0)
    setGameMode(mode)
    setShowLevelPicker(false)
    resetRoundState()
  }

  const beginPendingFranceTutorial = (completedLevel: Country['difficulty'], nextCountry: Country) => {
    if (completedLevel === 3
      && nextCountry.difficulty > 3
      && localStorage.getItem(profileStorageKey(REGION_TUTORIAL_KEY, activeProfile.id)) !== 'true') {
      beginFranceTutorial('regions', nextCountry)
      return true
    }
    if (completedLevel === 4
      && nextCountry.difficulty > 4
      && localStorage.getItem(profileStorageKey(DEPARTMENT_TUTORIAL_KEY, activeProfile.id)) !== 'true') {
      beginFranceTutorial('departments', nextCountry)
      return true
    }
    return false
  }

  const beginFranceCatchUp = (nextCountry: Country) => {
    const firstThreeLevelsCompleted = countries
      .filter((country) => country.difficulty <= 3)
      .every((country) => progress[country.iso2]?.encounters)
    if (firstThreeLevelsCompleted
      && localStorage.getItem(profileStorageKey(REGION_TUTORIAL_KEY, activeProfile.id)) !== 'true') {
      beginFranceTutorial('regions', nextCountry)
      return true
    }

    const firstFourLevelsCompleted = countries
      .filter((country) => country.difficulty <= 4)
      .every((country) => progress[country.iso2]?.encounters)
    if (firstFourLevelsCompleted
      && localStorage.getItem(profileStorageKey(DEPARTMENT_TUTORIAL_KEY, activeProfile.id)) !== 'true') {
      beginFranceTutorial('departments', nextCountry)
      return true
    }
    return false
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

  const saveFoundationAnswer = (key: string) => {
    const nextProgress = {
      ...foundationProgress,
      [key]: progressAfterAnswer(foundationProgress[key], wrongAnswers.length, true),
    }
    setFoundationProgress(nextProgress)
    localStorage.setItem(profileStorageKey(FOUNDATION_PROGRESS_KEY, activeProfile.id), JSON.stringify(nextProgress))
  }

  const submitAnswer = (iso2: string, name: string, selectedContinent: ContinentCode | 'AN') => {
    if (isCorrect) return
    setLastSelected(iso2)

    if (gameMode === 'continents') {
      if (selectedContinent !== continentTarget.continent) {
        setWrongAnswers((answers) => [...answers, {
          iso2,
          name: selectedContinent === 'AN' ? name : continentLabels[selectedContinent],
          continent: selectedContinent,
        }])
        return
      }

      saveFoundationAnswer(`continent:${continentTarget.continent}`)
      setAppreciation('Bravo !')
      setIsCorrect(true)
      return
    }

    if (gameMode === 'oceans' || gameMode === 'seas') return

    if (iso2 !== countryTarget.iso2) {
      setWrongAnswers((answers) => [...answers, { iso2, name, continent: selectedContinent }])
      return
    }

    const elapsedSeconds = (performance.now() - startedAt.current) / 1000
    const quality = qualityFor(wrongAnswers.length, elapsedSeconds)
    const previous = progress[countryTarget.iso2]
    const struggled = wrongAnswers.length >= 2
    const isScheduledReview = Boolean(reviewSession && !replaySession)
    const reviewNeedsAnotherPass = isScheduledReview && wrongAnswers.length > 0
    const needsReview = isScheduledReview ? reviewNeedsAnotherPass : Boolean(previous?.needsReview || struggled)
    const nextReviewLevel = isScheduledReview
      ? reviewNeedsAnotherPass ? reviewSession!.completedLevel + 1 : undefined
      : struggled ? replaySession?.returnLevel ?? countryTarget.difficulty : previous?.nextReviewLevel
    const nextStage = wrongAnswers.length === 0
      ? Math.max(3, previous?.stage ?? 0)
      : wrongAnswers.length === 1
        ? Math.min(2, previous?.stage ?? 2)
        : 1
    const nextProgress = {
      ...progress,
      [countryTarget.iso2]: {
        encounters: (previous?.encounters ?? 0) + 1,
        stage: nextStage,
        needsReview,
        nextReviewLevel,
      },
    }

    setRemembered(Boolean(previous && wrongAnswers.length === 0))
    setAppreciation(isScheduledReview
      ? reviewNeedsAnotherPass ? 'On y reviendra !' : 'C’est acquis !'
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

    saveFoundationAnswer(`ocean:${oceanTarget.code}`)
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

  const submitFrenchArea = (area: FrenchArea) => {
    if (isCorrect || (gameMode !== 'regions' && gameMode !== 'departments')) return
    const target = gameMode === 'regions' ? regionTarget : departmentTarget
    setLastSelected(area.code)
    if (area.code !== target.code) {
      setWrongAnswers((answers) => [...answers, { iso2: area.code, name: area.name, continent: 'EU' }])
      return
    }
    setAppreciation(wrongAnswers.length ? 'Bien joué !' : 'Excellent !')
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
      if (beginPendingFranceTutorial(completedLevel, next)) return
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
    if (beginPendingFranceTutorial(countryTarget.difficulty, next)) return
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

  const startFoundationReviews = (mode: 'continents' | 'oceans') => {
    const dueIndexes = mode === 'continents'
      ? continentTargets.flatMap((item, index) => foundationProgress[`continent:${item.continent}`]?.needsReview ? [index] : [])
      : oceans.flatMap((item, index) => foundationProgress[`ocean:${item.code}`]?.needsReview ? [index] : [])
    if (!dueIndexes.length) return false
    setFoundationReview({ mode, queue: dueIndexes, index: 0 })
    resetRoundState()
    return true
  }

  const finishContinentJourney = () => {
    localStorage.setItem(profileStorageKey(TUTORIAL_KEY, activeProfile.id), 'true')
    if (oceansAlreadyKnown) {
      const oceanQueue = oceans.flatMap((item, index) => foundationProgress[`ocean:${item.code}`]?.needsReview ? [index] : [])
      if (oceanQueue.length) {
        setGameMode('oceans')
        setFoundationReview({ mode: 'oceans', queue: oceanQueue, index: 0 })
        resetRoundState()
        return
      }
      if (seaTutorialIsPending(progress, activeProfile.id)) {
        setGameMode('seas')
        setSeaStep(0)
      } else if (beginFranceCatchUp(countryTarget)) {
        return
      } else {
        setGameMode('country')
        if (countries.every((country) => progress[country.iso2]?.encounters) && !reviewSession) {
          setWrongAnswers([])
          setLastSelected(undefined)
          setAllCountriesCompleted(true)
          setIsCorrect(true)
          return
        }
      }
      resetRoundState()
      return
    }
    setGameMode('oceans')
    setOceanStep(0)
    resetRoundState()
  }

  const finishOceanJourney = () => {
    localStorage.setItem(profileStorageKey(OCEAN_TUTORIAL_KEY, activeProfile.id), 'true')
    if (seaTutorialIsPending(progress, activeProfile.id)) {
      setGameMode('seas')
      setSeaStep(0)
    } else if (beginFranceCatchUp(countryTarget)) {
      return
    } else {
      setGameMode('country')
      if (countries.every((country) => progress[country.iso2]?.encounters) && !reviewSession) {
        setWrongAnswers([])
        setLastSelected(undefined)
        setAllCountriesCompleted(true)
        setIsCorrect(true)
        return
      }
    }
    resetRoundState()
  }

  const nextTutorialRound = () => {
    if (gameMode === 'regions' || gameMode === 'departments') {
      const finished = gameMode === 'regions' ? regionTutorialFinished : departmentTutorialFinished
      if (!finished) {
        if (gameMode === 'regions') setRegionStep((step) => step + 1)
        else setDepartmentStep((step) => step + 1)
        resetRoundState()
        return
      }

      const completedLevel = gameMode === 'regions' ? 3 : 4
      localStorage.setItem(profileStorageKey(gameMode === 'regions' ? REGION_TUTORIAL_KEY : DEPARTMENT_TUTORIAL_KEY, activeProfile.id), 'true')
      if (gameMode === 'regions' && !specialIsReplay) {
        const firstFourLevelsCompleted = countries
          .filter((country) => country.difficulty <= 4)
          .every((country) => progress[country.iso2]?.encounters)
        if (firstFourLevelsCompleted
          && localStorage.getItem(profileStorageKey(DEPARTMENT_TUTORIAL_KEY, activeProfile.id)) !== 'true') {
          beginFranceTutorial('departments', countryTarget)
          return
        }
      }
      setGameMode('country')
      if (!specialIsReplay && countries.every((country) => progress[country.iso2]?.encounters)) {
        setWrongAnswers([])
        setLastSelected(undefined)
        setAllCountriesCompleted(true)
        setIsCorrect(true)
        setSpecialIsReplay(false)
        return
      }
      if (!specialIsReplay && countryTarget.difficulty === completedLevel + 1) {
        setLevelTransition({
          from: completedLevel as Country['difficulty'],
          to: countryTarget.difficulty,
          total: countries.filter((country) => country.difficulty === countryTarget.difficulty).length,
        })
      }
      setSpecialIsReplay(false)
      resetRoundState()
      return
    }

    if (foundationReview) {
      const nextReviewIndex = foundationReview.index + 1
      if (nextReviewIndex < foundationReview.queue.length) {
        setFoundationReview({ ...foundationReview, index: nextReviewIndex })
        resetRoundState()
        return
      }
      const completedMode = foundationReview.mode
      setFoundationReview(undefined)
      if (completedMode === 'continents') finishContinentJourney()
      else finishOceanJourney()
      return
    }

    if (gameMode === 'seas' && seaTutorialFinished) {
      localStorage.setItem(profileStorageKey(SEA_TUTORIAL_KEY, activeProfile.id), 'true')
      setGameMode('country')
      if (beginFranceCatchUp(countryTarget)) return
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
      if (startFoundationReviews('continents')) return
      finishContinentJourney()
      return
    }

    if (gameMode === 'oceans' && oceanTutorialFinished) {
      if (startFoundationReviews('oceans')) return
      finishOceanJourney()
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
        foundationProgress={foundationProgress}
        preferredRegionCode={preferredRegionCode}
        activeProfile={activeProfile}
        profiles={profiles}
        onClose={() => setScreen('game')}
        onSelectProfile={onSelectProfile}
        onCreateProfile={onCreateProfile}
        onRenameProfile={onRenameProfile}
        onPreferredRegionChange={changePreferredRegion}
        canInstallApp={canInstallApp}
        isAppInstalled={isAppInstalled}
        onInstallApp={onInstallApp}
      />
    )
  }

  const promptQuestion = gameMode === 'continents'
    ? continentQuestion(continentTarget.continentName)
    : gameMode === 'oceans'
      ? `Où se trouve ${oceanTarget.articleName} ?`
      : gameMode === 'seas'
        ? `Où se trouve ${seaTarget.articleName} ?`
        : gameMode === 'regions'
          ? `Où se trouve la région ${regionTarget.name} ?`
          : gameMode === 'departments'
            ? `Où se trouve le département ${departmentTarget.name} ?`
            : fr.prompt
  const franceMode = gameMode === 'regions' || gameMode === 'departments'
  const learningTargetName = gameMode === 'continents'
    ? continentTarget.continentName
    : gameMode === 'oceans'
      ? `Océan ${oceanTarget.name}`
      : gameMode === 'seas'
        ? `Mer ${seaTarget.name}`
        : gameMode === 'regions'
          ? regionTarget.name
          : gameMode === 'departments'
            ? departmentTarget.name
            : countryTarget.name
  const learningStep = foundationReview
    ? foundationReview.index
    : gameMode === 'continents' ? tutorialStep : gameMode === 'oceans' ? oceanStep : gameMode === 'seas' ? seaStep : gameMode === 'regions' ? regionStep : departmentStep
  const learningTotal = foundationReview
    ? foundationReview.queue.length
    : gameMode === 'continents' ? continentTargets.length : gameMode === 'oceans' ? oceans.length : gameMode === 'seas' ? seas.length : gameMode === 'regions' ? frenchRegions.length : departmentTargets.length
  const continentsNeedReview = continentTargets.some((item) => foundationProgress[`continent:${item.continent}`]?.needsReview)
  const oceansNeedReview = oceans.some((item) => foundationProgress[`ocean:${item.code}`]?.needsReview)
  const nextLearningLabel = foundationReview
    ? foundationReview.index === foundationReview.queue.length - 1 ? 'Terminer les révisions' : 'Révision suivante'
    : gameMode === 'continents'
      ? continentTutorialFinished ? continentsNeedReview ? 'Réviser les continents' : oceansAlreadyKnown ? 'Continuer l’aventure' : 'Découvrir les océans' : 'Continent suivant'
      : gameMode === 'oceans'
        ? oceanTutorialFinished ? oceansNeedReview ? 'Réviser les océans' : 'Chercher les pays' : 'Océan suivant'
        : gameMode === 'seas'
          ? seaTutorialFinished ? 'Continuer vers le niveau 3' : 'Mer suivante'
          : gameMode === 'regions'
            ? regionTutorialFinished ? 'Continuer vers le niveau 4' : 'Région suivante'
            : departmentTutorialFinished ? 'Continuer vers le niveau 5' : 'Département suivant'

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
          {isAdmin ? <span className="admin-badge">Mode Admin</span> : null}
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
                    <small>{visibleHints.length} / {countryTarget.hints.length}</small>
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
              <span className="eyebrow">{foundationReview ? 'Révision réussie' : gameMode === 'continents' ? 'Continent découvert' : gameMode === 'oceans' ? 'Océan découvert' : gameMode === 'seas' ? 'Mer découverte' : gameMode === 'regions' ? 'Région découverte' : 'Département découvert'}</span>
              <h2>{learningTargetName} !</h2>
              <p>Tu sais maintenant où se trouve <strong>{learningTargetName}</strong> sur la carte.</p>
              {gameMode === 'continents' ? (
                <div className="continent-discovery-details">
                  <div className="continent-population">
                    <span aria-hidden="true"><Users size={18} /></span>
                    <div>
                      <small>Population</small>
                      <strong>{continentTarget.population}</strong>
                      <em>{continentTarget.continent === 'AN' ? 'Des scientifiques y séjournent temporairement.' : 'Estimation ONU · 2025'}</em>
                    </div>
                  </div>
                  <div className="tutorial-fact">
                    <Lightbulb size={18} aria-hidden="true" />
                    <div>
                      <strong>Le savais-tu ?</strong>
                      <p>{continentTarget.fact}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              {gameMode === 'oceans' || gameMode === 'seas' ? (
                <div className="tutorial-fact is-standalone">
                  <Lightbulb size={18} aria-hidden="true" />
                  <div>
                    <strong>Le savais-tu ?</strong>
                    <p>{gameMode === 'oceans' ? oceanTarget.fact : seaTarget.fact}</p>
                  </div>
                </div>
              ) : null}
              {gameMode === 'continents' && (continentTarget.continent === 'NA' || continentTarget.continent === 'SA') ? (
                <div className="continent-learning-note">
                  <strong>À retenir : une seule Amérique</strong>
                  <p>L’Amérique du Nord et l’Amérique du Sud sont deux grandes parties d’un même continent : <b>l’Amérique</b>.</p>
                </div>
              ) : null}
              {tutorialPhaseFinished ? (
                <div className="tutorial-finale">
                  {gameMode === 'continents'
                    ? oceansAlreadyKnown
                      ? 'Bravo ! Tu connais maintenant les six continents. Reprenons ton voyage là où tu en étais.'
                      : 'Bravo ! Tu connais maintenant les six continents. Découvrons les cinq grands océans qui les séparent.'
                    : gameMode === 'oceans'
                      ? 'Bravo ! Tu connais maintenant les cinq grands océans. Partons à la recherche des pays !'
                      : gameMode === 'seas'
                        ? 'Bravo ! Tu sais maintenant repérer huit mers essentielles. Le niveau 3 peut commencer !'
                        : gameMode === 'regions'
                          ? 'Bravo ! Tu sais maintenant situer les treize régions de France métropolitaine.'
                          : `Bravo ! Tu connais les départements de la région ${preferredRegion.name}.`}
                </div>
              ) : null}
              <button className="primary-button" type="button" onClick={nextTutorialRound} autoFocus>
                {nextLearningLabel}<ArrowRight size={19} />
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
              country={countryTarget}
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
                <span className="map-target-flag"><CountryFlag iso2={countryTarget.iso2} name={countryTarget.name} /></span>
              )}
              <div>
                <span className="eyebrow">{foundationReview
                  ? `Révision · ${foundationReview.mode === 'continents' ? 'Continent' : 'Océan'} ${learningStep + 1} sur ${learningTotal}`
                  : gameMode === 'continents'
                  ? `Niveau 0 · Continent ${continentProgressNumber(tutorialStep)} sur 6`
                  : gameMode === 'oceans'
                    ? `Niveau 0 · Océan ${oceanStep + 1} sur ${oceans.length}`
                  : gameMode === 'seas'
                    ? `Niveau spécial · Mer ${seaStep + 1} sur ${seas.length}`
                    : gameMode === 'regions'
                      ? `Niveau spécial · Régions de France · ${regionStep + 1} sur ${frenchRegions.length}`
                      : gameMode === 'departments'
                        ? `Niveau spécial · ${preferredRegion.name} · ${departmentStep + 1} sur ${departmentTargets.length}`
                    : replaySession
                      ? `Niveau ${replaySession.level} · Parcours libre`
                      : reviewSession
                      ? `Révision · Après le niveau ${reviewSession.completedLevel}`
                      : `Niveau ${countryTarget.difficulty} · ${countryLevelNames[countryTarget.difficulty]}`}</span>
                <h1>{learningTargetName}</h1>
              </div>
              {gameMode === 'country' && lastWrongAnswer ? (
                <div className="map-wrong-choice" key={`${lastWrongAnswer.iso2}-${wrongAnswers.length}`} aria-live="polite">
                  <span><CountryFlag iso2={lastWrongAnswer.iso2} name={lastWrongAnswer.name} /></span>
                  <div><small>Tu as choisi</small><strong>{lastWrongAnswer.name}</strong></div>
                  <p>Observe le nouvel indice et réessaie.</p>
                </div>
              ) : gameMode !== 'country' ? (
                <div className="map-question-block">
                  <p>{promptQuestion}</p>
                  <div className="map-tutorial-progress" aria-label={`Étape ${learningStep + 1} sur ${learningTotal}`}>
                    {Array.from({ length: learningTotal }, (_, index) => (
                      <i key={index} className={index < learningStep ? 'is-done' : index === learningStep ? 'is-current' : ''} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : allCountriesCompleted ? (
            <div className="map-answer-banner"><span>🌍</span><strong>Tous les pays disponibles ont été découverts</strong></div>
          ) : (
            <div className="map-answer-banner">
              <span>{gameMode !== 'country' ? <Globe2 size={25} /> : <CountryFlag iso2={countryTarget.iso2} name={countryTarget.name} />}</span>
              <strong>{gameMode === 'country' ? `${countryTarget.name} trouvé !` : `${learningTargetName} trouvé${gameMode === 'oceans' || gameMode === 'departments' ? '' : 'e'} !`}</strong>
            </div>
          )}

          {franceMode ? (
            <FranceMap
              areas={gameMode === 'regions' ? frenchRegions : departmentTargets}
              targetCode={gameMode === 'regions' ? regionTarget.code : departmentTarget.code}
              selectedCode={lastSelected}
              isCorrect={isCorrect}
              disabled={isCorrect || Boolean(levelTransition)}
              onSelect={submitFrenchArea}
            />
          ) : <WorldMap
            gameMode={gameMode}
            targetIso={gameMode === 'oceans' ? oceanTarget.code : gameMode === 'seas' ? seaTarget.code : gameMode === 'continents' ? continentTarget.iso2 : countryTarget.iso2}
            targetName={gameMode === 'oceans' ? `océan ${oceanTarget.name}` : gameMode === 'seas' ? `mer ${seaTarget.name}` : gameMode === 'continents' ? continentTarget.name : countryTarget.name}
            targetLabel={gameMode === 'oceans' ? [0, 0] : gameMode === 'seas' ? seaTarget.center : gameMode === 'continents' ? continentTarget.label : countryTarget.label}
            targetContinent={gameMode === 'oceans' || gameMode === 'seas' ? 'EU' : gameMode === 'continents' ? continentTarget.continent : countryTarget.continent}
            targetOcean={gameMode === 'oceans' ? oceanTarget.code : undefined}
            targetSea={gameMode === 'seas' ? seaTarget.code : undefined}
            hintLevel={visibleHints.length}
            lastSelectedIso={lastSelected}
            isCorrect={isCorrect && !allCountriesCompleted}
            disabled={isCorrect || allCountriesCompleted || Boolean(levelTransition)}
            levelProgress={gameMode === 'country' && !allCountriesCompleted ? {
              level: replaySession?.level ?? reviewSession?.completedLevel ?? countryTarget.difficulty,
              name: replaySession ? `Niveau ${replaySession.level} à refaire` : reviewSession ? 'Pays à réviser' : countryLevelNames[countryTarget.difficulty],
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
          />}

          {isCorrect && !allCountriesCompleted ? (
            <div className={`success-celebration ${tutorialPhaseFinished ? 'is-level-finale' : ''}`} aria-hidden="true">
              {Array.from({ length: tutorialPhaseFinished ? 28 : isCountryMilestone ? 24 : 16 }, (_, index) => <i key={index} className={`particle particle-${(index % 12) + 1}`} />)}
            </div>
          ) : null}

          {isCorrect && tutorialPhaseFinished ? (
            <div className="level-finale-visual" aria-hidden="true">
              <div className="finale-rays" />
              <div className="finale-orbit"><span>{gameMode === 'continents' ? '🌍' : gameMode === 'regions' || gameMode === 'departments' ? '🇫🇷' : '🌊'}</span><i>✦</i><b>✦</b></div>
              <strong>{gameMode === 'continents' ? 'Les 6 continents découverts !' : gameMode === 'oceans' ? 'Les 5 océans découverts !' : gameMode === 'seas' ? 'Les 8 mers découvertes !' : gameMode === 'regions' ? 'Les 13 régions découvertes !' : `Les départements de ${preferredRegion.name} découverts !`}</strong>
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
              : gameMode === 'regions'
                ? 'Observe la forme et la position des régions françaises.'
                : gameMode === 'departments'
                  ? `Apprends les départements de la région ${preferredRegion.name}.`
            : 'Une erreur révèle un indice — il n’y a jamais de mauvaise partie.'}</span>
        <button type="button" onClick={() => setScreen('progress')}>{masteredCount} pays bien connus</button>
      </footer>

      {showLevelPicker ? (
        <div className="level-picker-overlay" role="dialog" aria-modal="true" aria-labelledby="level-picker-title" onClick={() => setShowLevelPicker(false)}>
          <section className="level-picker-card" onClick={(event) => event.stopPropagation()}>
            <span className="level-picker-icon" aria-hidden="true"><RotateCcw size={25} /></span>
            <span className="eyebrow">Parcours libre</span>
            <h2 id="level-picker-title">Choisir un niveau</h2>
            <p>{isAdmin
              ? 'Le profil Admin peut ouvrir directement tous les niveaux pour les tester.'
              : 'Choisis une étape déjà terminée. Si un pays te pose de nouveau problème, il sera ajouté à « À réviser ».'}</p>
            <div className="level-picker-grid">
              {isAdmin ? (
                <>
                  <button type="button" aria-label="Tester les régions françaises" onClick={() => beginFranceTutorial('regions', countryTarget, true)}>
                    <span>Niveau spécial</span><strong>Régions françaises</strong><small>{frenchRegions.length} régions</small>
                  </button>
                  <button type="button" aria-label={`Tester les départements de ${preferredRegion.name}`} onClick={() => beginFranceTutorial('departments', countryTarget, true)}>
                    <span>Niveau spécial</span><strong>Départements · {preferredRegion.name}</strong><small>{departmentTargets.length} départements</small>
                  </button>
                </>
              ) : null}
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
