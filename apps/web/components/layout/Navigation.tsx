"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const weeks = Array.from({ length: 6 }, (_, index) => {
  const week = index + 1
  return {
    number: week,
    label: `W${week}`,
    href: `/weeks/${week}`,
  }
})

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 w-full py-4 px-4 bg-void/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto overflow-x-auto scrollbar-thin">
        <div className="inline-flex min-w-full justify-center">
          <div className="inline-flex items-center gap-2 p-1.5 rounded-xl bg-cabinet border border-border">
            {weeks.map((week) => {
              const isActive = pathname === week.href
              return (
                <Link
                  key={week.number}
                  href={week.href}
                  className={cn(
                    "flex flex-col items-center px-3 py-2 rounded-lg border-2 transition-all duration-200 font-mono",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow-cyan border-primary"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-screen"
                  )}
                >
                  <span className="text-[10px] font-bold tracking-wider">{week.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
