import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-[#5be5ff]/30 bg-[#5be5ff]/14 text-[#8ff0ff] hover:bg-[#5be5ff]/20",
    secondary: "border-white/12 bg-white/[0.07] text-[#dce7f5] hover:bg-white/[0.10]",
    destructive: "border-[#ff5252]/35 bg-[#ff5252]/14 text-[#ff9a9a] hover:bg-[#ff5252]/20",
    outline: "border-white/14 bg-transparent text-[#dce7f5]",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5be5ff] focus:ring-offset-2 focus:ring-offset-[#08090d]",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
