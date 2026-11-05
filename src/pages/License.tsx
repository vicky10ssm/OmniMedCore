import { useEffect, useRef, useState, type ReactNode } from "react";
import { APP_NAME, APP_TAGLINE } from "../app/brand";
import { useLicense } from "../licensing/LicenseContext";
import { Btn, Card, ErrorNote, Icon, Labeled } from "../ui/kit";

export function LicenseGate({ children }: { children: ReactNode }) {
  const { status, dbUnavailable, reloadLicense } = useLicense();
  const retried = useRef(false);

  useEffect(() => {
    if (status === "invalid" && dbUnavailable && !retried.current) {
      // This screen can mount immediately after the database unlock flow. The
      // initial licence load failed because the encrypted database was still
      // locked, so retry once the boot screen hands control back.
      retried.current = true;
      void reloadLicense();
    }
  }, [status, dbUnavailable, reloadLicense]);

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Verifying licenceâ€¦</p>
      </div>
    );
  }
  if (status === "unlicensed" || status === "invalid") {
    return <ActivationScreen />;
  }
  return <>{children}</>;
}

function ActivationScreen() {
  const {
    tenantId,
    deviceId,
    error,
    importLicenseText,
    editionLabel,
  } = useLicense();
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const activate = async () => {
    setBusy(true);
    setMessage("");
    try {
      await importLicenseText(text);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not activate licence");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 px-4 py-10">
      <Card className="w-full max-w-lg p-6">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-base font-bold text-white">
            O
          </div>
          <h1 className="text-lg font-semibold">{APP_NAME} licence activation</h1>
          <p className="text-xs text-slate-500">{APP_TAGLINE}</p>
          <p className="mt-2 text-sm text-slate-600">
            {error || "Import the signed licence file issued for this clinic and terminal."}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Edition: {editionLabel}
          </p>
        </div>

        <div className="mb-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p><b>Tenant ID:</b> <span className="num break-all">{tenantId}</span></p>
          <p className="mt-1"><b>Hardware Device ID:</b> <span className="num break-all">{deviceId || "Loadingâ€¦"}</span></p>
          <p className="mt-2 text-slate-400">
            Send both IDs to OmniMed Core support when purchasing or moving this installation.
            This Device ID is a hardware fingerprint for this machine; the licence file is protected by
            this Windows account.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void file.text().then(setText);
              }}
            />
            Choose licence file
          </label>
          <Labeled label="Or paste licence JSON">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
              placeholder='{"payload":{...},"signature":"..."}'
            />
          </Labeled>
          <ErrorNote message={message} />
          <Btn
            variant="primary"
            className="w-full"
            onClick={() => void activate()}
            disabled={busy || !text.trim()}
          >
            {busy ? "Verifyingâ€¦" : "Activate licence"}
          </Btn>
          <p className="text-center text-[11px] text-slate-400">
            Offline activation verifies the vendor signature, tenant and device binding.
          </p>
        </div>
      </Card>
    </div>
  );
}

export function LicenseSettingsPanel() {
  const {
    status,
    payload,
    modules,
    tenantId,
    deviceId,
    daysRemaining,
    readOnly,
    importLicenseText,
    removeLicense,
    editionLabel,
  } = useLicense();
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const activate = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await importLicenseText(text);
      setMessage("Licence updated.");
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not activate licence");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-4 lg:col-span-2">
        <h2 className="text-sm font-semibold">Current licence</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">Edition</dt><dd className="font-medium">{editionLabel}</dd></div>
          <div><dt className="text-xs text-slate-500">Status</dt><dd className="font-medium capitalize">{status}</dd></div>
          <div><dt className="text-xs text-slate-500">Customer</dt><dd>{payload?.customerName || "â€”"}</dd></div>
          <div><dt className="text-xs text-slate-500">Licence ID</dt><dd className="num">{payload?.licenseId || "â€”"}</dd></div>
          <div><dt className="text-xs text-slate-500">Expires</dt><dd>{payload?.expiresAt ? new Date(payload.expiresAt).toLocaleDateString("en-IN") : payload ? "Perpetual" : "â€”"}</dd></div>
          <div><dt className="text-xs text-slate-500">Remaining</dt><dd>{daysRemaining === null ? "â€”" : `${daysRemaining} days`}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Licensed modules</dt><dd className="mt-1 flex flex-wrap gap-1">{modules.size > 0 ? [...modules].map((m) => <span key={m} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">{m}</span>) : "â€”"}</dd></div>
          <div><dt className="text-xs text-slate-500">Tenant ID</dt><dd className="num break-all text-xs">{tenantId}</dd></div>
          <div><dt className="text-xs text-slate-500">Hardware Device ID</dt><dd className="num break-all text-xs">{deviceId}</dd></div>
        </dl>
        {readOnly && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This licence is past its grace period. New writes are disabled; existing records can be
            viewed, printed and exported until renewal.
          </p>
        )}
        {status === "grace" && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Licence expired but is in the 30-day grace period. Renew before grace ends.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={() => window.location.reload()}>
            <Icon name="check" className="h-4 w-4" /> Reload licence
          </Btn>
          <Btn variant="ghost" onClick={() => void removeLicense()}>Remove stored licence</Btn>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Import renewal / edition</h2>
        <p className="mt-1 text-xs text-slate-500">
          Import the signed file after adding modules, renewing, or moving this terminal.
        </p>
        <div className="mt-3 space-y-3">
          <input
            type="file"
            accept=".json,application/json"
            className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void file.text().then(setText);
            }}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            placeholder="Paste licence JSON"
          />
          <ErrorNote message={error} />
          {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}
          <Btn variant="primary" className="w-full" onClick={() => void activate()} disabled={busy || !text.trim()}>
            {busy ? "Verifyingâ€¦" : "Import licence"}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
