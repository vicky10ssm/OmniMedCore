import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { APP_NAME, APP_TAGLINE } from "../app/brand";
import { Btn, Card, ErrorNote, Labeled, TextInput } from "../ui/kit";

export default function Login() {
  const { login, pending } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  if (pending) return <SecondFactor />;

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-base font-bold text-white">
            O
          </div>
          <h1 className="text-lg font-semibold">{APP_NAME}</h1>
          <p className="text-xs text-slate-500">{APP_TAGLINE}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Sign in to your centre or pharmacy
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Labeled label="Username">
            <TextInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              placeholder="Enter username"
            />
          </Labeled>
          <Labeled label="Password">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Labeled>
          <ErrorNote message={error} />
          <Btn type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? "Signing inâ€¦" : "Sign in"}
          </Btn>
        </form>
        <p className="mt-4 text-center text-[11px] text-slate-400">
          Contact your administrator if you need first-time access.
        </p>
      </Card>
    </div>
  );
}

/** Second step of sign-in: the 6-digit authenticator code, or a recovery code. */
function SecondFactor() {
  const { pending, completeSecondFactor, cancelSecondFactor } = useAuth();
  const [code, setCode] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await completeSecondFactor(code, isRecovery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-lg font-semibold">Two-factor verification</h1>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          {isRecovery
            ? "Enter one of the recovery codes you saved when you set up two-factor sign-in."
            : `Enter the 6-digit code from your authenticator app for ${pending?.fullName || pending?.username}.`}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Labeled label={isRecovery ? "Recovery code" : "Authentication code"}>
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              inputMode={isRecovery ? "text" : "numeric"}
              autoComplete="one-time-code"
              placeholder={isRecovery ? "abcde-abcde" : "123456"}
              className="num tracking-widest"
            />
          </Labeled>
          <ErrorNote message={error} />
          <Btn type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? "Verifyingâ€¦" : "Verify and sign in"}
          </Btn>
          <div className="flex justify-between pt-1 text-xs">
            <button
              type="button"
              className="text-teal-700 hover:underline"
              onClick={() => {
                setIsRecovery(!isRecovery);
                setCode("");
                setError("");
              }}
            >
              {isRecovery ? "Use authenticator code" : "Use a recovery code"}
            </button>
            <button
              type="button"
              className="text-slate-500 hover:underline"
              onClick={cancelSecondFactor}
            >
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function ForcePasswordChange() {
  const { changePassword } = useAuth();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw1 !== pw2) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await changePassword(pw1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-lg font-semibold">Set your password</h1>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          This is your first sign-in. Choose a new password (min 6 characters).
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Labeled label="New password">
            <TextInput
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              autoFocus
              autoComplete="new-password"
            />
          </Labeled>
          <Labeled label="Confirm password">
            <TextInput
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
            />
          </Labeled>
          <ErrorNote message={error} />
          <Btn type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? "Savingâ€¦" : "Save password"}
          </Btn>
        </form>
      </Card>
    </div>
  );
}
