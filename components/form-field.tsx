import * as React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type FormFieldProps = React.ComponentProps<typeof Input> & {
  id: string
  label: string
  error?: string
  hint?: React.ReactNode // below the input
  action?: React.ReactNode // inside the input, on the right (eye button)
}

export function FormField({ id, label, error, hint, action, className, ...rest }: FormFieldProps) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(action && "pr-[52px]", className)}
          {...rest}
        />
        {action && <div className="absolute top-0.5 right-0.5">{action}</div>}
      </div>
      {error && (
        <span id={`${id}-error`} className="apoio text-destructive-text">
          {error}
        </span>
      )}
      {hint && <div id={`${id}-hint`}>{hint}</div>}
    </div>
  )
}
