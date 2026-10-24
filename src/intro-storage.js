const key = 'coopserve:intro-seen';
export function hasSeenIntro() {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}
export function markIntroSeen() {
  try { localStorage.setItem(key, 'true'); } catch { /* Storage can be unavailable in private browsing. */ }
}
