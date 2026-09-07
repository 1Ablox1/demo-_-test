import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
  'h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive: 'bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20',
        outline: 'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
        /* CargoWare domain chips */
        critical: 'rounded-md border-red-200 bg-red-100 text-red-700',
        high: 'rounded-md border-amber-200 bg-amber-100 text-amber-700',
        medium: 'rounded-md border-yellow-200 bg-yellow-100 text-yellow-700',
        normal: 'rounded-md border-emerald-200 bg-emerald-100 text-emerald-700',
        pack: 'rounded-md border-border bg-muted text-muted-foreground',
        raciR: 'rounded-md border-primary bg-primary text-primary-foreground font-bold',
        raciA: 'rounded-md border-zinc-800 bg-zinc-800 text-white font-bold',
        raciC: 'rounded-md border-primary bg-primary-tint text-teal-800 font-bold',
        raciI: 'rounded-md border-zinc-300 bg-zinc-100 text-zinc-500 font-bold',
        gate: 'rounded-md border-orange-200 bg-orange-50 text-amber-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
