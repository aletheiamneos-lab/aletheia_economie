import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  ChartCandlestick,
  Factory,
  Globe2,
  Landmark,
  SearchCheck,
  ShoppingBasket,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import type { GameId } from '../economy-games/economyGames'
export type { GameId } from '../economy-games/economyGames'

export interface GamePresentation {
  accent: string
  icon: LucideIcon
}

export const gamePresentations: Record<GameId, GamePresentation> = {
  '01_market_maker': { accent: '#2f8792', icon: TrendingUp },
  '02_consumer_lab': { accent: '#d2785f', icon: ShoppingBasket },
  '03_factory_master': { accent: '#446f91', icon: Factory },
  '04_inflation_detective': { accent: '#9b6557', icon: SearchCheck },
  '05_central_bank': { accent: '#285e78', icon: Landmark },
  '06_job_market': { accent: '#3a806e', icon: BriefcaseBusiness },
  '07_wall_street_lab': { accent: '#6d658f', icon: ChartCandlestick },
  '08_global_trader': { accent: '#237f88', icon: Globe2 },
  '09_economic_pulse': { accent: '#bb7652', icon: Banknote },
  '10_president': { accent: '#183f5a', icon: Building2 },
}

const gameTitles: Record<GameId, string> = {
  '01_market_maker': 'Piața cafelei',
  '02_consumer_lab': 'Banii de weekend',
  '03_factory_master': 'Fabrica',
  '04_inflation_detective': 'Detectivul inflației',
  '05_central_bank': 'Banca centrală',
  '06_job_market': 'Recensământul cartierului',
  '07_wall_street_lab': 'La bursă',
  '08_global_trader': 'Carpați Trade',
  '09_economic_pulse': 'Pulsul economiei',
  '10_president': 'Președinte pentru 4 ani',
}

export function getGamePresentation(gameId: string) {
  return gamePresentations[gameId as GameId] ?? null
}

export function getGameMeta(gameId: string) {
  const presentation = getGamePresentation(gameId)
  if (!presentation) return null
  return { id: gameId as GameId, title: gameTitles[gameId as GameId], ...presentation }
}
