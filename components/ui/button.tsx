import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent text-sm font-bold whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-[#FF6B4A]/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-[#FF6B4A] to-[#E63946] text-white shadow-md shadow-red-500/20 hover:opacity-95',
        outline:
          'border-rose-200 bg-white text-[#E63946] hover:bg-[#FFF1F2] hover:border-[#FF6B4A]',
        secondary:
          'bg-[#FFF1F2] text-[#E63946] hover:bg-[#FFE4E6]',
        ghost:
          'hover:bg-[#FFF1F2] hover:text-[#E63946]',
        destructive:
          'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
        link: 'text-[#E63946] underline-offset-4 hover:underline hover:text-[#FF6B4A]',
      },
      size: {
        default:
          'h-10 gap-2 px-4 py-2.5',
        xs: "h-7 gap-1 rounded-lg px-2 text-xs",
        sm: "h-8.5 gap-1.5 rounded-xl px-3 text-xs",
        lg: 'h-11 gap-2.5 px-5 text-base',
        icon: 'size-9 rounded-xl',
        'icon-xs':
          "size-6 rounded-lg",
        'icon-sm':
          'size-7 rounded-lg',
        'icon-lg': 'size-10 rounded-xl',
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
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
