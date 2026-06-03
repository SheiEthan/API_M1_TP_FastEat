/**
 * Rate limiter pour la route de login — protection brute force.
 *
 * 3 phases :
 *   1. Soft lockout  (3 échecs)  → délai croissant avant nouvelle tentative
 *   2. Hard ban      (5 échecs)  → IP bloquée 15 min
 *
 * En production combiner avec :
 *   - CAPTCHA déclenché dès le 3e échec (ex: hCaptcha / Turnstile)
 *   - Redis pour le store (survie aux redémarrages + multi-instances)
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;       // 1 minute
const BAN_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Délais soft lockout par nombre d'échecs : 3 → 10s, 4 → 30s
const SOFT_DELAYS_MS: Record<number, number> = {
  3: 10_000,
  4: 30_000,
};

interface IpRecord {
  failures: number;
  firstFailureAt: number;
  lockedUntil?: number;
  softUnlockAt?: number;
}

class LoginRateLimiter {
  private readonly store = new Map<string, IpRecord>();

  /**
   * Vérifier si l'IP peut tenter un login.
   * Retourne { allowed: true } ou { allowed: false, retryAfter: secondes, reason }.
   */
  check(ip: string): { allowed: true } | { allowed: false; retryAfter: number; reason: "hard_ban" | "soft_lockout" } {
    const now = Date.now();
    const record = this.store.get(ip);

    if (!record) return { allowed: true };

    // Hard ban actif
    if (record.lockedUntil && now < record.lockedUntil) {
      return {
        allowed: false,
        retryAfter: Math.ceil((record.lockedUntil - now) / 1000),
        reason: "hard_ban",
      };
    }

    // Fenêtre expirée → reset
    if (now - record.firstFailureAt > WINDOW_MS && !record.lockedUntil) {
      this.store.delete(ip);
      return { allowed: true };
    }

    // Soft lockout actif
    if (record.softUnlockAt && now < record.softUnlockAt) {
      return {
        allowed: false,
        retryAfter: Math.ceil((record.softUnlockAt - now) / 1000),
        reason: "soft_lockout",
      };
    }

    return { allowed: true };
  }

  /**
   * Enregistrer un échec de login pour cette IP.
   */
  recordFailure(ip: string): void {
    const now = Date.now();
    let record = this.store.get(ip);

    if (!record || (now - record.firstFailureAt > WINDOW_MS && !record.lockedUntil)) {
      record = { failures: 0, firstFailureAt: now };
      this.store.set(ip, record);
    }

    record.failures += 1;

    // Hard ban
    if (record.failures >= MAX_ATTEMPTS) {
      record.lockedUntil = now + BAN_DURATION_MS;
      record.softUnlockAt = undefined;
      return;
    }

    // Soft lockout progressif
    const delay = SOFT_DELAYS_MS[record.failures];
    if (delay) {
      record.softUnlockAt = now + delay;
    }
  }

  /**
   * Login réussi → reset le compteur de l'IP.
   */
  recordSuccess(ip: string): void {
    this.store.delete(ip);
  }

  /** Nombre d'échecs restants avant hard ban (pour les headers de réponse). */
  remainingAttempts(ip: string): number {
    const record = this.store.get(ip);
    if (!record) return MAX_ATTEMPTS;
    return Math.max(0, MAX_ATTEMPTS - record.failures);
  }
}

export const loginRateLimiter = new LoginRateLimiter();
