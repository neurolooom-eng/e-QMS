import * as Lucide from 'lucide-react'
import type { LucideProps } from 'lucide-react'

/** Render a lucide icon by its PascalCase name, with a safe fallback. */
export function Icon({ name, ...props }: { name?: string } & LucideProps) {
  const Cmp = (name && (Lucide as any)[name]) || Lucide.Circle
  return <Cmp {...props} />
}
