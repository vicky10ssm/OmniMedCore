// Dedicated administrator section for the reporting pathologist profile.
//
// The printed pathology report uses the verifying user's name first, then this
// fallback pathologist name/qualification. The profile is tenant-scoped in the
// existing settings table, so no schema change is needed.

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { getDb } from "../db";
import { writeAudit } from "../db/audit";
import { getSettings, setSetting } from "../db/settings";
import { Btn, Card, ErrorNote, Labeled, PageHeader, TextInput } from "../ui/kit";

const KEYS = ["pathologist_name", "pathologist_qualification"] as const;

export default function Pathologists() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [qualification, setQualification] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const db = await getDb();
        const values = await getSettings(db, [...KEYS]);
        setName(values.pathologist_name || "");
        setQualification(values.pathologist_qualification || "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load pathologist profile"
        );
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const db = await getDb();
      await setSetting(db, "pathologist_name", name.trim());
      await setSetting(db, "pathologist_qualification", qualification.trim());
      await writeAudit(db, {
        userId: user?.id ?? "",
        action: "settings.update",
        entity: "settings",
        entityId: "pathologist-profile",
        detail: "Updated pathologist name and qualification",
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save pathologist profile"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Pathologists"
        subtitle="Reporting pathologist name and qualification used on pathology reports"
      />
      <div className="max-w-2xl space-y-4">
        <Card className="p-4">
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label="Pathologist name">
                <TextInput
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Dr. S. Rao"
                  disabled={!loaded || busy}
                />
              </Labeled>
              <Labeled label="Qualification">
                <TextInput
                  value={qualification}
                  onChange={(event) => setQualification(event.target.value)}
                  placeholder="MD (Pathology)"
                  disabled={!loaded || busy}
                />
              </Labeled>
            </div>
            <p className="text-xs text-slate-500">
              A report uses the name of the user who verifies it. This pathologist
              profile is the fallback when no verifying user name is available.
            </p>
            <ErrorNote message={error} />
            <div className="flex items-center justify-end gap-3">
              {saved && (
                <span className="text-xs font-medium text-emerald-700">
                  Pathologist profile saved
                </span>
              )}
              <Btn type="submit" variant="primary" disabled={!loaded || busy}>
                {busy ? "Saving…" : "Save pathologist"}
              </Btn>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
