export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 48 48" fill="none" aria-label="Perfect Smile logo">
        <path
          d="M15.2 8.5c3.1-2 5.8.4 8.8.4s5.7-2.4 8.8-.4c4.3 2.8 3.3 9.2 1.7 13.3-1.2 3-2 5.3-2.7 8.5-.8 3.8-2.1 8.2-5 8.2-2.1 0-2.1-5.8-2.8-8.1-.7 2.3-.7 8.1-2.8 8.1-2.9 0-4.2-4.4-5-8.2-.7-3.2-1.5-5.5-2.7-8.5-1.6-4.1-2.6-10.5 1.7-13.3Z"
          fill="white"
        />
        <path
          d="M17.2 21.7c3.7 4.2 9.9 4.7 13.8.7"
          stroke="#0f766e"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
