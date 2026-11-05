/**
 * SRS Client — talks to the server SRS API.
 * Falls back to localStorage if server unavailable.
 */

import { getToken, loadAccount, getAuthState } from './account';

const LOCAL_KEY = 'kelsey_srs_cards';

export interface SRSCardData {
  front: string;
  back: string;
  explanation?: string;
  category?: string;
}

export interface SRSCard extends SRSCardData {
  id: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: number;
  lastReviewedAt: number | null;
}

function getAuthHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function getUserId(): string | null {
  const account = loadAccount();
  return account?.id ?? null;
}

// ── Local fallback storage ──

function readLocalCards(): SRSCard[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalCards(cards: SRSCard[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error('[SRS] Local write failed:', e);
  }
}

// ── API functions ──

export async function fetchDueCards(): Promise<SRSCard[]> {
  const userId = getUserId();
  if (!userId) return [];

  try {
    const res = await fetch(`/api/users/${userId}/srs/due`, { headers: getAuthHeader() });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[SRS] Server fetch failed, using local:', e);
  }

  // Fallback: local cards due now
  const now = Date.now();
  return readLocalCards().filter(c => c.nextReviewAt <= now);
}

export async function fetchSRSStats(): Promise<{ total: number; dueToday: number; learned: number }> {
  const userId = getUserId();
  if (!userId) {
    const local = readLocalCards();
    const now = Date.now();
    return {
      total: local.length,
      dueToday: local.filter(c => c.nextReviewAt <= now).length,
      learned: local.filter(c => c.repetitions >= 3).length,
    };
  }

  try {
    const res = await fetch(`/api/users/${userId}/srs/stats`, { headers: getAuthHeader() });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[SRS] Stats fetch failed:', e);
  }

  const local = readLocalCards();
  const now = Date.now();
  return {
    total: local.length,
    dueToday: local.filter(c => c.nextReviewAt <= now).length,
    learned: local.filter(c => c.repetitions >= 3).length,
  };
}

export async function submitReview(cardId: string, quality: number): Promise<SRSCard | null> {
  const userId = getUserId();
  if (!userId) return null;

  try {
    const res = await fetch(`/api/users/${userId}/srs/${cardId}`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ quality }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[SRS] Submit failed, updating locally:', e);
  }

  // Local fallback: simple SM-2
  const cards = readLocalCards();
  const card = cards.find(c => c.id === cardId);
  if (card) {
    if (quality < 3) {
      card.repetitions = 0;
      card.intervalDays = 0;
      card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
    } else {
      card.repetitions += 1;
      card.intervalDays = card.repetitions <= 1 ? 1 : card.repetitions === 2 ? 3 : Math.round(card.intervalDays * card.easeFactor);
      card.easeFactor = Math.max(1.3, card.easeFactor + (quality === 3 ? 0.1 : 0));
    }
    card.nextReviewAt = Date.now() + card.intervalDays * 86400000;
    card.lastReviewedAt = Date.now();
    writeLocalCards(cards);
    return card;
  }
  return null;
}

export async function importCards(cards: SRSCardData[]): Promise<number> {
  const userId = getUserId();
  if (!userId) {
    // Local-only import
    const existing = readLocalCards();
    const now = Date.now();
    const newCards = cards.map((c, i) => ({
      ...c,
      id: `local_${now}_${i}`,
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      nextReviewAt: now,
      lastReviewedAt: null,
    }));
    writeLocalCards([...existing, ...newCards]);
    return cards.length;
  }

  try {
    const res = await fetch(`/api/users/${userId}/srs/bulk`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ cards }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.inserted;
    }
  } catch (e) {
    console.warn('[SRS] Bulk import failed:', e);
  }
  return 0;
}

/**
 * Extract SRS-ready cards from a set of BoardCards (e.g., on lesson completion).
 */
export function extractCardsForSRS(boardCards: Array<{ title: string; body: string; example?: string; type: string }>): SRSCardData[] {
  return boardCards
    .filter(c => c.type === 'vocabulary' || c.type === 'phrase')
    .map(c => ({
      front: c.title,
      back: c.body,
      explanation: c.example,
      category: c.type,
    }));
}
