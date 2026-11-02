// Read-only compliance evidence summary for administrators.
//
// This page reports software evidence; it is not a certification statement.

import { useEffect, useState } from "react";
import { getDb } from "../db";
import { formatDateTime } from "../db/helpers";
import { tenantAnd, tenantAndOn } from "../db/tenant";
import { Card, ErrorNote, PageHeader } from "../ui/kit";

interface EvidenceRow {
  id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string;
  detail: string;
  created_at: number;
}

interface Counts {
  samples: number;
  accepted: number;
  rejected: number;
  revisions: number;
  amendments: number;
  consents: number;
  abdmDrafts: number;
}

export default function Compliance() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const db = await getDb();
        const [tenantClause, tenantParams] = tenantAnd();
        const count = async (sql: string) =>
          (
            await db.get<{ n: number }>(
              `${sql} ${tenantClause}`,
              tenantParams
            )
          )?.n ?? 0;
        setCounts({
          samples: await count("SELECT COUNT(*) AS n FROM samples WHERE deleted = 0"),
          accepted: await count(
            "SELECT COUNT(*) AS n FROM samples WHERE deleted = 0 AND status = 'accepted'"
          ),
          rejected: await count(
            "SELECT COUNT(*) AS n FROM samples WHERE deleted = 0 AND status = 'rejected'"
          ),
          revisions: await count(
            "SELECT COUNT(*) AS n FROM report_result_revisions WHERE deleted = 0"
          ),
          amendments: await count(
            "SELECT COUNT(*) AS n FROM report_result_revisions WHERE deleted = 0 AND action = 'amended'"
          ),
          consents: await count(
            "SELECT COUNT(*) AS n FROM abdm_consents WHERE deleted = 0 AND status = 'active'"
          ),
          abdmDrafts: await count(
            "SELECT COUNT(*) AS n FROM abdm_outbox WHERE deleted = 0 AND status = 'draft'"
          ),
        });

        const [tenantA, tenantAParams] = tenantAndOn("a");
        setEvidence(
          await db.all<EvidenceRow>(
            `SELECT a.id, a.action, a.entity, a.entity_id, a.detail, a.created_at,
                    COALESCE(u.full_name, u.username, a.user_id) AS user_name
             FROM audit_log a
             LEFT JOIN users u ON u.id = a.user_id AND u.tenant_id = a.tenant_id
             WHERE a.deleted = 0 ${tenantA}
             ORDER BY a.created_at DESC LIMIT 100`,
            tenantAParams
          )
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load compliance evidence");
      }
    })();
  }, []);

  return (
    <>
      <PageHeader
        title="Compliance & audit evidence"
        subtitle="Software-supported controls and traceability — not an accreditation certificate"
      />

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <p className="font-semibold">Scope of this screen</p>
        <p className="mt-1">
          Aligned to the evidence requirements of ISO 15189:2022 and NABL 112A, with
          ABDM FHIR R4 IG v6.5.0 drafting. The laboratory remains responsible for
          procedures, validation, competence, QC/EQA and external assessment. No live
          ABDM exchange or NABL accreditation is claimed.
        </p>
      </div>

      {error && <ErrorNote message={error} />}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Samples recorded", counts?.samples ?? 0, "pre-examination chain"],
          ["Samples accepted", counts?.accepted ?? 0, "release-eligible"],
          ["Samples rejected", counts?.rejected ?? 0, "reason retained"],
          ["Report revisions", counts?.revisions ?? 0, `${counts?.amendments ?? 0} amendments`],
          ["Active ABDM consents", counts?.consents ?? 0, "purpose-specific"],
          ["ABDM drafts", counts?.abdmDrafts ?? 0, "local, not transmitted"],
        ].map(([label, value, hint]) => (
          <Card key={label as string} className="p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="num mt-1 text-xl font-semibold">{value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Recent audit evidence</h2>
            <p className="text-xs text-slate-400">
              Actor, action, entity and timestamp. Secrets and FHIR payloads are intentionally excluded.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            latest 100
          </span>
        </div>
        {evidence.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            No audit events recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {evidence.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td className="px-4 py-2">{e.user_name || "System"}</td>
                    <td className="num px-4 py-2 text-xs font-medium">{e.action}</td>
                    <td className="max-w-md px-4 py-2 text-xs text-slate-600">
                      <span className="text-slate-400">{e.entity}</span>
                      {e.detail ? ` · ${e.detail}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="text-sm font-semibold">Implemented in this increment</h2>
        <ul className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
          <li>• Patient-linked sample accession, collection, receipt and acceptance</li>
          <li>• Reasoned sample rejection and report-release blocking</li>
          <li>• Explicit report-release authority separate from data entry</li>
          <li>• Append-only draft/verification/amendment revision snapshots</li>
          <li>• Required amendment reason, previous versions preserved</li>
          <li>• User-linked audit for clinical, consent, financial and settings actions</li>
          <li>• Purpose-specific ABDM consent with revocation history</li>
          <li>• Offline ABDM FHIR R4 v6.5.0 document draft and local outbox</li>
          <li>• Accepted sample, sample ID and actual release authorizer on printed reports</li>
          <li>• Administrator-only compliance evidence view</li>
        </ul>
      </Card>
    </>
  );
}
