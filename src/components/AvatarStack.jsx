// overlapping circular avatars with "+n" overflow badge — the video's signature cluster
export default function AvatarStack({ people = [], max = 4, size = 34 }) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <div
          key={p.id ?? i}
          className="rounded-full border-2 border-ink-2 grid place-items-center font-medium text-white"
          style={{
            width: size, height: size,
            marginLeft: i === 0 ? 0 : -size * 0.35,
            zIndex: shown.length - i,
            background: `linear-gradient(135deg, hsl(${p.hue ?? 200} 60% 45%), hsl(${(p.hue ?? 200) + 40} 65% 38%))`,
            fontSize: size * 0.42,
          }}
        >
          {(p.name ?? '?')[0].toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="rounded-full border-2 border-ink-2 bg-ink-3 text-mist grid place-items-center text-xs font-medium"
          style={{ width: size, height: size, marginLeft: -size * 0.35 }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}
