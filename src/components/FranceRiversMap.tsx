import { useMemo, useRef, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { frenchRegions } from '../data/france'
import type { FrenchRiver } from '../data/rivers'

type FranceRiversMapProps = {
  rivers: FrenchRiver[]
  targetCode: string
  selectedCode?: string
  isCorrect: boolean
  disabled?: boolean
  onSelect: (river: FrenchRiver) => void
  onLevelPickerClick?: () => void
}

function clampPan([x, y]: [number, number], zoom: number): [number, number] {
  const limitX = Math.max(0, (zoom - 1) * 330)
  const limitY = Math.max(0, (zoom - 1) * 210)
  return [Math.min(limitX, Math.max(-limitX, x)), Math.min(limitY, Math.max(-limitY, y))]
}

export function FranceRiversMap({ rivers, targetCode, selectedCode, isCorrect, disabled = false, onSelect, onLevelPickerClick }: FranceRiversMapProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<[number, number]>([0, 0])
  const [dragging, setDragging] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gestureStart = useRef<{
    distance?: number
    midpoint?: [number, number]
    point?: [number, number]
    zoom: number
    pan: [number, number]
  } | null>(null)
  const moved = useRef(false)
  const franceCollection = useMemo<FeatureCollection<Geometry>>(() => ({
    type: 'FeatureCollection',
    features: frenchRegions.map((region) => region.geometry),
  }), [])
  const projection = useMemo(() => geoMercator().fitExtent([[75, 20], [925, 530]], franceCollection), [franceCollection])
  const path = useMemo(() => geoPath(projection), [projection])
  const effectivePan = clampPan(pan, zoom)

  return (
    <div className="france-map-shell river-map-shell" aria-label="Carte des fleuves français">
      {onLevelPickerClick ? <button className="france-level-picker" type="button" onClick={onLevelPickerClick}>Niveaux</button> : null}
      <div className="zoom-controls france-zoom-controls" aria-label="Régler le niveau de zoom">
        <button type="button" aria-label="Dézoomer" disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - .5))}><Minus size={15} /></button>
        <button type="button" aria-label="Zoomer" disabled={zoom >= 6} onClick={() => setZoom((value) => Math.min(6, value + .5))}><Plus size={15} /></button>
        <button type="button" aria-label="Réinitialiser le zoom" disabled={zoom === 1 && pan[0] === 0 && pan[1] === 0} onClick={() => { setZoom(1); setPan([0, 0]) }}><RotateCcw size={14} /></button>
      </div>
      <svg
        className={`france-map river-map ${dragging ? 'is-dragging' : ''}`}
        viewBox="0 0 1000 550"
        role="group"
        onPointerDown={(event) => {
          if (event.button !== 0) return
          if (event.isPrimary && pointers.current.size > 0) {
            for (const pointerId of pointers.current.keys()) {
              if (event.currentTarget.hasPointerCapture?.(pointerId)) {
                event.currentTarget.releasePointerCapture?.(pointerId)
              }
            }
            pointers.current.clear()
            gestureStart.current = null
          }
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
          if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.setPointerCapture?.(event.pointerId)
          }
          const values = [...pointers.current.values()]
          if (values.length === 2) {
            gestureStart.current = {
              distance: Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y),
              midpoint: [(values[0].x + values[1].x) / 2, (values[0].y + values[1].y) / 2],
              zoom,
              pan: effectivePan,
            }
            moved.current = true
          } else {
            gestureStart.current = { point: [event.clientX, event.clientY], zoom, pan: effectivePan }
            moved.current = false
          }
          setDragging(true)
        }}
        onPointerMove={(event) => {
          if (!pointers.current.has(event.pointerId) || !gestureStart.current) return
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
          const bounds = event.currentTarget.getBoundingClientRect()
          const scaleX = bounds.width ? 1000 / bounds.width : 1
          const scaleY = bounds.height ? 550 / bounds.height : 1
          const values = [...pointers.current.values()]
          if (values.length >= 2 && gestureStart.current.distance && gestureStart.current.midpoint) {
            for (const pointerId of pointers.current.keys()) {
              if (!event.currentTarget.hasPointerCapture?.(pointerId)) event.currentTarget.setPointerCapture?.(pointerId)
            }
            const distance = Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y)
            const nextZoom = Math.min(6, Math.max(1, gestureStart.current.zoom * distance / gestureStart.current.distance))
            const midpoint: [number, number] = [(values[0].x + values[1].x) / 2, (values[0].y + values[1].y) / 2]
            setZoom(nextZoom)
            setPan(clampPan([
              gestureStart.current.pan[0] + (midpoint[0] - gestureStart.current.midpoint[0]) * scaleX,
              gestureStart.current.pan[1] + (midpoint[1] - gestureStart.current.midpoint[1]) * scaleY,
            ], nextZoom))
            moved.current = true
          } else if (gestureStart.current.point) {
            const deltaX = (event.clientX - gestureStart.current.point[0]) * scaleX
            const deltaY = (event.clientY - gestureStart.current.point[1]) * scaleY
            if (Math.abs(deltaX) + Math.abs(deltaY) > 8 && !moved.current) {
              moved.current = true
              event.currentTarget.setPointerCapture?.(event.pointerId)
            }
            setPan(clampPan([gestureStart.current.pan[0] + deltaX, gestureStart.current.pan[1] + deltaY], zoom))
          }
        }}
        onPointerUp={(event) => {
          if (!pointers.current.delete(event.pointerId)) return
          gestureStart.current = null
          setDragging(pointers.current.size > 0)
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId)
          if (!pointers.current.size) window.setTimeout(() => { moved.current = false }, 0)
        }}
        onPointerCancel={(event) => {
          if (!pointers.current.delete(event.pointerId)) return
          gestureStart.current = null
          moved.current = false
          setDragging(false)
        }}
        onLostPointerCapture={(event) => {
          if (!pointers.current.delete(event.pointerId)) return
          gestureStart.current = null
          setDragging(pointers.current.size > 0)
          if (!pointers.current.size) window.setTimeout(() => { moved.current = false }, 0)
        }}
        onClickCapture={(event) => {
          if (!moved.current) return
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <g className="france-map-pan-viewport" style={{ transform: `translate(${effectivePan[0]}px, ${effectivePan[1]}px)` }}>
          <g className="france-map-viewport" style={{ transform: `translate(500px, 275px) scale(${zoom}) translate(-500px, -275px)` }}>
            <g className="river-france-background" aria-hidden="true">
              {frenchRegions.map((region) => <path key={region.code} d={path(region.geometry) ?? ''} />)}
            </g>
            <g className="river-lines">
              {rivers.map((river) => {
                const select = () => { if (!disabled) onSelect(river) }
                return (
                  <g className={`river-choice ${selectedCode === river.code && !isCorrect ? 'is-wrong' : ''} ${targetCode === river.code && isCorrect ? 'is-correct' : ''}`} key={river.code}>
                    <path className="river-line" d={path(river.geometry) ?? ''} aria-hidden="true" />
                    <path
                      className="river-hit-area"
                      d={path(river.geometry) ?? ''}
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      aria-label={river.name}
                      aria-disabled={disabled}
                      onClick={(event) => { event.currentTarget.blur(); select() }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          select()
                        }
                      }}
                    />
                  </g>
                )
              })}
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
