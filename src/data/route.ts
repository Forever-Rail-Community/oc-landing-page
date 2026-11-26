// Coming down the line: what's in the Operations Center and how far along each piece is, in order. Moving a piece
// along is a one-word change to its stage.
export type Stage = 'in-place' | 'testing' | 'building' | 'boxed'

export const STAGE_LABEL: Record<Stage, string> = {
  'in-place': 'In place',
  testing: 'In testing',
  building: 'Being built',
  boxed: 'Still in the box'
}

export interface Station {
  name: string
  blurb: string
  stage: Stage
}

export const STATIONS: Station[] = [
  { name: 'Live map and status', blurb: 'The railroad and its servers, live.', stage: 'in-place' },
  { name: 'CTC board', blurb: 'Signals and switches, from your browser.', stage: 'in-place' },
  { name: 'Dispatch desks', blurb: 'The line, split between dispatchers.', stage: 'testing' },
  { name: 'Shift changes', blurb: 'Ask for a desk, or cover two.', stage: 'building' },
  { name: 'Something on the radio', blurb: "That's all we're saying.", stage: 'boxed' }
]

// How far the line is lit: up to the last piece in place, and halfway on to the next.
export const progress = (stations: Station[]) => {
  const done = stations.filter((s) => s.stage === 'in-place').length
  return Math.min(1, (done - 0.5) / (stations.length - 1))
}
