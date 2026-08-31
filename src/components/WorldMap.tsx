import { useEffect, useMemo, useRef, useState } from 'react'
import { geoEqualEarth, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react'
import worldTopology from 'world-atlas/countries-110m.json'
import mapMetadata from '../data/map-countries.json'
import { countries, countryByNumericId, type ContinentCode } from '../data/countries'
import { CountryFlag } from './CountryFlag'
import { oceans, type OceanCode } from '../data/oceans'
import { seas, type SeaCode } from '../data/seas'

type MapCountry = {
  iso2: string
  name: string
  numericId: string
  continent: ContinentCode | 'AN'
  geometry: Feature<Geometry>
}

type WorldMapProps = {
  gameMode: 'continents' | 'oceans' | 'seas' | 'country'
  targetIso: string
  targetName: string
  targetLabel: [number, number]
  targetContinent: ContinentCode | 'AN'
  targetOcean?: OceanCode
  targetSea?: SeaCode
  hintLevel: number
  lastSelectedIso?: string
  isCorrect: boolean
  disabled?: boolean
  levelProgress?: {
    level: number
    name: string
    completed: number
    total: number
    label?: string
    selectable?: boolean
  }
  onLevelProgressClick?: () => void
  onSelect: (iso2: string, name: string, continent: ContinentCode | 'AN') => void
  onSelectOcean?: (code: OceanCode, name: string) => void
  onSelectSea?: (code: SeaCode, name: string) => void
}

const numericLookup = new Map(
  mapMetadata.map((country) => [country.numericId, country]),
)

function clampPan([x, y]: [number, number], zoom: number): [number, number] {
  const horizontalLimit = Math.max(0, (zoom - 1) * 475)
  const verticalLimit = Math.max(0, (zoom - 1) * 250)
  return [
    Math.min(horizontalLimit, Math.max(-horizontalLimit, x)),
    Math.min(verticalLimit, Math.max(-verticalLimit, y)),
  ]
}

function continentFor(region: string, subregion: string): ContinentCode | 'AN' {
  if (region === 'Europe') return 'EU'
  if (region === 'Asia') return 'AS'
  if (region === 'Africa') return 'AF'
  if (region === 'Oceania') return 'OC'
  if (region === 'Americas') return subregion === 'South America' ? 'SA' : 'NA'
  return 'AN'
}

export function WorldMap({
  gameMode,
  targetIso,
  targetName,
  targetLabel,
  targetContinent,
  targetOcean,
  targetSea,
  hintLevel,
  lastSelectedIso,
  isCorrect,
  disabled = false,
  levelProgress,
  onSelect,
  onSelectOcean,
  onSelectSea,
  onLevelProgressClick,
}: WorldMapProps) {
  const [showOverview, setShowOverview] = useState(false)
  const [hoveredContinent, setHoveredContinent] = useState<ContinentCode | 'AN'>()
  const [hoveredCountryIso, setHoveredCountryIso] = useState<string>()
  const [displayedHintLevel, setDisplayedHintLevel] = useState(hintLevel)
  const [showWrongMarker, setShowWrongMarker] = useState(false)
  const [manualZoom, setManualZoom] = useState<number | null>(null)
  const [pan, setPan] = useState<[number, number]>([0, 0])
  const [isDragging, setIsDragging] = useState(false)
  const mapShellRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ x: number; y: number; pan: [number, number] } | null>(null)
  const activePointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchStart = useRef<{
    distance: number
    midpoint: [number, number]
    zoom: number
    pan: [number, number]
  } | null>(null)
  const didDrag = useRef(false)

  useEffect(() => {
    setShowOverview(false)
    setManualZoom(null)
    setPan([0, 0])
    setHoveredCountryIso(undefined)
    setHoveredContinent(undefined)
  }, [hintLevel, targetIso])
  useEffect(() => {
    if (isCorrect || hintLevel === 0) {
      setShowWrongMarker(false)
      setDisplayedHintLevel(hintLevel)
      return
    }

    setShowWrongMarker(true)
    const hideMarker = window.setTimeout(() => setShowWrongMarker(false), 1150)
    const startHintZoom = window.setTimeout(() => setDisplayedHintLevel(hintLevel), 1250)
    return () => {
      window.clearTimeout(hideMarker)
      window.clearTimeout(startHintZoom)
    }
  }, [hintLevel, isCorrect, lastSelectedIso, targetIso])

  const projection = useMemo(
    () => geoEqualEarth().fitExtent([[22, 18], [978, 520]], { type: 'Sphere' }),
    [],
  )
  const path = useMemo(() => geoPath(projection), [projection])

  const mapCountries = useMemo(() => {
    const collection = feature(
      worldTopology,
      worldTopology.objects.countries,
    ) as unknown as FeatureCollection<Geometry, { name: string }>

    return collection.features.flatMap((geometry): MapCountry[] => {
      const numericId = String(geometry.id).padStart(3, '0')
      const metadata = numericLookup.get(numericId)
      if (!metadata) return []
      const playable = countryByNumericId[numericId]

      return [{
        iso2: metadata.iso2,
        name: playable?.name ?? metadata.name,
        numericId,
        continent: continentFor(metadata.region, metadata.subregion),
        geometry,
      }]
    })
  }, [])

  const unmappedCountries = useMemo(() => {
    const mappedIsoCodes = new Set(mapCountries.map((country) => country.iso2))
    return countries.filter((country) => !mappedIsoCodes.has(country.iso2))
  }, [mapCountries])

  const marker = projection(targetLabel)
  const hoveredCountry = mapCountries.find((country) => country.iso2 === hoveredCountryIso)
  const targetCountry = mapCountries.find((country) => country.iso2 === targetIso)
  const targetNeedsAssistedHitArea = !targetCountry
    || targetCountry.geometry.geometry.type === 'MultiPolygon'
    || path.area(targetCountry.geometry) < 10
  const lastSelectedContinent = mapCountries.find((country) => country.iso2 === lastSelectedIso)?.continent
  const calculateFocus = (level: number) => {
    if (level === 0) {
      return { center: [500, 270] as [number, number], zoom: 1, label: '' }
    }

    if (level === 1) {
      const hemisphereCenter = projection([0, targetLabel[1] >= 0 ? 38 : -30]) ?? [500, 270]
      return {
        center: hemisphereCenter as [number, number],
        zoom: 1.32,
        label: `Hémisphère ${targetLabel[1] >= 0 ? 'Nord' : 'Sud'}`,
      }
    }

    const continentFocus: Record<ContinentCode | 'AN', { coordinates: [number, number]; zoom: number; label: string }> = {
      EU: { coordinates: [14, 51], zoom: 2.8, label: 'Europe' },
      AS: { coordinates: [88, 34], zoom: 1.72, label: 'Asie' },
      AF: { coordinates: [20, 2], zoom: 1.92, label: 'Afrique' },
      OC: { coordinates: [143, -25], zoom: 1.72, label: 'Océanie' },
      NA: { coordinates: [-103, 40], zoom: 1.78, label: 'Amérique du Nord' },
      SA: { coordinates: [-61, -19], zoom: 2.02, label: 'Amérique du Sud' },
      AN: { coordinates: [0, -80], zoom: 1.5, label: 'Antarctique' },
    }
    const continent = continentFocus[targetContinent]

    if (level === 2) {
      return {
        center: (projection(continent.coordinates) ?? [500, 270]) as [number, number],
        zoom: continent.zoom,
        label: continent.label,
      }
    }

    const precisionMultiplier = level === 3 ? 1.45 : level === 4 ? 1.9 : 2.4
    return {
      center: (projection(targetLabel) ?? [500, 270]) as [number, number],
      zoom: Math.min(7.5, continent.zoom * precisionMultiplier),
      label: level === 3 ? 'Sous-région' : level === 4 ? 'Zone côtière' : 'Zone précise',
    }
  }

  const focus = calculateFocus(showOverview ? 0 : displayedHintLevel)
  const effectiveZoom = manualZoom ?? focus.zoom
  const effectivePan = clampPan(pan, effectiveZoom)
  const effectiveFocus = { ...focus, zoom: effectiveZoom }

  useEffect(() => {
    const mapShell = mapShellRef.current
    if (!mapShell) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const direction = event.deltaY < 0 ? 1 : -1
      setManualZoom((currentZoom) => Math.min(8, Math.max(1, (currentZoom ?? focus.zoom) + direction * .25)))
    }

    mapShell.addEventListener('wheel', handleWheel, { passive: false })
    return () => mapShell.removeEventListener('wheel', handleWheel)
  }, [focus.zoom])

  const panTransform = `translate(${effectivePan[0]}px, ${effectivePan[1]}px)`
  const viewportTransform = `translate(500px, 270px) scale(${effectiveZoom}) translate(${-focus.center[0]}px, ${-focus.center[1]}px)`
  const wrongCountry = gameMode === 'country' && !isCorrect && showWrongMarker
    ? mapCountries.find((country) => country.iso2 === lastSelectedIso)
    : undefined
  const wrongCountryPoint = wrongCountry ? path.centroid(wrongCountry.geometry) : null
  const wrongMarkerPosition = wrongCountryPoint && Number.isFinite(wrongCountryPoint[0])
    ? [
        500 + effectivePan[0] + effectiveFocus.zoom * (wrongCountryPoint[0] - effectiveFocus.center[0]),
        270 + effectivePan[1] + effectiveFocus.zoom * (wrongCountryPoint[1] - effectiveFocus.center[1]),
      ] as [number, number]
    : null
  const wrongCardWidth = wrongCountry ? Math.min(300, Math.max(196, 79 + wrongCountry.name.length * 6.7)) : 196
  const wrongCardHalfWidth = wrongCardWidth / 2
  const wrongLabelOffsetX = wrongMarkerPosition
    ? wrongMarkerPosition[0] < wrongCardHalfWidth + 10
      ? wrongCardHalfWidth + 10 - wrongMarkerPosition[0]
      : wrongMarkerPosition[0] > 990 - wrongCardHalfWidth
        ? 990 - wrongCardHalfWidth - wrongMarkerPosition[0]
        : 0
    : 0
  const wrongLabelBelow = Boolean(wrongMarkerPosition && wrongMarkerPosition[1] < 70)
  const wrongCardY = wrongLabelBelow ? 8 : -49
  const wrongTextY = wrongLabelBelow ? 35 : -22
  const wrongPointerY = wrongLabelBelow ? 9 : -9

  return (
    <div
      ref={mapShellRef}
      className={`map-shell ${levelProgress ? 'has-level-progress' : ''}`}
      aria-label="Carte du monde interactive"
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.target as Element).closest('input, button')) return
        const movement: Partial<Record<string, [number, number]>> = {
          ArrowLeft: [44, 0],
          ArrowRight: [-44, 0],
          ArrowUp: [0, 44],
          ArrowDown: [0, -44],
        }
        const delta = movement[event.key]
        if (!delta) return
        event.preventDefault()
        setPan((currentPan) => clampPan([currentPan[0] + delta[0], currentPan[1] + delta[1]], effectiveZoom))
      }}
    >
      <div className={`map-tooltip ${displayedHintLevel > 0 && !showOverview ? 'is-zoomed' : ''}`} aria-live="polite">
        {displayedHintLevel > 0 && !showOverview
          ? `Zoom sur ${focus.label}`
          : gameMode === 'continents'
            ? 'Choisis un continent sur la carte'
            : gameMode === 'oceans'
              ? 'Choisis un océan sur la carte'
              : gameMode === 'seas'
                ? 'Choisis une mer sur la carte'
              : 'Choisis un pays sur la carte'}
      </div>

      {levelProgress ? (
        <div className={`map-level-progress ${levelProgress.selectable ? 'is-selectable' : ''}`}>
          <div>
            <span>Progression · {levelProgress.name}</span>
            {levelProgress.selectable ? <small className="map-level-progress-replay" aria-hidden="true">↻ Refaire</small> : null}
            <strong>{levelProgress.completed} / {levelProgress.total}</strong>
          </div>
          <div
            className="map-level-progress-track"
            role="progressbar"
            aria-label={levelProgress.label ?? `Progression du niveau ${levelProgress.level}`}
            aria-valuemin={0}
            aria-valuemax={levelProgress.total}
            aria-valuenow={levelProgress.completed}
          >
            <i style={{ width: `${(levelProgress.completed / levelProgress.total) * 100}%` }} />
          </div>
          {levelProgress.selectable ? (
            <button
              className="map-level-progress-action"
              type="button"
              aria-label="Choisir un niveau"
              title="Choisir ou refaire un niveau"
              onClick={onLevelProgressClick}
            />
          ) : null}
        </div>
      ) : null}

      {displayedHintLevel > 0 ? (
        <button
          className="overview-button"
          type="button"
          aria-label={showOverview ? 'Revenir au zoom de l’indice' : 'Revenir à la vue du monde'}
          onClick={() => {
            setShowOverview((value) => !value)
            setManualZoom(null)
            setPan([0, 0])
          }}
        >
          <Maximize2 size={14} />
          {showOverview ? 'Voir l’indice' : 'Vue mondiale'}
        </button>
      ) : null}

      <div className="zoom-controls" aria-label="Régler le niveau de zoom">
        <button
          type="button"
          aria-label="Dézoomer"
          disabled={effectiveZoom <= 1}
          onClick={() => setManualZoom(Math.max(1, effectiveZoom - .5))}
        ><Minus size={15} /></button>
        <label>
          <span>{effectiveZoom.toFixed(1)}×</span>
          <input
            type="range"
            min="1"
            max="8"
            step="0.25"
            value={effectiveZoom}
            aria-label="Niveau de zoom"
            onChange={(event) => setManualZoom(Number(event.target.value))}
          />
        </label>
        <button
          type="button"
          aria-label="Zoomer"
          disabled={effectiveZoom >= 8}
          onClick={() => setManualZoom(Math.min(8, effectiveZoom + .5))}
        ><Plus size={15} /></button>
        <button
          className="zoom-reset"
          type="button"
          aria-label="Réinitialiser le zoom"
          disabled={manualZoom === null && effectivePan[0] === 0 && effectivePan[1] === 0}
          onClick={() => {
            setManualZoom(null)
            setPan([0, 0])
          }}
        ><RotateCcw size={14} /></button>
      </div>

      <svg
        className={`world-map ${isDragging ? 'is-dragging' : ''}`}
        viewBox="0 0 1000 550"
        role="group"
        onPointerDown={(event) => {
          if (event.button !== 0) return
          activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
          if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.setPointerCapture?.(event.pointerId)
          }
          if (activePointers.current.size === 2) {
            const [first, second] = [...activePointers.current.values()]
            pinchStart.current = {
              distance: Math.hypot(second.x - first.x, second.y - first.y),
              midpoint: [(first.x + second.x) / 2, (first.y + second.y) / 2],
              zoom: effectiveZoom,
              pan: effectivePan,
            }
            dragStart.current = null
            didDrag.current = true
            setIsDragging(true)
            return
          }
          dragStart.current = { x: event.clientX, y: event.clientY, pan: effectivePan }
          didDrag.current = false
          setIsDragging(true)
        }}
        onPointerMove={(event) => {
          if (activePointers.current.has(event.pointerId)) {
            activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
          }
          if (activePointers.current.size >= 2 && pinchStart.current) {
            for (const pointerId of activePointers.current.keys()) {
              if (!event.currentTarget.hasPointerCapture?.(pointerId)) event.currentTarget.setPointerCapture?.(pointerId)
            }
            const [first, second] = [...activePointers.current.values()]
            const distance = Math.hypot(second.x - first.x, second.y - first.y)
            if (pinchStart.current.distance === 0) return
            const nextZoom = Math.min(8, Math.max(1, pinchStart.current.zoom * distance / pinchStart.current.distance))
            const bounds = event.currentTarget.getBoundingClientRect()
            const scaleX = bounds.width ? 1000 / bounds.width : 1
            const scaleY = bounds.height ? 550 / bounds.height : 1
            const midpoint: [number, number] = [(first.x + second.x) / 2, (first.y + second.y) / 2]
            const midpointDelta: [number, number] = [
              (midpoint[0] - pinchStart.current.midpoint[0]) * scaleX,
              (midpoint[1] - pinchStart.current.midpoint[1]) * scaleY,
            ]
            setManualZoom(nextZoom)
            setPan(clampPan([
              pinchStart.current.pan[0] + midpointDelta[0],
              pinchStart.current.pan[1] + midpointDelta[1],
            ], nextZoom))
            didDrag.current = true
            return
          }
          if (!dragStart.current) return
          const bounds = event.currentTarget.getBoundingClientRect()
          const scaleX = bounds.width ? 1000 / bounds.width : 1
          const scaleY = bounds.height ? 550 / bounds.height : 1
          const deltaX = (event.clientX - dragStart.current.x) * scaleX
          const deltaY = (event.clientY - dragStart.current.y) * scaleY
          if (Math.abs(deltaX) + Math.abs(deltaY) > 8 && !didDrag.current) {
            didDrag.current = true
            event.currentTarget.setPointerCapture?.(event.pointerId)
          }
          setPan(clampPan([dragStart.current.pan[0] + deltaX, dragStart.current.pan[1] + deltaY], effectiveZoom))
        }}
        onPointerUp={(event) => {
          activePointers.current.delete(event.pointerId)
          pinchStart.current = null
          dragStart.current = null
          setIsDragging(activePointers.current.size > 0)
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture?.(event.pointerId)
          }
          if (activePointers.current.size === 0) window.setTimeout(() => { didDrag.current = false }, 0)
        }}
        onPointerCancel={(event) => {
          activePointers.current.delete(event.pointerId)
          pinchStart.current = null
          dragStart.current = null
          didDrag.current = false
          setIsDragging(activePointers.current.size > 0)
        }}
        onPointerLeave={() => {
          if (activePointers.current.size === 0) {
            dragStart.current = null
            setIsDragging(false)
          }
        }}
        onClickCapture={(event) => {
          if (!didDrag.current) return
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <g className="map-pan-viewport" style={{ transform: panTransform }}>
          <g className="map-viewport" style={{ transform: viewportTransform }}>
          <path className="ocean" d={path({ type: 'Sphere' }) ?? ''} />
          {gameMode === 'oceans' ? (
            <g className="ocean-zones">
              {oceans.map((ocean) => {
                const selectOcean = () => {
                  if (!disabled) onSelectOcean?.(ocean.code, ocean.name)
                }
                return (
                  <g
                    className={`ocean-zone ${lastSelectedIso === ocean.code && !isCorrect ? 'is-wrong' : ''} ${targetOcean === ocean.code && isCorrect ? 'is-correct' : ''}`}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={`Océan ${ocean.name}`}
                    aria-disabled={disabled}
                    key={ocean.code}
                    onClick={selectOcean}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        selectOcean()
                      }
                    }}
                  >
                    {ocean.centers.map((center) => {
                      const point = projection(center)
                      return point ? <ellipse key={center.join(',')} cx={point[0]} cy={point[1]} rx={ocean.radius[0]} ry={ocean.radius[1]} /> : null
                    })}
                  </g>
                )
              })}
            </g>
          ) : null}
          <g className="countries">
            {mapCountries.map((country) => {
            const isTarget = country.iso2 === targetIso
            const isLast = country.iso2 === lastSelectedIso
            const isTutorialContinent = gameMode === 'continents' && country.continent === targetContinent
            const isHoveredContinent = gameMode === 'continents' && country.continent === hoveredContinent
            const isWrongContinent = gameMode === 'continents' && !isCorrect && lastSelectedContinent && country.continent === lastSelectedContinent
            const className = [
              'country-shape',
              `continent-${country.continent.toLowerCase()}`,
              isCorrect && gameMode === 'country' && isTarget ? 'is-correct' : '',
              isCorrect && isTutorialContinent ? 'is-continent-correct' : '',
              isHoveredContinent ? 'is-continent-hovered' : '',
              gameMode === 'country' && !isCorrect && isLast ? 'is-wrong' : '',
              isWrongContinent ? 'is-continent-wrong' : '',
            ].filter(Boolean).join(' ')

            const select = () => {
              const antarcticaIsSelectable = country.iso2 !== 'AQ' || gameMode === 'continents'
              if (gameMode !== 'oceans' && gameMode !== 'seas' && !disabled && antarcticaIsSelectable) onSelect(country.iso2, country.name, country.continent)
            }

            return (
              <path
                key={country.numericId}
                d={path(country.geometry) ?? ''}
                className={className}
                tabIndex={disabled || (country.iso2 === 'AQ' && gameMode !== 'continents') || gameMode === 'oceans' || gameMode === 'seas' ? -1 : 0}
                role={gameMode === 'oceans' || gameMode === 'seas' ? 'presentation' : 'button'}
                aria-label={gameMode === 'oceans' || gameMode === 'seas' ? undefined : country.name}
                aria-disabled={disabled || (country.iso2 === 'AQ' && gameMode !== 'continents') || gameMode === 'oceans' || gameMode === 'seas'}
                onMouseEnter={() => {
                  setHoveredCountryIso(country.iso2)
                  if (gameMode === 'continents') setHoveredContinent(country.continent)
                }}
                onMouseLeave={() => {
                  setHoveredCountryIso(undefined)
                  if (gameMode === 'continents') setHoveredContinent(undefined)
                }}
                onFocus={() => {
                  setHoveredCountryIso(country.iso2)
                  if (gameMode === 'continents') setHoveredContinent(country.continent)
                }}
                onBlur={() => {
                  setHoveredCountryIso(undefined)
                  if (gameMode === 'continents') setHoveredContinent(undefined)
                }}
                onClick={select}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    select()
                  }
                }}
              />
            )
            })}
          </g>

          {gameMode !== 'oceans' && gameMode !== 'seas' ? (
            <g className="micro-country-markers">
              {unmappedCountries.map((country) => {
                const point = projection(country.label)
                if (!point) return null

                const isTarget = country.iso2 === targetIso
                const isLast = country.iso2 === lastSelectedIso
                const isTutorialContinent = gameMode === 'continents' && country.continent === targetContinent
                const isHoveredContinent = gameMode === 'continents' && country.continent === hoveredContinent
                const isWrongContinent = gameMode === 'continents' && !isCorrect && lastSelectedContinent === country.continent
                const select = () => {
                  if (!disabled) onSelect(country.iso2, country.name, country.continent)
                }

                const dotClassName = [
                  'country-shape',
                  'micro-country-dot',
                  `continent-${country.continent.toLowerCase()}`,
                  hoveredCountryIso === country.iso2 ? 'is-marker-hovered' : '',
                  isCorrect && gameMode === 'country' && isTarget ? 'is-correct' : '',
                  isCorrect && isTutorialContinent ? 'is-continent-correct' : '',
                  isHoveredContinent ? 'is-continent-hovered' : '',
                  gameMode === 'country' && !isCorrect && isLast ? 'is-wrong' : '',
                  isWrongContinent ? 'is-continent-wrong' : '',
                ].filter(Boolean).join(' ')

                return (
                  <g
                    className="micro-country-marker"
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={country.name}
                    aria-disabled={disabled}
                    key={country.iso2}
                    onMouseEnter={() => {
                      setHoveredCountryIso(country.iso2)
                      if (gameMode === 'continents') setHoveredContinent(country.continent)
                    }}
                    onMouseLeave={() => {
                      setHoveredCountryIso(undefined)
                      if (gameMode === 'continents') setHoveredContinent(undefined)
                    }}
                    onFocus={() => {
                      setHoveredCountryIso(country.iso2)
                      if (gameMode === 'continents') setHoveredContinent(country.continent)
                    }}
                    onBlur={() => {
                      setHoveredCountryIso(undefined)
                      if (gameMode === 'continents') setHoveredContinent(undefined)
                    }}
                    onClick={select}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        select()
                      }
                    }}
                  >
                    <circle
                      className={dotClassName}
                      cx={point[0]}
                      cy={point[1]}
                      r={4.2 / effectiveZoom}
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      className="micro-country-hit-area"
                      cx={point[0]}
                      cy={point[1]}
                      r={7 / effectiveZoom}
                    />
                  </g>
                )
              })}
            </g>
          ) : null}

          {gameMode === 'seas' ? (
            <g className="sea-zones">
              {seas.map((sea) => {
                const point = projection(sea.center)
                const selectSea = () => {
                  if (!disabled) onSelectSea?.(sea.code, sea.name)
                }
                return point ? (
                  <g
                    className={`ocean-zone sea-zone ${lastSelectedIso === sea.code && !isCorrect ? 'is-wrong' : ''} ${targetSea === sea.code && isCorrect ? 'is-correct' : ''}`}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={`Mer ${sea.name}`}
                    aria-disabled={disabled}
                    key={sea.code}
                    onClick={selectSea}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        selectSea()
                      }
                    }}
                  >
                    <ellipse cx={point[0]} cy={point[1]} rx={sea.radius[0]} ry={sea.radius[1]} vectorEffect="non-scaling-stroke" />
                    <circle className="sea-zone-center" cx={point[0]} cy={point[1]} r="3.5" vectorEffect="non-scaling-stroke" />
                  </g>
                ) : null
              })}
            </g>
          ) : null}

          {hoveredCountry && gameMode !== 'oceans' && gameMode !== 'seas' && !disabled ? (
            <g className="country-hover-outline" aria-hidden="true">
              <path className="country-hover-halo" d={path(hoveredCountry.geometry) ?? ''} vectorEffect="non-scaling-stroke" />
              <path className="country-hover-line" d={path(hoveredCountry.geometry) ?? ''} vectorEffect="non-scaling-stroke" />
            </g>
          ) : null}

          {gameMode === 'country' && !isCorrect && marker && targetNeedsAssistedHitArea ? (
            <circle
              className="target-hit-area"
              cx={marker[0]}
              cy={marker[1]}
              r={18 / effectiveZoom}
              aria-hidden="true"
              onMouseEnter={() => setHoveredCountryIso(targetIso)}
              onMouseLeave={() => setHoveredCountryIso(undefined)}
              onClick={() => !disabled && onSelect(targetIso, targetName, targetContinent)}
            />
          ) : null}
          </g>
        </g>

        {wrongCountry && wrongMarkerPosition ? (
          <g
            key={`${wrongCountry.iso2}-${hintLevel}`}
            className="wrong-country-marker-position"
            transform={`translate(${wrongMarkerPosition[0]} ${wrongMarkerPosition[1]})`}
            role="img"
            aria-label={`Pays sélectionné : ${wrongCountry.name}`}
          >
            <g className="wrong-country-marker">
              <path d={`M ${wrongLabelOffsetX - 7} ${wrongPointerY} L 0 0 L ${wrongLabelOffsetX + 7} ${wrongPointerY} Z`} />
              <g transform={`translate(${wrongLabelOffsetX} 0)`}>
                <rect x={-wrongCardHalfWidth} y={wrongCardY} width={wrongCardWidth} height="42" rx="12" />
                <foreignObject className="wrong-marker-flag" x={-wrongCardHalfWidth + 14} y={wrongTextY - 15} width="34" height="22">
                  <CountryFlag iso2={wrongCountry.iso2} decorative />
                </foreignObject>
                <text
                  className="wrong-marker-name"
                  x={-wrongCardHalfWidth + 61}
                  y={wrongTextY - 2}
                  textLength={wrongCountry.name.length > 28 ? wrongCardWidth - 73 : undefined}
                  lengthAdjust={wrongCountry.name.length > 28 ? 'spacingAndGlyphs' : undefined}
                >{wrongCountry.name}</text>
              </g>
            </g>
          </g>
        ) : null}
      </svg>

      {gameMode === 'country' ? (
        <div className="map-legend" aria-label="Couleurs des continents">
          {[
            ['EU', 'Europe'], ['AS', 'Asie'], ['AF', 'Afrique'],
            ['NA', 'Amér. Nord'], ['SA', 'Amér. Sud'], ['OC', 'Océanie'],
          ].map(([code, label]) => (
            <span key={code}><i className={`legend-dot continent-${code.toLowerCase()}`} />{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
