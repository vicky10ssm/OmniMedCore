import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDb } from "../db";
import type { UserRow } from "../db/types";
import { now, uuid } from "../db/helpers";
import { getCurrentTenantId, tenantAnd } from "../db/tenant";
import { hashPassword, passwordPolicyOk, verifyPassword } from "./crypto";
import { consumeRecoveryCode, verifyTotp } from "./totp";
import { isMonitor } from "../app/mode";

export interface SessionUser {
  id: string;
  username: string;
  full_name: string;
  role: "admin" | "operator";
  must_change_password: number;
  can_authorize_reports: boolean;
}

/** Returned by a first-factor login when the account has 2FA armed. */
export interface PendingSecondFactor {
  userId: string;
  username: string;
  fullName: string;
}

interface AuthCtx {
  user: SessionUser | null;
  ready: boolean;
  /** Set when the database could not be opened at all (e.g. a second tab). */
  bootError: string;
  /**
   * Stage one. Resolves to a pending challenge when the account has 2FA, or to
   * null when the caller is now fully signed in.
   */
  login: (
    username: string,
    password: string
  ) => Promise<PendingSecondFactor | null>;
  /** Stage two: completes a 2FA challenge with a TOTP or recovery code. */
  completeSecondFactor: (code: string, isRecovery: boolean) => Promise<void>;
  /** Abandons a half-finished 2FA challenge. */
  cancelSecondFactor: () => void;
  pending: PendingSecondFactor | null;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<void>;
  reloadUser: () => Promise<void>;
  /** Reruns boot after the database was unlocked or after an error screen. */
  retryBoot: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const SESSION_KEY = "diagbill.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState("");
  const [pending, setPending] = useState<PendingSecondFactor | null>(null);

