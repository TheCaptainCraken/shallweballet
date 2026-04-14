// Centralized API response types shared across routes

export interface AnimalStats {
  racer_id: string
  total_races: number
  wins: number
  losses: number
  win_rate: number
  luck: number
  win_streak: number
  loss_streak: number
  current_win_streak: number
  current_loss_streak: number
}

export interface StatsResponse {
  animals: AnimalStats[]
  luckiest: AnimalStats | null
  unluckiest: AnimalStats | null
  win_streak_holder: AnimalStats | null
  loss_streak_holder: AnimalStats | null
  total_races_run: number
}

export interface RaceParticipant {
  racer_id: string
  position: number
  lane: number
}

export interface RaceHistoryItem {
  id: number
  created_at: string
  has_ticks: boolean
  participants: RaceParticipant[]
}

export interface RaceDetail {
  participants: RaceParticipant[]
  ticks: Array<Record<string, number>> | null
}

export interface HistoryResponse {
  races: RaceHistoryItem[]
  next_cursor: string | null
}
