// The encryption gate shown before sign-in.
//
// Order matters and is deliberate: the database is unlocked FIRST, then users
// sign in. Unlocking answers "can this machine read its own records"; signing in
// answers "should this person be allowed to see them". Two different questions,
// two different secrets.
//
// The recovery-code route is always visible but visually secondary â€” it is the
// escape hatch for a forgotten passphrase, and hiding it would mean someone
// discovers it only after they are already locked out.

import { useState, type FormEvent } from "react";
import { Btn, ErrorNote, Labeled, TextInput } from "../ui/kit";
import { unlockWithPassphrase, unlockWithRecoveryCode } from "./index";

export default function UnlockScreen({
  onUnlocked,
}: {
  onUnlocked: () => void;
}) {
  const [mode, setMode] = useState<"passphrase" | "recovery">("passphrase");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "passphrase") await unlockWithPassphrase(value);
      else await unlockWithRecoveryCode(value);
      // Clear the secret from React state before handing control back.
      setValue("");
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white">
            O
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            {mode === "passphrase" ? "Unlock this computer" : "Use a recovery code"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "passphrase"
              ? "The records on this computer are encrypted. Enter the centre's passphrase to open them."
              : "Enter one of the recovery codes issued when encryption was set up."}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <Labeled label={mode === "passphrase" ? "Passphrase" : "Recovery code"}>
            <TextInput
              type={mode === "passphrase" ? "password" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder={
                mode === "passphrase" ? "Centre passphrase" : "xxxx-xxxx-xxxx-â€¦"
              }
            />
          </Labeled>

          {error && <ErrorNote message={error} />}

          <Btn type="submit" variant="primary" disabled={busy || !value}>
            {busy ? "Checkingâ€¦" : "Unlock"}
          </Btn>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "passphrase" ? "recovery" : "passphrase");
            setValue("");
            setError("");
          }}
          className="mt-3 w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          {mode === "passphrase"
            ? "Forgotten the passphrase? Use a recovery code"
            : "Back to the passphrase"}
        </button>
      </div>
    </div>
  );
}
