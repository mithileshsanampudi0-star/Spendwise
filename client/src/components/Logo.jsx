import { useId } from 'react';

/**
 * SpendWise logo: a gradient tile holding a flowing "S" whose upper terminal rises like a trend line,
 * with a spark at the tip. `compact` shows the mark only.
 */
export function LogoMark({ size = 36, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--logo-a, #4CC9F0)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--logo-b, #8B5CF6)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-c, #D946EF)' }} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="24" y1="0" x2="24" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${id}-bg)`} />
      <rect width="48" height="48" rx="14" fill={`url(#${id}-shine)`} />
      <path
        d="M33.5 15.5C31 12.6 24.5 12 21 14.6C17.4 17.3 18.4 21.6 23.4 23.4L26.2 24.4C31.4 26.3 32 30.8 28.4 33.6C24.8 36.3 18.2 35.6 14.5 32"
        stroke="var(--logo-ink, #fff)"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="35.5" cy="11.5" r="3" fill="var(--logo-ink, #fff)" />
      <circle cx="35.5" cy="11.5" r="5.6" stroke="var(--logo-ink, #fff)" strokeOpacity="0.35" strokeWidth="1.2" />
    </svg>
  );
}

export default function Logo({ size = 36, compact = false, className = '' }) {
  return (
    <span className={`logo ${className}`}>
      <LogoMark size={size} />
      {!compact && (
        <span className="logo__text" style={{ fontSize: `${Math.round(size * 0.58)}px` }}>
          Spend<span className="logo__accent">Wise</span>
        </span>
      )}
    </span>
  );
}
