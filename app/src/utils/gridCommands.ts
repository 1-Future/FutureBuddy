export type GridCommand =
  | { type: 'show_grid' }
  | { type: 'hide_grid' }
  | { type: 'select_cell'; cellNumber: number }
  | { type: 'select_subcell'; letter: string }
  | { type: 'direct_tap'; cellNumber: number; letter: string }
  | { type: 'back' };

export function parseGridCommand(text: string): GridCommand | null {
  const lower = text.toLowerCase().trim();

  // "show grid" / "grid on"
  if (/^(?:grid on|show grid|grid show|enable grid|grid)$/.test(lower)) {
    return { type: 'show_grid' };
  }

  // "hide grid" / "grid off"
  if (/^(?:grid off|hide grid|grid hide|disable grid)$/.test(lower)) {
    return { type: 'hide_grid' };
  }

  // "back" — return from zoomed to numbers
  if (/^(?:back|go back|cancel|reset)$/.test(lower)) {
    return { type: 'back' };
  }

  // Direct compound: "tap 3a" / "click 1b" / "press 12c" or just "3a"
  const directMatch = lower.match(/^(?:tap|click|press)?\s*(\d+)([a-z])$/);
  if (directMatch) {
    return {
      type: 'direct_tap',
      cellNumber: parseInt(directMatch[1], 10),
      letter: directMatch[2],
    };
  }

  // Number only: "tap 3" / "3" — select/zoom into cell
  const numMatch = lower.match(/^(?:tap|click|press)?\s*(\d+)$/);
  if (numMatch) {
    return { type: 'select_cell', cellNumber: parseInt(numMatch[1], 10) };
  }

  // Letter only: "a" / "tap a" — select sub-cell (when zoomed)
  const letterMatch = lower.match(/^(?:tap|click|press)?\s*([a-z])$/);
  if (letterMatch) {
    return { type: 'select_subcell', letter: letterMatch[1] };
  }

  return null;
}
