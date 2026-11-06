/** Reusable SVG gradient definitions for Recharts. Uses style (not attributes) so CSS variables resolve. */
/* NOTE: call these as functions ({areaGradient('id')}), not as <Components/>: Recharts only renders raw SVG children. */
export function areaGradient(id = 'gArea') {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: 'var(--chart-a)', stopOpacity: 0.5 }} />
        <stop offset="100%" style={{ stopColor: 'var(--chart-b)', stopOpacity: 0 }} />
      </linearGradient>
      <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" style={{ stopColor: 'var(--chart-a)' }} />
        <stop offset="100%" style={{ stopColor: 'var(--chart-c)' }} />
      </linearGradient>
    </defs>
  );
}

export function barGradients() {
  return (
    <defs>
      <linearGradient id="gBarA" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: 'var(--chart-a)' }} />
        <stop offset="100%" style={{ stopColor: 'var(--chart-c)' }} />
      </linearGradient>
      <linearGradient id="gBarB" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style={{ stopColor: 'var(--chart-b)' }} />
        <stop offset="100%" style={{ stopColor: 'var(--chart-d)' }} />
      </linearGradient>
    </defs>
  );
}
