export interface MapPlaceClickMessage {
  type: 'place-click'
  placeId: string
}

export interface MapHighlightMessage {
  type: 'highlight'
  placeId: string
}

export type MapIframeMessage = MapPlaceClickMessage | MapHighlightMessage

export function isMapPlaceClickMessage(value: unknown): value is MapPlaceClickMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as MapPlaceClickMessage).type === 'place-click' &&
    typeof (value as MapPlaceClickMessage).placeId === 'string'
  )
}

export function isMapHighlightMessage(value: unknown): value is MapHighlightMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as MapHighlightMessage).type === 'highlight' &&
    typeof (value as MapHighlightMessage).placeId === 'string'
  )
}
