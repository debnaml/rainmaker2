'use client';

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function ProgressDonut({
  percent,
  size = 60,
  thickness = 8,
  color = '#237781',
  trackColor = '#E6E6E6',
  label,
  labelClassName,
}) {
  const clamped = clampPercent(percent);
  const angle = (clamped / 100) * 360;
  const innerSize = Math.max(size - thickness * 2, 0);

  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{
        height: `${size}px`,
        width: `${size}px`,
        backgroundImage: `conic-gradient(${color} ${angle}deg, ${trackColor} ${angle}deg)`
      }}
      aria-hidden="true"
    >
      <div
        className="rounded-full bg-white"
        style={{ height: `${innerSize}px`, width: `${innerSize}px` }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary${labelClassName ? ` ${labelClassName}` : ''}`}
      >
        {label ?? `${clamped}%`}
      </span>
    </div>
  );
}
