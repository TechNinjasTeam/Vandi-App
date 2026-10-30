import { Inbox } from "lucide-react"

export function EmptyCard({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
      <span aria-hidden="true" className="mb-1 flex size-12 items-center justify-center rounded-full bg-inverse text-inverse-foreground">
        <Inbox className="size-5" />
      </span>
      <span className="titulo-card">{title}</span>
      {description && <span className="apoio max-w-[280px] text-muted-foreground">{description}</span>}
      {children}
    </div>
  )
}
