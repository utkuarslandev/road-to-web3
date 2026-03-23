"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getHomepageRoadmapItems } from "@road/config"

export function Header() {
  const weeks = getHomepageRoadmapItems()
  const levelsCount = weeks.length
  const contractsCount = weeks.filter(week => week.status === "ready").length
  const networksCount = new Set(weeks.flatMap(week => week.networks)).size

  return (
    <header className="relative w-full py-20 px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30 scanlines" />

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <Badge variant="player1" className="mb-8 text-sm px-4 py-1.5">
          PLAYER 1 READY
        </Badge>

        <Link href="/" className="block group">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-normal mb-4 tracking-tight">
            <span className="text-foreground">Road to</span>{" "}
            <span className="text-neon-cyan group-hover:opacity-90 transition-opacity">Web3</span>
          </h1>
        </Link>

        <Link href="/" className="block group">
          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl italic mb-8">
            <span className="gradient-arcade group-hover:opacity-90 transition-opacity">Trophy Collection</span>
          </h2>
        </Link>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-16 leading-relaxed">
          A curated showcase of on-chain achievements, smart contracts,
          and interactive Web3 experiences. Each level unlocks new blockchain skills.
        </p>

        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          <ScoreCard value={String(levelsCount)} label="WEEKS" color="cyan" />
          <ScoreCard value={String(contractsCount)} label="CONTRACTS" color="magenta" />
          <ScoreCard value={String(networksCount)} label="NETWORKS" color="yellow" />
        </div>
      </div>
    </header>
  )
}

function ScoreCard({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color: "cyan" | "magenta" | "yellow" | "green"
}) {
  const colorClasses = {
    cyan: "border-neon-cyan/30 hover:border-neon-cyan/60 hover:shadow-glow-cyan",
    magenta: "border-neon-magenta/30 hover:border-neon-magenta/60 hover:shadow-glow-magenta",
    yellow: "border-neon-yellow/30 hover:border-neon-yellow/60 hover:shadow-glow-yellow",
    green: "border-neon-green/30 hover:border-neon-green/60 hover:shadow-glow-green",
  }

  const textClasses = {
    cyan: "text-neon-cyan",
    magenta: "text-neon-magenta",
    yellow: "text-neon-yellow",
    green: "text-neon-green",
  }

  return (
    <Card
      variant="score"
      className={`min-w-[160px] md:min-w-[180px] transition-all duration-300 ${colorClasses[color]}`}
    >
      <CardContent className="p-6 text-center">
        <div className={`font-mono text-5xl md:text-6xl font-bold mb-2 ${textClasses[color]} animate-score-count`}>
          {value}
        </div>
        <div className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {label}
        </div>
      </CardContent>
    </Card>
  )
}
