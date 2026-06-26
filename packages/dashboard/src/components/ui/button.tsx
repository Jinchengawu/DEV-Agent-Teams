import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const buttonVariants = {
  variant: {
    default: "border border-[#ff5c1f]/45 bg-[#ff5c1f] text-white shadow-[0_0_24px_rgba(255,92,31,0.22)] hover:bg-[#ff713d]",
    destructive: "border border-[#ff5252]/45 bg-[#e34242] text-white hover:bg-[#ff5252]",
    outline: "border border-white/14 bg-white/[0.04] text-[#dce7f5] hover:border-[#5be5ff]/45 hover:bg-[#5be5ff]/10 hover:text-white",
    secondary: "border border-white/10 bg-white/[0.08] text-[#f4f8ff] hover:bg-white/[0.12]",
    ghost: "text-[#c7d2e1] hover:bg-white/[0.08] hover:text-white",
    link: "text-[#64e7ff] underline-offset-4 hover:underline",
  },
  size: {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  },
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5be5ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090d] disabled:pointer-events-none disabled:opacity-50",
          buttonVariants.variant[variant],
          buttonVariants.size[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
