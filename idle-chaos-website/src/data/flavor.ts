// Centralized flavor & microcopy constants for consistent dark humor tone.
// Import from this file instead of hardcoding scattered one-liners.

export const taglines = {
  dashboardHeader: "Your Account (Mildly Judged)",
  dashboardSubtitle: "Shared currency. Shared mistakes. Characters act independently; consequences are communal.",
  charactersEmpty: "No characters yet. Forge one on the Play page before the void notices.",
  loginHeader: "Welcome Back (We Tracked Your AFK)",
  loginSubtitle: "Enter credentials. We promise not to A/B test your typing speed today.",
  signupHeader: "Join The Experiment",
  signupSubtitle: "One email, one username, endless incremental updates.",
};

export const errors = {
  authGeneric: "Authentication failed. Either a typo or the universe rejecting you.",
  loginBadCreds: "Those credentials look fictional. Try again or embrace permanent guesthood.",
  signupTaken: "Name or email already claimed by another ambitious soul.",
};

export function pick<T extends readonly string[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const afkPhrases = [
  "Pretending productivity",
  "Daydreaming about loot tables",
  "Practicing ethical resource extraction",
  "Negotiating with a furnace",
] as const;