  useEffect(() => {
    // A boot that never finishes leaves the user staring at "Opening database…"
    // with no way to tell whether it is working or broken. This turns any hang
    // into a message they can act on.
    const timer = window.setTimeout(() => {
      setBootError(
        "The database took too long to open. Close any other tab running this app, then reload the page."
      );
      setReady(true);
    }, 20_000);

    void (async () => {
      try {
        await getDb(); // ensure schema + device id before any query
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as SessionUser;
          const db = await getDb();
          const [tenantClause, tenantParams] = tenantAnd();
          const row = await db.get<UserRow>(
            `SELECT * FROM users WHERE id = ? AND is_active = 1 AND deleted = 0 ${tenantClause}`,
            [saved.id, ...tenantParams]
          );
          if (row) setUser(toSession(row));
        }
      } catch (e) {
        setBootError(
          e instanceof Error ? e.message : "Could not open the local database"
        );
      } finally {
        window.clearTimeout(timer);
        setReady(true);
      }
    })();
  }, []);

  /** Writes the session and audit row once every factor has passed. */
  const establishSession = useCallback(async (row: UserRow) => {
    const db = await getDb();
    const session = toSession(row);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    setPending(null);
    // A monitoring session is read-only, so it leaves no audit trail — the
    // audit log itself is a synced, append-only record and cannot be written
    // from a read-only database. Monitoring sign-ins are therefore not
    // recorded; that is a deliberate trade for staying write-free, and the
    // cloud tier can log them server-side later.
    if (!isMonitor()) {
      await db.run(
        "INSERT INTO audit_log (id, user_id, action, entity, entity_id, detail, created_at, updated_at, device_id, dirty, deleted, tenant_id) VALUES (?,?,'login','','','', ?,?,?,1,0,?)",
        [
          uuid(),
          row.id,
          now(),
          now(),
          row.device_id || "",
          getCurrentTenantId(),
        ]
      );
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const row = await db.get<UserRow>(
        `SELECT * FROM users WHERE username = ? AND is_active = 1 AND deleted = 0 ${tenantClause}`,
        [username.trim().toLowerCase(), ...tenantParams]
      );
      if (!row || !(await verifyPassword(password, row.password_hash))) {
        throw new Error("Invalid username or password");
      }
      // Password alone is not enough when 2FA is armed — do not create a session.
      if (row.totp_enabled && row.totp_secret) {
        const challenge = {
          userId: row.id,
          username: row.username,
          fullName: row.full_name,
        };
        setPending(challenge);
        return challenge;
      }
      await establishSession(row);
      return null;
    },
    [establishSession]
  );

  const completeSecondFactor = useCallback(
    async (code: string, isRecovery: boolean) => {
      if (!pending) throw new Error("No sign-in in progress");
      const db = await getDb();
      const [tenantClause, tenantParams] = tenantAnd();
      const row = await db.get<UserRow>(
        `SELECT * FROM users WHERE id = ? AND is_active = 1 AND deleted = 0 ${tenantClause}`,
        [pending.userId, ...tenantParams]
      );
      if (!row) throw new Error("Account is no longer available");

      if (isRecovery) {
        // Recovery codes are single-use, and proving that requires writing to
        // the database — which a monitoring session cannot do. Accepting one
        // here would leave it valid forever, so we refuse the whole path.
        if (isMonitor()) {
          throw new Error(
            "Recovery codes can't be used in the monitoring view. Sign in on the centre's computer, or use your authenticator code."
          );
        }
        const { ok, remaining } = await consumeRecoveryCode(row.recovery_codes, code);
        if (!ok) throw new Error("That recovery code is not valid");
        // Consuming a recovery code is a write.
        await db.run(
          `UPDATE users SET recovery_codes = ?, updated_at = ?, dirty = 1 WHERE id = ? ${tenantClause}`,
          [JSON.stringify(remaining), now(), row.id, ...tenantParams]
        );
        await db.run(
          "INSERT INTO audit_log (id, user_id, action, entity, entity_id, detail, created_at, updated_at, device_id, dirty, deleted, tenant_id) VALUES (?,?,'2fa_recovery','','','', ?,?,?,1,0,?)",
          [
            uuid(),
            row.id,
            now(),
            now(),
            row.device_id || "",
            getCurrentTenantId(),
          ]
        );
        await establishSession(row);
        return;
      }

      const result = await verifyTotp(row.totp_secret, code, row.totp_last_step);
      if (!result.ok) throw new Error("Incorrect or expired code");
      if (!isMonitor()) {
        // Burn the step so the same code can't be replayed within its window.
        // A monitoring session cannot do this, which is why monitor sign-ins
        // require a current code (see the note in FEATURE_DECISIONS.md).
        await db.run(
          `UPDATE users SET totp_last_step = ?, updated_at = ?, dirty = 1 WHERE id = ? ${tenantClause}`,
          [result.step ?? -1, now(), row.id, ...tenantParams]
        );
      }
      await establishSession(row);
    },
    [pending, establishSession]
  );

  const cancelSecondFactor = useCallback(() => setPending(null), []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const changePassword = useCallback(
    async (newPassword: string) => {
      if (!user) throw new Error("Not signed in");
      if (!passwordPolicyOk(newPassword))
        throw new Error("Password must be at least 6 characters");
      const db = await getDb();
      const hash = await hashPassword(newPassword);
      const [tenantClause, tenantParams] = tenantAnd();
      await db.run(
        `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ?, dirty = 1 WHERE id = ? ${tenantClause}`,
        [hash, now(), user.id, ...tenantParams]
      );
      const updated = { ...user, must_change_password: 0 };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      setUser(updated);
    },
    [user]
  );

  const reloadUser = useCallback(async () => {
    if (!user) return;
    const db = await getDb();
    const [tenantClause, tenantParams] = tenantAnd();
    const row = await db.get<UserRow>(
      `SELECT * FROM users WHERE id = ? ${tenantClause}`,
      [user.id, ...tenantParams]
    );
    if (row) setUser(toSession(row));
  }, [user]);

  const retryBoot = useCallback(() => {
    setReady(false);
    setBootError("");
    setUser(null);
    setPending(null);
    void (async () => {
      try {
        await getDb();
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as SessionUser;
          const db = await getDb();
          const [tenantClause, tenantParams] = tenantAnd();
          const row = await db.get<UserRow>(
            `SELECT * FROM users WHERE id = ? AND is_active = 1 AND deleted = 0 ${tenantClause}`,
            [saved.id, ...tenantParams]
          );
          if (row) setUser(toSession(row));
        }
      } catch (e) {
        setBootError(
          e instanceof Error ? e.message : "Could not open the local database"
        );
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      bootError,
      login,
      completeSecondFactor,
      cancelSecondFactor,
      pending,
      logout,
      changePassword,
      reloadUser,
      retryBoot,
    }),
    [
      user,
      ready,
      bootError,
      login,
      completeSecondFactor,
      cancelSecondFactor,
      pending,
      logout,
      changePassword,
      reloadUser,
      retryBoot,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function toSession(row: UserRow): SessionUser {
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    must_change_password: row.must_change_password,
    can_authorize_reports: row.can_authorize_reports === 1,
  };
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
