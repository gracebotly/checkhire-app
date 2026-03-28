export function PageHeader({
  title,
  subtitle,
  rightSlot,
}: {
  title: string
  subtitle?: string
  rightSlot?: React.ReactNode
}) {
  return (
    <header className="border-b border-gray-200 bg-white px-8 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {rightSlot ?? null}
      </div>
    </header>
  )
}
