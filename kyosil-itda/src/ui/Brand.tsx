/** 널리잇다 mark: two seats joined by a bridge, with a spark of an idea above. Original artwork. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="kl-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4B8EF7" />
          <stop offset="1" stopColor="#0B50D0" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill="url(#kl-g)" />
      <path className="logo-arc" d="M16 42c0-9 7.2-16 16-16s16 7 16 16" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <circle cx="16" cy="45" r="6.5" fill="#fff" />
      <circle cx="48" cy="45" r="6.5" fill="#FFD25C" />
      <path className="logo-spark" d="M32 9l2 4.6 4.6 2-4.6 2-2 4.6-2-4.6-4.6-2 4.6-2z" fill="#fff" />
    </svg>
  );
}
