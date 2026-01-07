"use client"

import * as React from "react"
// Radix import removed
// Radix import removed
// I should build a custom one or install radix. 
// The user prompt said "install node-appwrite lucide-react framer-motion clsx tailwind-merge". 
// It NOT include radix-ui. I must build without radix.

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <div className="relative flex items-center">
            <input
                type="checkbox"
                ref={ref}
                className={cn(
                    "peer h-4 w-4 shrink-0 rounded-sm border border-cyan-500 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-primary-foreground",
                    "appearance-none bg-white/5 checked:bg-cyan-500",
                    className
                )}
                {...props}
            />
            <Check className="h-3 w-3 text-black absolute left-[2px] top-[2px] pointer-events-none opacity-0 peer-checked:opacity-100" />
        </div>
    )
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
