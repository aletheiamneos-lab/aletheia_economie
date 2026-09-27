// Economy Lab games: types + helpers for the host app (framework-agnostic).
// Copy this file as-is. Do not change the event names or field names.

export type GameId =
  | "01_market_maker" | "02_consumer_lab" | "03_factory_master" | "04_inflation_detective"
  | "05_central_bank" | "06_job_market" | "07_wall_street_lab" | "08_global_trader"
  | "09_economic_pulse" | "10_president";

export interface GameManifestEntry {
  id: GameId;
  file: string;        // file name inside /games/
  title: string;       // display title (Romanian)
  topic: string;       // one-line description (Romanian)
  chapters: number[];  // textbook chapter numbers
  steps: number;       // number of levels/rounds shown in the game's progress bar
  maxCoins: number;    // maximum coins a player can earn
}

export interface GameManifest { version: 1; basePath: string; games: GameManifestEntry[]; }

interface Base { source: "economy-lab"; version: 1; gameId: GameId; }
export type GameEvent =
  | (Base & { type: "ready" })                                             // game loaded
  | (Base & { type: "level"; level: number; totalLevels: number })          // new level/round/quarter started (1-based)
  | (Base & { type: "coins"; coins: number; delta: number })               // coin total changed
  | (Base & { type: "answer"; question: string; correct: boolean })        // a multiple-choice exam question was answered
  | (Base & { type: "finished"; coins: number; maxCoins: number; stars: 1 | 2 | 3 }) // final screen shown
  | (Base & { type: "restart" });                                          // player pressed "Joacă din nou"

// Uses Vite's `base` setting automatically (import.meta.env.BASE_URL is "/" by default).
const VITE_BASE: string = ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL) ?? "/";
export const GAMES_BASE_PATH = VITE_BASE.replace(/\/?$/, "/") + "games/";

export function gameUrl(entry: Pick<GameManifestEntry, "file">): string {
  return GAMES_BASE_PATH + entry.file;
}

export async function loadGameManifest(): Promise<GameManifest> {
  const res = await fetch(GAMES_BASE_PATH + "games.json");
  if (!res.ok) throw new Error(`games.json: HTTP ${res.status}`);
  return (await res.json()) as GameManifest;
}

function isGameEvent(data: unknown): data is GameEvent {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return d.source === "economy-lab" && d.version === 1 && typeof d.gameId === "string" && typeof d.type === "string";
}

/**
 * Listen to events from game iframes served from the same origin.
 * Returns an unsubscribe function. Call it when the component unmounts.
 */
export function listenToGameEvents(handler: (event: GameEvent) => void): () => void {
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return;
    if (!isGameEvent(e.data)) return;
    handler(e.data);
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

/** Create the iframe element for a game. Use this exact configuration. */
export function createGameIframe(entry: Pick<GameManifestEntry, "file" | "title">): HTMLIFrameElement {
  const f = document.createElement("iframe");
  f.src = gameUrl(entry);
  f.title = entry.title;
  f.loading = "eager";
  f.style.width = "100%";
  f.style.height = "100dvh";
  f.style.border = "0";
  f.style.display = "block";
  return f;
}
