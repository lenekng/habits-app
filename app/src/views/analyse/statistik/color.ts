type RGB = [number, number, number];

const NEGATIVE: RGB = [227, 73, 72];
const NEUTRAL: RGB = [240, 239, 236];
const POSITIVE: RGB = [42, 120, 214];

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function rgbFor(r: number): RGB {
  const c = Math.max(-1, Math.min(1, r));
  return c < 0 ? mix(NEUTRAL, NEGATIVE, -c) : mix(NEUTRAL, POSITIVE, c);
}

export function correlationColor(r: number): string {
  const [red, green, blue] = rgbFor(r);
  return `rgb(${red}, ${green}, ${blue})`;
}

// Wahrgenommene Helligkeit (0-255, Rec.-601-Gewichte); unter ~150 ist weißer Text lesbarer.
export function correlationTextColor(r: number): string {
  const [red, green, blue] = rgbFor(r);
  const brightness = 0.299 * red + 0.587 * green + 0.114 * blue;
  return brightness < 150 ? '#fff' : 'var(--text)';
}
