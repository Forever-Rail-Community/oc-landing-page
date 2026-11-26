// The arrivals board: what's coming to the Operations Center and when it's due. It says when, never how far along,
// so nothing gives away what's finished. Rows show in this order.
export type Due = 'opening' | 'soon' | 'later'

export const DUE_LABEL: Record<Due, string> = {
  opening: 'Early 2027',
  soon: 'Spring 2027',
  later: 'Later'
}

export interface Arrival {
  name: string
  does: string
  due: Due
}

export const ARRIVALS: Arrival[] = [
  { name: 'Live map', does: 'The whole railroad, with every train where it is right now.', due: 'opening' },
  { name: 'Server status', does: 'Know which servers are up before you join.', due: 'opening' },
  { name: 'CTC board', does: 'Clear signals and line switches, right from your browser.', due: 'opening' },
  { name: 'Dispatch desks', does: 'Split the line so a whole crew can dispatch it together.', due: 'opening' },
  { name: 'Roadmap and requests', does: "Ask for what you want, then watch it get built.", due: 'opening' },
  { name: 'Shift changes', does: "Ask for a desk, or cover a neighbor's.", due: 'soon' },
  { name: 'More on the board', does: 'More of the railroad, right where the dispatcher needs it.', due: 'later' },
  { name: 'Something on the radio', does: "That's all we're saying.", due: 'later' }
]
