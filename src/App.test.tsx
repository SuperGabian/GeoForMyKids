import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { countries, countriesByDifficulty, countryDifficultyLevels } from './data/countries'
import { departmentsForRegion, frenchRegions } from './data/france'
import { frenchRivers } from './data/rivers'

describe('GeoForMyKids game loop', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.useRealTimers())

  const completeTutorials = () => {
    localStorage.setItem('globidoo.tutorial.completed.v2', 'true')
    localStorage.setItem('globidoo.ocean-tutorial.completed.v1', 'true')
    localStorage.setItem('globidoo.sea-tutorial.completed.v1', 'true')
    localStorage.setItem('globidoo.france-rivers.completed.v1', 'true')
  }

  it('keeps only the connected main network for each French river', () => {
    frenchRivers.forEach((river) => {
      const lines = river.geometry.geometry.coordinates
      const endpointKeys = lines.map((line) => [line[0], line.at(-1)!].map((point) => point.join(',')))
      const remaining = new Set(lines.map((_, index) => index))
      let networkCount = 0

      while (remaining.size) {
        networkCount += 1
        const pending = [remaining.values().next().value!]
        remaining.delete(pending[0])
        while (pending.length) {
          const lineIndex = pending.pop()!
          for (const candidateIndex of [...remaining]) {
            if (!endpointKeys[lineIndex].some((key) => endpointKeys[candidateIndex].includes(key))) continue
            remaining.delete(candidateIndex)
            pending.push(candidateIndex)
          }
        }
      }

      expect(networkCount, `${river.name} contient des segments isolés`).toBe(1)
    })
  })

  it('teaches the six continents including Antarctica and five oceans before unlocking countries', () => {
    render(<App />)

    expect(screen.getByText('Niveau 0 · Continent 1 sur 6')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Europe' })).toBeInTheDocument()
    expect(screen.getByText('Où se trouve l’Europe ?')).toBeInTheDocument()
    expect(screen.getByText('Choisis un continent sur la carte')).toBeInTheDocument()
    expect(screen.queryByLabelText('Couleurs des continents')).not.toBeInTheDocument()

    const japan = screen.getByRole('button', { name: 'Japon' })
    fireEvent.mouseEnter(japan)
    expect(japan).toHaveClass('is-continent-hovered')
    fireEvent(japan, new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }))
    fireEvent(japan, new MouseEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10 }))
    fireEvent.click(japan)
    expect(screen.getByText(/Tu as choisi/)).toHaveTextContent('Asie')

    const journey = [
      ['France', 'Europe !', 'Environ 744 millions'],
      ['Japon', 'Asie !', 'Environ 4,84 milliards'],
      ['Égypte', 'Afrique !', 'Environ 1,55 milliard'],
      ['Australie', 'Océanie !', 'Environ 47 millions'],
      ['États-Unis', 'Amérique du Nord !', 'Environ 1,06 milliard sur l’ensemble de l’Amérique'],
      ['Brésil', 'Amérique du Sud !', 'Environ 1,06 milliard sur l’ensemble de l’Amérique'],
      ['Antarctique', 'Antarctique !', 'Aucun habitant permanent'],
    ]

    journey.forEach(([country, continent, population], index) => {
      fireEvent.click(screen.getByRole('button', { name: country }))
      expect(screen.getByRole('heading', { name: continent })).toBeInTheDocument()
      expect(document.querySelector('.continent-discovery-details')).toHaveTextContent(population)
      expect(document.querySelector('.continent-discovery-details')).toHaveTextContent('Le savais-tu ?')
      if (country === 'États-Unis' || country === 'Brésil') {
        expect(screen.getByText('À retenir : une seule Amérique')).toBeInTheDocument()
        expect(screen.getByText(/deux grandes parties d’un même continent/)).toBeInTheDocument()
      }
      if (index === journey.length - 1) {
        expect(document.querySelector('.level-finale-visual')).toBeInTheDocument()
        expect(document.querySelectorAll('.success-celebration .particle')).toHaveLength(28)
      }
      fireEvent.click(screen.getByRole('button', { name: index === journey.length - 1 ? /Réviser les continents/ : /Continent suivant/ }))
    })

    expect(screen.getByText('Révision · Continent 1 sur 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'France' }))
    expect(screen.getByRole('heading', { name: 'Europe !' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Terminer les révisions/ }))

    expect(screen.getByRole('heading', { name: 'Océan Pacifique' })).toBeInTheDocument()
    expect(screen.getByText('Où se trouve l’océan Pacifique ?')).toBeInTheDocument()
    expect(screen.getByText('Choisis un océan sur la carte')).toBeInTheDocument()
    expect(screen.queryByLabelText('Couleurs des continents')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Océan Atlantique' }))
    expect(screen.getByText(/Tu as choisi/)).toHaveTextContent('océan Atlantique')

    const oceanJourney = [
      ['Pacifique', 'plus vaste que toutes les terres émergées'],
      ['Atlantique', 'Son nom vient d’Atlas'],
      ['Indien', 'parmi les plus chaudes'],
      ['Arctique', 'le plus petit des cinq océans'],
      ['Austral', 'le tour complet de la Terre'],
    ]
    oceanJourney.forEach(([ocean, fact], index) => {
      fireEvent.click(screen.getByRole('button', { name: `Océan ${ocean}` }))
      expect(screen.getByRole('heading', { name: `Océan ${ocean} !` })).toBeInTheDocument()
      expect(document.querySelector('.tutorial-fact')).toHaveTextContent(fact)
      if (index === oceanJourney.length - 1) {
        expect(document.querySelector('.level-finale-visual')).toHaveTextContent('Les 5 océans découverts !')
      }
      fireEvent.click(screen.getByRole('button', { name: index === oceanJourney.length - 1 ? /Réviser les océans/ : /Océan suivant/ }))
    })

    expect(screen.getByText('Révision · Océan 1 sur 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Océan Pacifique' }))
    expect(screen.getByRole('heading', { name: 'Océan Pacifique !' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Terminer les révisions/ }))

    expect(localStorage.getItem('globidoo.tutorial.completed.v2')).toBe('true')
    expect(localStorage.getItem('globidoo.ocean-tutorial.completed.v1')).toBe('true')
    const foundationProgress = JSON.parse(localStorage.getItem('globidoo.foundations.progress.v1')!)
    expect(foundationProgress['continent:EU']).toMatchObject({ encounters: 2, stage: 3, needsReview: false })
    expect(foundationProgress['ocean:PAC']).toMatchObject({ encounters: 2, stage: 3, needsReview: false })
    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(screen.getByLabelText('Couleurs des continents')).toBeInTheDocument()
  })

  it('reopens the expanded continent tutorial for profiles that completed the old version', () => {
    localStorage.setItem('globidoo.tutorial.completed.v1', 'true')
    localStorage.setItem('globidoo.ocean-tutorial.completed.v1', 'true')
    localStorage.setItem('globidoo.sea-tutorial.completed.v1', 'true')

    render(<App />)

    expect(screen.getByText('Niveau 0 · Continent 1 sur 6')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Europe' })).toBeInTheDocument()
  })

  it('teaches the major seas and French rivers between country levels 2 and 3', () => {
    localStorage.setItem('globidoo.tutorial.completed.v2', 'true')
    localStorage.setItem('globidoo.ocean-tutorial.completed.v1', 'true')
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(Object.fromEntries(
      countries
        .filter((country) => country.difficulty <= 2 && country.iso2 !== 'PT')
        .map((country) => [country.iso2, { encounters: 1, stage: 1 }]),
    )))
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Portugal' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Portugal' }))
    fireEvent.click(screen.getByRole('button', { name: /Pays suivant/ }))

    expect(screen.getByText('Niveau spécial · Mer 1 sur 8')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mer Méditerranée' })).toBeInTheDocument()
    expect(screen.getByText('Où se trouve la mer Méditerranée ?')).toBeInTheDocument()
    expect(screen.getByText('Choisis une mer sur la carte')).toBeInTheDocument()
    expect(screen.queryByLabelText('Couleurs des continents')).not.toBeInTheDocument()
    const countriesLayer = document.querySelector('.countries')!
    const seaLayer = document.querySelector('.sea-zones')!
    expect(countriesLayer.compareDocumentPosition(seaLayer) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(document.querySelector('.sea-zone ellipse')).toHaveAttribute('vector-effect', 'non-scaling-stroke')
    expect(document.querySelector('.sea-zone-center')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mer des Caraïbes' }))
    expect(screen.getByText(/Tu as choisi/)).toHaveTextContent('mer des Caraïbes')

    const seaJourney = [
      ['Méditerranée', 'détroit de Gibraltar'],
      ['des Caraïbes', 'récif mésoaméricain'],
      ['Rouge', 'Trichodesmium'],
      ['Noire', 'manquent presque totalement d’oxygène'],
      ['Baltique', 'Son eau est saumâtre'],
      ['du Nord', 'Doggerland'],
      ['d’Arabie', 'vents de mousson'],
      ['de Chine méridionale', 'plus de 280 îles'],
    ]
    seaJourney.forEach(([sea, fact], index) => {
      fireEvent.click(screen.getByRole('button', { name: `Mer ${sea}` }))
      expect(screen.getByRole('heading', { name: `Mer ${sea} !` })).toBeInTheDocument()
      expect(document.querySelector('.tutorial-fact')).toHaveTextContent(fact)
      if (index === seaJourney.length - 1) {
        expect(document.querySelector('.level-finale-visual')).toHaveTextContent('Les 8 mers découvertes !')
        expect(document.querySelectorAll('.success-celebration .particle')).toHaveLength(28)
      }
      fireEvent.click(screen.getByRole('button', { name: index === seaJourney.length - 1 ? /Découvrir les fleuves/ : /Mer suivante/ }))
    })

    expect(localStorage.getItem('globidoo.sea-tutorial.completed.v1')).toBe('true')
    expect(screen.getByText(`Niveau spécial · Fleuve 1 sur ${frenchRivers.length}`)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Seine' })).toBeInTheDocument()
    expect(screen.getByText('Où se trouve la Seine ?')).toBeInTheDocument()
    expect(document.querySelectorAll('.river-hit-area')).toHaveLength(frenchRivers.length)

    fireEvent.click(screen.getByRole('button', { name: 'Loire' }))
    expect(screen.getByText(/Tu as choisi/)).toHaveTextContent('la Loire')

    frenchRivers.forEach((river, index) => {
      fireEvent.click(screen.getByRole('button', { name: river.name }))
      expect(screen.getByRole('heading', { name: `${river.name} !` })).toBeInTheDocument()
      expect(document.querySelector('.tutorial-fact')).toHaveTextContent(river.fact)
      if (index === frenchRivers.length - 1) {
        expect(document.querySelector('.level-finale-visual')).toHaveTextContent('Les 5 fleuves découverts !')
      }
      fireEvent.click(screen.getByRole('button', { name: index === frenchRivers.length - 1 ? /Continuer vers le niveau 3/ : /Fleuve suivant/ }))
    })

    expect(localStorage.getItem('globidoo.france-rivers.completed.v1')).toBe('true')
    expect(screen.getByRole('dialog', { name: 'Niveau 3 débloqué !' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progression du niveau 3' })).toHaveAttribute('aria-valuenow', '0')
  })

  it('reveals one hint after an error, then celebrates the right country', () => {
    vi.useFakeTimers()
    completeTutorials()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(document.querySelector('.map-target-banner')).toHaveTextContent('France')
    expect(screen.getByRole('progressbar', { name: 'Progression du niveau 1' })).toHaveAttribute('aria-valuenow', '0')
    expect(document.querySelector('.map-target-banner')).toContainElement(screen.getByRole('img', { name: 'Drapeau de France' }))
    expect(screen.getByRole('img', { name: 'Drapeau de France' })).toHaveAttribute('data-country-flag', 'FR')
    expect(screen.queryByText('Elle se trouve dans l’hémisphère Nord.')).not.toBeInTheDocument()
    const portugal = screen.getByRole('button', { name: 'Portugal' })

    fireEvent.mouseEnter(portugal)
    expect(screen.queryByText('Portugal')).not.toBeInTheDocument()

    fireEvent.click(portugal)

    expect(screen.getByText('Elle se trouve dans l’hémisphère Nord.')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progression du niveau 1' })).toBeInTheDocument()
    expect(document.querySelector('.map-wrong-choice')).toHaveTextContent('Portugal')
    expect(screen.getByRole('img', { name: 'Drapeau de Portugal' })).toBeInTheDocument()
    const mapLabel = screen.getByRole('img', { name: 'Pays sélectionné : Portugal' })
    expect(mapLabel).toHaveClass('wrong-country-marker-position')
    expect(mapLabel).toHaveAttribute('transform', expect.stringContaining('translate('))
    expect(mapLabel.querySelector('.wrong-country-marker')).toBeInTheDocument()
    expect(screen.getByText('Choisis un pays sur la carte')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revenir à la vue du monde' })).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1300))
    expect(screen.getByText('Zoom sur Hémisphère Nord')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Pays sélectionné : Portugal' })).not.toBeInTheDocument()
    const visibleOverviewButton = screen.getByRole('button', { name: 'Revenir à la vue du monde' })
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('scale(1.32)'))
    fireEvent.click(visibleOverviewButton)
    expect(screen.getByText('Choisis un pays sur la carte')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Revenir au zoom de l’indice' }))

    fireEvent.click(screen.getByRole('button', { name: 'Espagne' }))
    expect(screen.getByRole('img', { name: 'Pays sélectionné : Espagne' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1300))
    expect(screen.getByText('Zoom sur Europe')).toBeInTheDocument()
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('scale(2.8)'))

    fireEvent.click(screen.getByRole('button', { name: 'France' }))

    expect(screen.getByRole('heading', { name: 'Bien joué !' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pays suivant/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'France' })).toHaveClass('is-correct')
    expect(document.querySelectorAll('.success-celebration .particle')).toHaveLength(16)
    expect(document.querySelector('.flag-marker')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progression du niveau 1' })).toHaveAttribute('aria-valuenow', '1')
  })

  it('marks a country well known on the first try and removes that status after a later mistake', () => {
    completeTutorials()
    const firstJourney = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'France' }))
    let savedProgress = JSON.parse(localStorage.getItem('globidoo.progress.v1')!)
    expect(savedProgress.FR).toMatchObject({ stage: 3, needsReview: false })
    expect(screen.getByRole('button', { name: '1 pays bien connus' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))
    const masteredFranceCard = document.querySelector<HTMLElement>('[data-country="FR"]')!
    expect(masteredFranceCard).toHaveClass('is-mastered')
    expect(masteredFranceCard).toHaveTextContent('✓ Bien connu')

    localStorage.setItem('globidoo.progress.v1', JSON.stringify(Object.fromEntries(
      countries
        .filter((country) => country.difficulty === 1)
        .map((country) => [country.iso2, country.iso2 === 'FR'
          ? { encounters: 1, stage: 3, needsReview: false }
          : { encounters: 1, stage: 1 }]),
    )))
    firstJourney.unmount()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Choisir un niveau' }))
    fireEvent.click(screen.getByRole('button', { name: 'Refaire le niveau 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Portugal' }))
    fireEvent.click(screen.getByRole('button', { name: 'France' }))

    savedProgress = JSON.parse(localStorage.getItem('globidoo.progress.v1')!)
    expect(savedProgress.FR).toMatchObject({ stage: 2, needsReview: false })
    expect(screen.getByRole('button', { name: '0 pays bien connus' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))
    expect(document.querySelector<HTMLElement>('[data-country="FR"]')).not.toHaveClass('is-mastered')
    expect(document.querySelector<HTMLElement>('[data-country="FR"]')).toHaveClass('is-learning')
    expect(document.querySelector<HTMLElement>('[data-country="FR"]')).toHaveTextContent('Découvert')
  })

  it('keeps long country names inside an adaptive map label', () => {
    vi.useFakeTimers()
    completeTutorials()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Papouasie-Nouvelle-Guinée' }))

    const label = screen.getByRole('img', { name: 'Pays sélectionné : Papouasie-Nouvelle-Guinée' })
    const bubble = label.querySelector('rect')
    expect(Number(bubble?.getAttribute('width'))).toBeGreaterThan(240)
    expect(label).toHaveTextContent('Papouasie-Nouvelle-Guinée')
  })

  it('draws complete European borders above neighbouring countries on hover', () => {
    completeTutorials()
    render(<App />)

    const europeanCountries = ['Italie', 'Allemagne', 'Suisse', 'Belgique', 'Pays-Bas', 'Luxembourg', 'Autriche', 'Danemark']
    europeanCountries.forEach((name) => {
      const country = screen.getByRole('button', { name })
      fireEvent.mouseEnter(country)
      const outline = document.querySelector('.country-hover-line')
      expect(outline).toHaveAttribute('d', country.getAttribute('d'))
      expect(document.querySelectorAll('.country-hover-outline path')).toHaveLength(2)
      fireEvent.mouseLeave(country)
      expect(document.querySelector('.country-hover-outline')).not.toBeInTheDocument()
    })
  })

  it('keeps the complete Japanese archipelago highlighted over its assisted hit area', () => {
    completeTutorials()
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(Object.fromEntries(
      countries
        .filter((country) => country.difficulty === 1 && country.iso2 !== 'JP')
        .map((country) => [country.iso2, { encounters: 1, stage: 1 }]),
    )))
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Japon' })).toBeInTheDocument()
    const japan = screen.getByRole('button', { name: 'Japon' })
    const assistedHitArea = document.querySelector('.target-hit-area')!
    fireEvent.mouseEnter(assistedHitArea)

    expect(document.querySelector('.country-hover-line')).toHaveAttribute('d', japan.getAttribute('d'))
  })

  it('lets the player adjust and reset the map zoom', () => {
    completeTutorials()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Zoomer' }))
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('scale(1.5)'))

    fireEvent.change(screen.getByRole('slider', { name: 'Niveau de zoom' }), { target: { value: '3.25' } })
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('scale(3.25)'))

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser le zoom' }))
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('scale(1)'))

    const map = screen.getByLabelText('Carte du monde interactive')
    fireEvent.wheel(map, { deltaY: -100 })
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('scale(1.25)'))
    fireEvent.wheel(map, { deltaY: 100 })
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('scale(1)'))

    fireEvent.click(screen.getByRole('button', { name: 'Zoomer' }))
    fireEvent.keyDown(map, { key: 'ArrowRight' })
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('translate(456px, 270px)'))

    const svg = document.querySelector<SVGSVGElement>('.world-map')!
    fireEvent(svg, new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }))
    fireEvent(svg, new MouseEvent('pointermove', { bubbles: true, clientX: 140, clientY: 125 }))
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('translate(496px, 295px)'))
    fireEvent(svg, new MouseEvent('pointerup', { bubbles: true }))

    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser le zoom' }))
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('translate(500px, 270px) scale(1)'))

    const pointer = (type: string, pointerId: number, clientX: number, clientY: number) => {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY })
      Object.defineProperty(event, 'pointerId', { value: pointerId })
      return event
    }
    fireEvent(svg, pointer('pointerdown', 1, 100, 100))
    fireEvent(svg, pointer('pointerdown', 2, 200, 100))
    fireEvent(svg, pointer('pointermove', 2, 300, 100))
    expect(document.querySelector('.map-viewport')).toHaveAttribute('style', expect.stringContaining('scale(2)'))
    fireEvent(svg, pointer('pointerup', 1, 100, 100))
    fireEvent(svg, pointer('pointerup', 2, 300, 100))
  })

  it('unlocks every country and French test stage for the Admin profile', () => {
    localStorage.setItem('globidoo.profiles.v1', JSON.stringify([{ id: 'default', name: 'Admin' }]))
    render(<App />)

    expect(screen.getByText('Mode Admin')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Choisir un niveau' }))

    countryDifficultyLevels.forEach((difficulty) => {
      expect(screen.getByRole('button', { name: `Refaire le niveau ${difficulty}` })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Tester les fleuves français' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tester les régions françaises' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tester les départements de Provence-Alpes-Côte d.Azur/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tester les régions françaises' }))
    expect(screen.getByRole('button', { name: 'Niveaux' })).toBeInTheDocument()
    expect(screen.queryByText('1.0×')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Niveaux' }))
    fireEvent.click(screen.getByRole('button', { name: `Refaire le niveau ${countryDifficultyLevels.at(-1)}` }))
    expect(screen.getByText(`Niveau ${countryDifficultyLevels.at(-1)} · Parcours libre`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Choisir un niveau' }))
    fireEvent.click(screen.getByRole('button', { name: 'Revenir au niveau spécial' }))
    expect(screen.getByText(`Niveau spécial · Régions de France · 1 sur ${frenchRegions.length}`)).toBeInTheDocument()
  })

  it('inserts the French regions stage after country level 3', () => {
    completeTutorials()
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(Object.fromEntries(
      countries
        .filter((country) => country.difficulty <= 3)
        .map((country) => [country.iso2, { encounters: 1, stage: 3 }]),
    )))
    render(<App />)

    frenchRegions.forEach((region, index) => {
      expect(screen.getByText(`Niveau spécial · Régions de France · ${index + 1} sur ${frenchRegions.length}`)).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: region.name })).toBeInTheDocument()
      const regionButton = screen.getByRole('button', { name: region.name })
      if (index === 0) {
        const map = document.querySelector<SVGSVGElement>('.france-map')!
        const capturePointer = vi.fn()
        map.setPointerCapture = capturePointer
        map.hasPointerCapture = vi.fn(() => false)
        const pointer = (type: string) => {
          const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: 300, clientY: 200 })
          Object.defineProperty(event, 'pointerId', { value: 1 })
          return event
        }
        fireEvent(regionButton, pointer('pointerdown'))
        fireEvent(regionButton, pointer('pointerup'))
        fireEvent.click(regionButton)
        expect(capturePointer).not.toHaveBeenCalled()
        expect(document.activeElement).not.toBe(regionButton)
      } else {
        fireEvent.click(regionButton)
      }
      fireEvent.click(screen.getByRole('button', { name: index === frenchRegions.length - 1 ? /Continuer vers le niveau 4/ : /Région suivante/ }))
    })

    expect(localStorage.getItem('globidoo.france-regions.completed.v1')).toBe('true')
    expect(screen.getByRole('dialog', { name: 'Niveau 4 débloqué !' })).toBeInTheDocument()
  })

  it('uses the chosen region for the department stage after country level 4', () => {
    completeTutorials()
    localStorage.setItem('globidoo.france-regions.completed.v1', 'true')
    localStorage.setItem('globidoo.france.preferred-region.v1', '53')
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(Object.fromEntries(
      countries
        .filter((country) => country.difficulty <= 4)
        .map((country) => [country.iso2, { encounters: 1, stage: 3 }]),
    )))
    const bretonDepartments = departmentsForRegion('53')
    render(<App />)

    bretonDepartments.forEach((department, index) => {
      expect(screen.getByText(`Niveau spécial · Bretagne · ${index + 1} sur ${bretonDepartments.length}`)).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: department.name })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: department.name }))
      fireEvent.click(screen.getByRole('button', { name: index === bretonDepartments.length - 1 ? /Continuer vers le niveau 5/ : /Département suivant/ }))
    })

    expect(localStorage.getItem('globidoo.france-departments.completed.v1')).toBe('true')
    expect(screen.getByRole('dialog', { name: 'Niveau 5 débloqué !' })).toBeInTheDocument()
  })

  it('contains the complete 195-country catalog without duplicates', () => {
    expect(countries).toHaveLength(195)
    expect(new Set(countries.map((country) => country.iso2)).size).toBe(195)
    const explicitlyRankedCountries = countryDifficultyLevels.flatMap((difficulty) => countriesByDifficulty[difficulty])
    expect(explicitlyRankedCountries).toHaveLength(195)
    expect(new Set(explicitlyRankedCountries).size).toBe(195)
    expect(new Set(explicitlyRankedCountries)).toEqual(new Set(countries.map((country) => country.iso2)))
    const papuaNewGuinea = countries.find((country) => country.iso2 === 'PG')
    expect(papuaNewGuinea?.name).toBe('Papouasie-Nouvelle-Guinée')
    expect(countries.find((country) => country.iso2 === 'TH')?.difficulty).toBe(4)
    countryDifficultyLevels.forEach((difficulty) => {
      const levelSize = countries.filter((country) => country.difficulty === difficulty).length
      expect(levelSize).toBeGreaterThan(0)
      expect(levelSize).toBeLessThanOrEqual(20)
    })
    papuaNewGuinea?.hints.forEach((hint) => expect(hint).not.toContain('Papouasie-Nouvelle-Guinée'))
    expect(new Set(countries.map((country) => country.fact)).size).toBe(195)
    countries.forEach((country) => expect(country.fact).not.toContain('Sa capitale est'))
    countries.forEach((country) => expect(country.fact).not.toContain('géographie et une histoire qui lui sont propres'))
    countries.forEach((country) => expect(country.population).toMatch(/habitants \(20\d{2}\)$/))
    expect(countries.some((country) => country.population.includes('donnée à compléter'))).toBe(false)
    expect(countries.find((country) => country.iso2 === 'VA')?.population).toBe('882 habitants (2024)')
    expect(countries.find((country) => country.iso2 === 'IN')?.population).toContain('1,46 milliard')
    expect(papuaNewGuinea?.fact).toContain('plus de 800 langues')
  })

  it('celebrates every fifth newly discovered country', () => {
    completeTutorials()
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(Object.fromEntries(
      ['FR', 'JP', 'AU', 'US'].map((iso2) => [iso2, { encounters: 1, stage: 1 }]),
    )))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Brésil' }))

    expect(screen.getByText('5 pays trouvés !')).toBeInTheDocument()
    expect(document.querySelectorAll('.success-celebration .particle')).toHaveLength(24)
  })

  it('never proposes a country that has already been discovered', () => {
    completeTutorials()
    const previousProgress = Object.fromEntries(
      countries
        .filter((country) => country.iso2 !== 'FR' && country.iso2 !== 'JP')
        .map((country) => [country.iso2, { encounters: 1, stage: 1 }]),
    )
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(previousProgress))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'France' }))
    fireEvent.click(screen.getByRole('button', { name: /Pays suivant/ }))
    expect(screen.getByRole('heading', { name: 'Japon' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Japon' }))
    fireEvent.click(screen.getByRole('button', { name: /Pays suivant/ }))
    expect(screen.getByRole('heading', { name: 'Quelle aventure !' })).toBeInTheDocument()
  })

  it('starts on an unseen country when a saved journey is resumed', () => {
    completeTutorials()
    localStorage.setItem('globidoo.progress.v1', JSON.stringify({ PT: { encounters: 1, stage: 1 } }))
    render(<App />)

    expect(screen.queryByRole('heading', { name: 'Portugal' })).not.toBeInTheDocument()
    expect(screen.getByText('Niveau 1 · Mes premiers pays')).toBeInTheDocument()
  })

  it('finishes every easy country before unlocking the next difficulty tier', () => {
    completeTutorials()
    const easyProgress = Object.fromEntries(
      countries
        .filter((country) => country.difficulty === 1 && country.iso2 !== 'CA')
        .map((country) => [country.iso2, { encounters: 1, stage: 1 }]),
    )
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(easyProgress))
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Canada' })).toBeInTheDocument()
    expect(screen.getByText('Niveau 1 · Mes premiers pays')).toBeInTheDocument()
    const levelOneProgress = screen.getByRole('progressbar', { name: 'Progression du niveau 1' })
    expect(levelOneProgress).toHaveAttribute('aria-valuenow', String(countries.filter((country) => country.difficulty === 1).length - 1))
    fireEvent.click(screen.getByRole('button', { name: 'Canada' }))
    expect(levelOneProgress).toHaveAttribute('aria-valuenow', String(countries.filter((country) => country.difficulty === 1).length))
    fireEvent.click(screen.getByRole('button', { name: /Pays suivant/ }))

    expect(screen.getByRole('dialog', { name: 'Niveau 2 débloqué !' })).toBeInTheDocument()
    expect(screen.getByText('Niveau 1 terminé !')).toBeInTheDocument()
    expect(document.querySelectorAll('.level-transition-particle')).toHaveLength(36)
    expect(screen.getByRole('progressbar', { name: 'Progression du niveau 2' })).toHaveAttribute('aria-valuenow', '0')
    const nextName = document.querySelector('.map-target-banner h1')?.textContent
    expect(countries.find((country) => country.name === nextName)?.difficulty).toBe(2)
    expect(screen.queryByRole('heading', { name: 'Thaïlande' })).not.toBeInTheDocument()
    expect(screen.getByText('Niveau 2 · Petit explorateur')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'C’est parti !' }))
    expect(screen.queryByRole('dialog', { name: 'Niveau 2 débloqué !' })).not.toBeInTheDocument()
  })

  it('opens previous levels from the progress bar and flags a mastered country for review', () => {
    completeTutorials()
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(Object.fromEntries(
      countries
        .filter((country) => country.difficulty <= 2)
        .map((country) => [country.iso2, { encounters: 1, stage: 3 }]),
    )))
    render(<App />)

    expect(screen.getByText('Niveau 3 · Explorateur')).toBeInTheDocument()
    const currentCountryName = document.querySelector('.map-target-banner h1')?.textContent
    fireEvent.click(screen.getByRole('button', { name: 'Choisir un niveau' }))

    expect(screen.getByRole('dialog', { name: 'Choisir un niveau' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refaire le niveau 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refaire le niveau 2' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refaire le niveau 3' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('dialog', { name: 'Choisir un niveau' }))
    expect(screen.queryByRole('dialog', { name: 'Choisir un niveau' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Choisir un niveau' }))
    fireEvent.click(screen.getByRole('button', { name: 'Refaire le niveau 1' }))

    expect(screen.getByText('Niveau 1 · Parcours libre')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progression du niveau 1 rejoué' })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Choisir un niveau' }))
    expect(screen.getByRole('button', { name: 'Revenir au niveau 3' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Refaire le niveau 2' }))
    expect(screen.getByText('Niveau 2 · Parcours libre')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Portugal' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Choisir un niveau' }))
    fireEvent.click(screen.getByRole('button', { name: 'Revenir au niveau 3' }))
    expect(document.querySelector('.map-target-banner h1')).toHaveTextContent(currentCountryName!)

    fireEvent.click(screen.getByRole('button', { name: 'Choisir un niveau' }))
    fireEvent.click(screen.getByRole('button', { name: 'Refaire le niveau 1' }))

    fireEvent.click(screen.getByRole('button', { name: 'Portugal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mexique' }))
    fireEvent.click(screen.getByRole('button', { name: 'France' }))

    const savedProgress = JSON.parse(localStorage.getItem('globidoo.progress.v1')!)
    expect(savedProgress.FR).toMatchObject({ encounters: 2, needsReview: true, nextReviewLevel: 3 })
    expect(screen.getByRole('button', { name: 'Pays suivant à revoir' })).toBeInTheDocument()
  })

  it('marks a difficult country for review, then clears it after an easy retry', () => {
    completeTutorials()
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(Object.fromEntries(
      countries
        .filter((country) => country.difficulty === 1 && country.iso2 !== 'FR')
        .map((country) => [country.iso2, { encounters: 1, stage: 1 }]),
    )))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Portugal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Espagne' }))
    fireEvent.click(screen.getByRole('button', { name: 'France' }))

    let savedProgress = JSON.parse(localStorage.getItem('globidoo.progress.v1')!)
    expect(savedProgress.FR).toMatchObject({ needsReview: true, nextReviewLevel: 1 })

    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))
    const francePassportCard = document.querySelector<HTMLElement>('[data-country="FR"]')!
    expect(francePassportCard).toHaveTextContent('À réviser')
    expect(francePassportCard).toHaveClass('needs-review')
    fireEvent.click(screen.getByRole('button', { name: 'Revenir au jeu' }))

    fireEvent.click(screen.getByRole('button', { name: /Pays suivant/ }))
    expect(screen.getByText('Révision · Après le niveau 1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progression des révisions du niveau 1' })).toHaveAttribute('aria-valuenow', '0')

    fireEvent.click(screen.getByRole('button', { name: 'France' }))
    expect(screen.getByRole('heading', { name: 'C’est acquis !' })).toBeInTheDocument()
    savedProgress = JSON.parse(localStorage.getItem('globidoo.progress.v1')!)
    expect(savedProgress.FR.needsReview).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Terminer les révisions' }))
    expect(screen.getByRole('dialog', { name: 'Niveau 2 débloqué !' })).toBeInTheDocument()
  })

  it('keeps a country in review when its retry still contains one mistake', () => {
    completeTutorials()
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(Object.fromEntries(
      countries
        .filter((country) => country.difficulty === 1 && country.iso2 !== 'FR')
        .map((country) => [country.iso2, { encounters: 1, stage: 1 }]),
    )))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Portugal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Espagne' }))
    fireEvent.click(screen.getByRole('button', { name: 'France' }))
    fireEvent.click(screen.getByRole('button', { name: /Pays suivant/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Portugal' }))
    fireEvent.click(screen.getByRole('button', { name: 'France' }))

    const savedProgress = JSON.parse(localStorage.getItem('globidoo.progress.v1')!)
    expect(savedProgress.FR).toMatchObject({ encounters: 2, stage: 1, needsReview: true, nextReviewLevel: 2 })
    expect(screen.getByRole('heading', { name: 'On y reviendra !' })).toBeInTheDocument()
  })

  it('carries a still-difficult review into the end of the following level', () => {
    completeTutorials()
    localStorage.setItem('globidoo.progress.v1', JSON.stringify({
      ...Object.fromEntries(
        countries
          .filter((country) => country.difficulty <= 2)
          .map((country) => [country.iso2, { encounters: 1, stage: 1 }]),
      ),
      FR: { encounters: 1, stage: 1, needsReview: true, nextReviewLevel: 2 },
    }))
    const firstJourney = render(<App />)

    expect(screen.getByText('Révision · Après le niveau 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Portugal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Espagne' }))
    fireEvent.click(screen.getByRole('button', { name: 'France' }))

    let savedProgress = JSON.parse(localStorage.getItem('globidoo.progress.v1')!)
    expect(savedProgress.FR).toMatchObject({ needsReview: true, nextReviewLevel: 3 })
    expect(screen.getByRole('heading', { name: 'On y reviendra !' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Terminer les révisions' }))
    expect(screen.getByRole('dialog', { name: 'Niveau 3 débloqué !' })).toBeInTheDocument()

    savedProgress = {
      ...savedProgress,
      ...Object.fromEntries(
        countries
          .filter((country) => country.difficulty === 3)
          .map((country) => [country.iso2, { encounters: 1, stage: 1 }]),
      ),
    }
    localStorage.setItem('globidoo.progress.v1', JSON.stringify(savedProgress))
    firstJourney.unmount()
    render(<App />)

    expect(screen.getByText('Révision · Après le niveau 3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'France' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'France' }))
    savedProgress = JSON.parse(localStorage.getItem('globidoo.progress.v1')!)
    expect(savedProgress.FR.needsReview).toBe(false)
  })

  it('opens the persistent collection view', () => {
    completeTutorials()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))
    expect(screen.getByRole('heading', { name: 'Ta planète se remplit' })).toBeInTheDocument()
    expect(screen.getByText('Exploration par continent')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Continents et océans' })).toBeInTheDocument()
    expect(document.querySelector('[data-foundation="continent-EU"]')).toHaveClass('is-mastered')
    expect(document.querySelector('[data-foundation="ocean-PAC"]')).toHaveClass('is-mastered')

    const regionSelect = screen.getByRole('combobox', { name: 'Ma région' })
    expect(regionSelect).toHaveValue('93')
    fireEvent.change(regionSelect, { target: { value: '53' } })
    expect(localStorage.getItem('globidoo.france.preferred-region.v1')).toBe('53')

    const levels = [...document.querySelectorAll<HTMLElement>('.passport-level')]
    expect(levels.map((level) => Number(level.dataset.difficulty))).toEqual(countryDifficultyLevels)
    levels.forEach((level) => {
      const difficulty = Number(level.dataset.difficulty)
      const continentGroups = [...level.querySelectorAll<HTMLElement>('.passport-continent')]
      const groupedCountries = continentGroups.flatMap((group) =>
        [...group.querySelectorAll<HTMLElement>('.passport-country')].map((country) => country.dataset.country),
      )
      expect(groupedCountries).toHaveLength(countries.filter((country) => country.difficulty === difficulty).length)
      continentGroups.forEach((group) => {
        const countryCodes = [...group.querySelectorAll<HTMLElement>('.passport-country')].map((country) => country.dataset.country)
        countryCodes.forEach((iso2) => expect(countries.find((country) => country.iso2 === iso2)?.continent).toBe(group.dataset.continent))
      })
    })
  })

  it('resumes unfinished continent and ocean reviews on the next visit', () => {
    completeTutorials()
    localStorage.setItem('globidoo.foundations.progress.v1', JSON.stringify({
      'continent:EU': { encounters: 1, stage: 2, needsReview: true },
      'ocean:PAC': { encounters: 1, stage: 2, needsReview: true },
    }))
    render(<App />)

    expect(screen.getByText('Révision · Continent 1 sur 1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Europe' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'France' }))
    fireEvent.click(screen.getByRole('button', { name: /Terminer les révisions/ }))

    expect(screen.getByText('Révision · Océan 1 sur 1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Océan Pacifique' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))
    expect(document.querySelector('[data-foundation="continent-EU"]')).toHaveClass('is-mastered')
    expect(document.querySelector('[data-foundation="ocean-PAC"]')).toHaveClass('needs-review')
  })

  it('keeps separate progress for the default and every newly created profile', () => {
    completeTutorials()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'France' }))
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))
    expect(screen.getByRole('button', { name: /Changer d’utilisateur/ })).toHaveTextContent('Profil : Joueur 1')
    expect(document.querySelector<HTMLElement>('[data-country="FR"]')).toHaveClass('is-mastered')

    fireEvent.click(screen.getByRole('button', { name: /Changer d’utilisateur/ }))
    expect(screen.getByRole('dialog', { name: 'Changer d’utilisateur' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Profil actuel : Joueur 1' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Créer un profil' }), { target: { value: 'Joueur 2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }))

    expect(screen.getByRole('heading', { name: 'Europe' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))
    expect(screen.getByRole('button', { name: /Changer d’utilisateur/ })).toHaveTextContent('Profil : Joueur 2')
    expect(document.querySelector<HTMLElement>('[data-country="FR"]')).not.toHaveClass('is-mastered')

    fireEvent.click(screen.getByRole('button', { name: /Changer d’utilisateur/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser le profil Joueur 1' }))
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))
    expect(document.querySelector<HTMLElement>('[data-country="FR"]')).toHaveClass('is-mastered')

    const profiles = JSON.parse(localStorage.getItem('globidoo.profiles.v1')!)
    expect(profiles.map((profile: { name: string }) => profile.name)).toEqual(['Joueur 1', 'Joueur 2'])
    expect(localStorage.getItem('globidoo.profile.active.v1')).toBe('default')
  })

  it('lets Joueur 1 personalize their name without losing progress', () => {
    completeTutorials()
    const { unmount } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'France' }))
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))
    fireEvent.click(screen.getByRole('button', { name: /Changer d’utilisateur/ }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Personnaliser mon pseudo' }), { target: { value: 'Exploratrice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(screen.getByRole('button', { name: 'Profil actuel : Exploratrice' })).toBeDisabled()
    expect(JSON.parse(localStorage.getItem('globidoo.profiles.v1')!)).toEqual([{ id: 'default', name: 'Exploratrice' }])

    unmount()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))
    expect(screen.getByRole('button', { name: /Changer d’utilisateur/ })).toHaveTextContent('Profil : Exploratrice')
    expect(document.querySelector<HTMLElement>('[data-country="FR"]')).toHaveClass('is-mastered')
  })

  it('migrates an earlier default profile without losing its base progress', () => {
    completeTutorials()
    localStorage.setItem('globidoo.profiles.v1', JSON.stringify([{ id: 'former-default', name: 'Ancien profil' }]))
    localStorage.setItem('globidoo.profile.active.v1', 'former-default')
    localStorage.setItem('globidoo.progress.v1', JSON.stringify({ FR: { encounters: 1, stage: 4 } }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))

    expect(screen.getByRole('button', { name: /Changer d’utilisateur/ })).toHaveTextContent('Profil : Joueur 1')
    expect(document.querySelector<HTMLElement>('[data-country="FR"]')).toHaveClass('is-mastered')
    expect(JSON.parse(localStorage.getItem('globidoo.profiles.v1')!)).toEqual([{ id: 'default', name: 'Joueur 1' }])
    expect(localStorage.getItem('globidoo.profile.active.v1')).toBe('default')
  })

  it('offers native PWA installation from Ma planète', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    const installEvent = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>
    }
    installEvent.prompt = prompt
    installEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })

    render(<App />)
    act(() => window.dispatchEvent(installEvent))
    fireEvent.click(screen.getByRole('button', { name: /Ma planète/ }))

    const installButton = screen.getByRole('button', { name: 'Installer GeoForMyKids' })
    fireEvent.click(installButton)
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce())

    act(() => window.dispatchEvent(new Event('appinstalled')))
    expect(screen.getByRole('button', { name: 'Application installée' })).toBeDisabled()
  })
})
