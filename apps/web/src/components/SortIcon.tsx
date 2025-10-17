'use client';

type State = 'none' | 'asc' | 'desc';

export default function SortIcon({ state }: { state: State }) {
  const upActive = state === 'asc';
  const downActive = state === 'desc';
  return (
    <span className="inline-flex ml-1">
      <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
        <path
          d="M5 2L1.5 5.5h7L5 2z"
          fill="currentColor"
          opacity={upActive ? 1 : 0.35}
        />
        <path
          d="M5 10l3.5-3.5h-7L5 10z"
          fill="currentColor"
          opacity={downActive ? 1 : 0.35}
        />
      </svg>
    </span>
  );
}
