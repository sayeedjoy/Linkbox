export type HSV = { h: number; s: number; v: number };

export function hexToHsv(hex: string): HSV {
  const parsed = parseHex(hex);
  const r = parsed.r / 255;
  const g = parsed.g / 255;
  const b = parsed.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s, v };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0,
    g = 0,
    b = 0;
  switch (i) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    default:
      r = v;
      g = p;
      b = q;
  }
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const n = Math.round(x * 255);
        const s = n.toString(16);
        return s.length === 1 ? '0' + s : s;
      })
      .join('')
  );
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const s = hex.replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '');
  const n = parseInt(s.slice(0, 6).padEnd(6, '0'), 16);
  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
  };
}

export function normalizeHex(raw: string): string {
  const s = raw.replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '');
  if (s.length >= 6) return '#' + s.slice(0, 6).toLowerCase();
  if (s.length > 0) return '#' + s.padEnd(6, '0').toLowerCase();
  return '#000000';
}
