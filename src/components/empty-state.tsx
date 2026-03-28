import { cn } from "@/lib/utils"

export function EmptyState({
  icon,
  title,
  subtitle,
  className,
  cta,
}: {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  cta?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <div className="mx-auto max-w-sm text-center">
        {icon ? <div className="mx-auto mb-4 text-slate-600">{icon}</div> : null}
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
        {cta ? <div className="mt-4">{cta}</div> : null}
      </div>
    </div>
  )
}
