// Offline ABDM FHIR draft preview. No network transport is attempted.

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getDb } from "../db";
import { prepareAbdmDraft, saveAbdmDraft, type AbdmDraft } from "../abdm/export";
import { Btn, ErrorNote, Icon, Modal } from "../ui/kit";

export default function AbdmExport({
  orderId,
  testName,
  onClose,
}: {
  orderId: string;
  testName: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<AbdmDraft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const db = await getDb();
        setDraft(await prepareAbdmDraft(db, orderId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not prepare the ABDM document");
      }
    })();
  }, [orderId]);

  const persistAndDownload = async () => {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      let id = savedId;
      if (!id) {
        const db = await getDb();
        id = await saveAbdmDraft(db, draft, user?.id ?? "");
        setSavedId(id);
      }
      const blob = new Blob([JSON.stringify(draft.bundle, null, 2)], {
        type: "application/fhir+json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ABDM-${orderId.slice(0, 8)}-${draft.bundleId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the ABDM draft");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={`ABDM FHIR draft — ${testName}`} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
          <p className="font-medium">Local ABDM document preparation only</p>
          <p className="mt-0.5">
            Uses the NRCeS FHIR R4 IG v6.5.0 DocumentBundle with
            DiagnosticReportRecord/DiagnosticReportLab. No patient data has been sent
            to ABDM. Live exchange requires sandbox credentials, consent validation,
            transport and contract testing.
          </p>
        </div>

        {!draft && !error && (
          <p className="py-8 text-center text-sm text-slate-400">Building FHIR R4 document…</p>
        )}

        {draft && (
          <>
            <div className="grid gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-slate-500">Bundle</p>
                <p className="num break-all font-medium">{draft.bundleId}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-slate-500">Profile version</p>
                <p className="font-medium">ABDM FHIR R4 · 6.5.0</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-slate-500">Consent</p>
                <p className="font-medium text-emerald-700">Active · care-delivery</p>
              </div>
            </div>

            {draft.issues.length > 0 && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <p className="font-semibold">Local structure checks failed</p>
                <ul className="mt-1 list-disc pl-4">
                  {draft.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                JSON preview · Bundle · document
              </p>
              <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">
                {JSON.stringify(draft.bundle, null, 2)}
              </pre>
            </div>
          </>
        )}

        <ErrorNote message={error} />

        <div className="flex flex-wrap justify-between gap-2">
          <p className="max-w-md text-xs text-slate-400">
            Saving creates a local outbox draft and an audit event. It does not queue or
            transmit to ABDM.
          </p>
          <div className="flex gap-2">
            <Btn onClick={onClose}>Close</Btn>
            <Btn
              variant="primary"
              onClick={() => void persistAndDownload()}
              disabled={!draft || busy || draft.issues.length > 0}
            >
              <Icon name="check" className="h-4 w-4" />
              {busy ? "Saving…" : savedId ? "Download again" : "Save draft & download"}
            </Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}
