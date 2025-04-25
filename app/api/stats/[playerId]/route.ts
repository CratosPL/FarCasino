import { NextResponse } from "next/server"

// Simple in-memory storage for player data
// In a production app, you would use a database
const players = new Map()

export async function GET(request: Request, { params }: { params: { playerId: string } }) {
  const playerId = params.playerId

  // Validate player exists
  if (!players.has(playerId)) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 })
  }

  const player = players.get(playerId)

  return NextResponse.json({
    playerId: player.playerId,
    balance: player.balance,
    spinCount: player.spinCount,
    totalBet: player.totalBet,
    totalWin: player.totalWin,
    rtp: player.totalBet > 0 ? (player.totalWin / player.totalBet) * 100 : 0,
  })
}
