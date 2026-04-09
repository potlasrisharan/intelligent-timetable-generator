import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/45 text-sm font-medium text-[#1a1a1a] transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none backdrop-blur-[20px] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive shadow-[0_14px_34px_rgba(101,142,201,0.14)]",
  {
    variants: {
      variant: {
        default:
          'bg-[rgba(89,148,255,0.3)] text-primary-foreground hover:bg-[rgba(89,148,255,0.38)]',
        destructive:
          'bg-[rgba(251,113,133,0.28)] text-[#6b1021] hover:bg-[rgba(251,113,133,0.36)] focus-visible:ring-destructive/20',
        outline:
          'bg-[rgba(255,255,255,0.18)] text-[#1f3351] hover:bg-[rgba(255,255,255,0.28)]',
        secondary:
          'bg-[rgba(255,214,115,0.28)] text-[#5f4810] hover:bg-[rgba(255,214,115,0.36)]',
        ghost:
          'border-transparent bg-transparent text-[#2b4465] shadow-none hover:border-white/45 hover:bg-[rgba(255,255,255,0.18)] hover:text-[#1a1a1a]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
