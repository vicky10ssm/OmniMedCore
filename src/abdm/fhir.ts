// ABDM FHIR R4 document builder for one released laboratory test.
//
// Profiles: NRCeS FHIR Implementation Guide for ABDM v6.5.0
//   DocumentBundle, DiagnosticReportRecord, DiagnosticReportLab,
//   Patient, Practitioner, Organization, Specimen, Observation.
//
// This builds and validates a local document only. It does not transmit data.

import type {
  AbdmConsentRow,
  InvoiceRow,
  PatientRow,
  ReportOrderRow,
  ReportParameterRow,
  SampleRow,
  TestRow,
} from "../db/types";
import { inspectAbhaIdentifier, localPatientIdentifier } from "./identity";

type Fhir = Record<string, unknown>;

export interface AbdmReportInput {
  tenantId: string;
  labName: string;
  labAddress: string;
  labPhone: string;
  hfrId: string;
  hipId: string;
  order: ReportOrderRow;
  invoice: InvoiceRow;
  patient: PatientRow;
  test: TestRow | null;
  sample: SampleRow | null;
  parameters: ReportParameterRow[];
  verifier: { id: string; name: string; registration: string };
  revisionNo: number;
  consent: AbdmConsentRow;
  bundleId: string;
  now: number;
}

export interface AbdmPrepared {
  bundle: Fhir;
  bundleId: string;
  consentId: string;
}

const U = {
  bundle: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle",
  composition: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord",
  diagnosticReport: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportLab",
  patient: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient",
  practitioner: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Practitioner",
  organization: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Organization",
  specimen: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Specimen",
  observation: "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation",
};

const UCUM_UNITS = new Set(["g/dL", "mg/dL", "U/L", "%", "fL", "pg", "mmol/L"]);

function iso(ts: number | null | undefined): string | undefined {
  return ts ? new Date(ts).toISOString() : undefined;
}

function urn(kind: string, id: string): string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? `urn:uuid:${id}`
    : `urn:diagbill:${kind}:${encodeURIComponent(id)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function narrative(title: string, rows: Array<[string, string, string, string]>): Fhir {
  const body = rows
    .map(
      ([name, value, unit, ref]) =>
        `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(value)}</td><td>${escapeHtml(unit)}</td><td>${escapeHtml(ref)}</td></tr>`
    )
    .join("");
  return {
    status: "generated",
    div:
      `<div xmlns="http://www.w3.org/1999/xhtml" lang="en-IN">` +
      `<h2>${escapeHtml(title)}</h2>` +
      `<table><thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference</th></tr></thead>` +
      `<tbody>${body}</tbody></table></div>`,
  };
}

function observation(
  input: AbdmReportInput,
  patientRef: string,
  specimenRef: string | undefined,
  data: {
    id: string;
    name: string;
    value: string;
    numeric: number | null;
    unit: string;
    refRange: string;
    refMin: number | null;
    refMax: number | null;
    abnormal: number;
    loinc: string;
  }
): { fullUrl: string; resource: Fhir } {
  const reportStatus = input.revisionNo > 1 ? "amended" : "final";
  const coding = data.loinc
    ? [
        {
          system: "http://loinc.org",
          code: data.loinc,
          display: data.name,
        },
      ]
    : [];
  let value: Fhir;
  if (data.numeric !== null && data.unit) {
    value = {
      valueQuantity: {
        value: data.numeric,
        unit: data.unit,
        ...(UCUM_UNITS.has(data.unit)
          ? { system: "http://unitsofmeasure.org", code: data.unit }
          : {}),
      },
    };
  } else {
    value = { valueString: data.value };
  }
  const referenceRange =
    data.refMin !== null || data.refMax !== null || data.refRange
      ? [
          {
            ...(data.refMin !== null
              ? { low: { value: data.refMin, unit: data.unit || undefined } }
              : {}),
            ...(data.refMax !== null
              ? { high: { value: data.refMax, unit: data.unit || undefined } }
              : {}),
            ...(data.refRange ? { text: data.refRange } : {}),
          },
        ]
      : undefined;
  const interpretation =
    data.abnormal && data.numeric !== null
      ? [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                code:
                  data.refMin !== null && data.numeric < data.refMin
                    ? "L"
                    : data.refMax !== null && data.numeric > data.refMax
                      ? "H"
                      : "A",
                display:
                  data.refMin !== null && data.numeric < data.refMin
                    ? "Low"
                    : data.refMax !== null && data.numeric > data.refMax
                      ? "High"
                      : "Abnormal",
              },
            ],
          },
        ]
      : undefined;
  return {
    fullUrl: urn("observation", data.id),
    resource: {
      resourceType: "Observation",
      id: data.id,
      meta: { profile: [U.observation], versionId: String(input.revisionNo) },
      status: reportStatus,
      code: { coding, text: data.name },
      subject: { reference: patientRef },
      ...(specimenRef ? { specimen: { reference: specimenRef } } : {}),
      effectiveDateTime:
        iso(input.order.analysis_completed_at) || iso(input.order.reported_at) || iso(input.now),
      issued: iso(input.order.reported_at) || iso(input.now),
      ...value,
      ...(interpretation ? { interpretation } : {}),
      ...(referenceRange ? { referenceRange } : {}),
    },
  };
}

export function buildLabDiagnosticBundle(input: AbdmReportInput): AbdmPrepared {
  if (!input.labName.trim()) throw new Error("Lab name is required for an ABDM document");
  if (!input.verifier.name.trim()) {
    throw new Error("The report must identify the person who authorized its release");
  }
  if (input.consent.status !== "active") {
    throw new Error("An active ABDM-sharing consent is required");
  }
  if (input.consent.expires_at && input.consent.expires_at <= input.now) {
    throw new Error("The ABDM-sharing consent has expired");
  }
  if (input.order.status !== "done") {
    throw new Error("Only a released report can be exported to ABDM");
  }
  if (input.test?.category === "Pathology" && input.sample?.status !== "accepted") {
    throw new Error("The linked sample must be accepted before exporting this report");
  }

  const bundleId = input.bundleId;
  const compositionId = crypto.randomUUID();
  const reportId = input.order.id;
  const organizationId = `org-${input.tenantId}`;
  const patientUrn = urn("patient", input.patient.id);
  const practitionerUrn = urn("practitioner", input.verifier.id);
  const orgUrn = urn("organization", organizationId);
  const specimenUrn = input.sample ? urn("specimen", input.sample.id) : undefined;
  const reportUrn = urn("diagnosticreport", reportId);
  const timestamp = new Date(input.now).toISOString();
  const reportStatus = input.revisionNo > 1 ? "amended" : "final";

  const patientIdentifiers: Fhir[] = [
    {
      use: "official",
      type: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0203",
            code: "MR",
            display: "Medical record number",
          },
        ],
      },
      ...localPatientIdentifier(input.tenantId, input.patient.id),
    },
  ];
  if (input.patient.abha_id) {
    const abha = inspectAbhaIdentifier(input.patient.abha_id);
    if (abha.valid && abha.kind !== "unknown") {
      patientIdentifiers.push({
        use: "secondary",
        type: {
          text: abha.kind === "address" ? "ABHA address (format-checked, unverified)" : "ABHA number (format-checked, unverified)",
        },
        system: "https://healthid.ndhm.gov.in",
        value: abha.normalized,
      });
    }
  }

  const patient: Fhir = {
    resourceType: "Patient",
    id: input.patient.id,
    meta: { profile: [U.patient], versionId: String(input.patient.updated_at) },
    identifier: patientIdentifiers,
    name: [{ text: input.patient.name }],
    ...(input.patient.phone
      ? { telecom: [{ system: "phone", value: `+91${input.patient.phone}`, use: "mobile" }] }
      : {}),
    ...(input.patient.gender ? { gender: input.patient.gender } : {}),
    ...(input.patient.dob ? { birthDate: input.patient.dob } : {}),
    ...(input.patient.address ? { address: [{ text: input.patient.address }] } : {}),
  };

  const practitioner: Fhir = {
    resourceType: "Practitioner",
    id: input.verifier.id,
    meta: { profile: [U.practitioner] },
    identifier: [
      {
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0203",
              code: "MD",
              display: "Medical License number",
            },
          ],
        },
        system: `urn:diagbill:${input.tenantId}:user`,
        value: input.verifier.registration || input.verifier.id,
      },
    ],
    name: [{ text: input.verifier.name }],
  };

  const organization: Fhir = {
    resourceType: "Organization",
    id: organizationId,
    meta: { profile: [U.organization] },
    identifier: [
      input.hfrId
        ? {
            type: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                  code: "PRN",
                  display: "Provider number",
                },
              ],
            },
            system: "https://facility.ndhm.gov.in",
            value: input.hfrId,
          }
        : {
            type: { text: "Local facility identifier (HFR not configured)" },
            system: `urn:diagbill:${input.tenantId}:facility`,
            value: input.tenantId,
          },
    ],
    name: input.labName,
    ...(input.labPhone
      ? { telecom: [{ system: "phone", value: input.labPhone, use: "work" }] }
      : {}),
    ...(input.labAddress ? { address: [{ text: input.labAddress }] } : {}),
  };

  const specimen: { fullUrl: string; resource: Fhir } | null = input.sample
    ? {
        fullUrl: specimenUrn!,
        resource: {
          resourceType: "Specimen",
          id: input.sample.id,
          meta: { profile: [U.specimen] },
          identifier: [
            { system: `urn:diagbill:${input.tenantId}:accession`, value: input.sample.accession_no },
          ],
          status:
            input.sample.status === "rejected"
              ? "unsatisfactory"
              : input.sample.status === "disposed"
                ? "unavailable"
                : "available",
          type: { text: input.sample.specimen_type },
          subject: { reference: patientUrn },
          ...(input.sample.collected_at
            ? { collection: { collectedDateTime: iso(input.sample.collected_at) } }
            : {}),
          ...(input.sample.received_at ? { receivedTime: iso(input.sample.received_at) } : {}),
        },
      }
    : null;

  const observations = input.parameters.length
    ? input.parameters
        .filter((p) => p.deleted === 0)
        .map((p) =>
          observation(input, patientUrn, specimenUrn, {
            id: p.id,
            name: p.parameter_name,
            value: p.result_text,
            numeric: p.result_value,
            unit: p.unit,
            refRange: p.ref_range,
            refMin: p.ref_min,
            refMax: p.ref_max,
            abnormal: p.abnormal,
            loinc: p.loinc_code,
          })
        )
    : [
        observation(input, patientUrn, specimenUrn, {
          id: crypto.randomUUID(),
          name: input.order.test_name,
          value: input.order.result_text,
          numeric: input.order.result_value,
          unit: input.order.unit,
          refRange: input.order.ref_range,
          refMin: input.order.ref_min,
          refMax: input.order.ref_max,
          abnormal: input.order.abnormal,
          loinc: input.test?.loinc_code ?? "",
        }),
      ];

  const reportCode = input.test?.loinc_code
    ? {
        coding: [
          {
            system: "http://loinc.org",
            code: input.test.loinc_code,
            display: input.order.test_name,
          },
        ],
        text: input.order.test_name,
      }
    : { text: input.order.test_name };

  const conclusion =
    input.order.comments.trim() ||
    input.order.result_text.trim() ||
    "Structured results are provided in the linked observations.";

  const diagTextRows = observations.map((o) => {
    const r = o.resource as {
      code?: { text?: string };
      valueQuantity?: { value?: number; unit?: string };
      valueString?: string;
      referenceRange?: Array<{ text?: string }>;
    };
    return [
      r.code?.text ?? "",
      r.valueQuantity?.value != null ? String(r.valueQuantity.value) : r.valueString ?? "",
      r.valueQuantity?.unit ?? "",
      r.referenceRange?.[0]?.text ?? "",
    ] as [string, string, string, string];
  });

  const diagnosticReport: Fhir = {
    resourceType: "DiagnosticReport",
    id: reportId,
    meta: {
      profile: [U.diagnosticReport],
      versionId: String(input.revisionNo),
      lastUpdated: iso(input.order.reported_at) || timestamp,
    },
    text: narrative(`${input.order.test_name} report`, diagTextRows),
    identifier: [
      {
        system: `urn:diagbill:${input.tenantId}:report`,
        value: input.order.id,
      },
    ],
    status: reportStatus,
    code: reportCode,
    subject: { reference: patientUrn, display: input.patient.name },
    issued: iso(input.order.reported_at) || timestamp,
    performer: [{ reference: orgUrn, display: input.labName }],
    resultsInterpreter: [{ reference: practitionerUrn, display: input.verifier.name }],
    ...(specimenUrn ? { specimen: [{ reference: specimenUrn }] } : {}),
    result: observations.map((o) => ({ reference: o.fullUrl })),
    conclusion,
  };

  const composition: Fhir = {
    resourceType: "Composition",
    id: compositionId,
    meta: { profile: [U.composition], versionId: String(input.revisionNo) },
    language: "en-IN",
    text: narrative(`${input.order.test_name} diagnostic report`, diagTextRows),
    identifier: {
      system: `urn:diagbill:${input.tenantId}:document`,
      value: compositionId,
    },
    status: reportStatus,
    type: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "721981007",
          display: "Diagnostic studies report",
        },
      ],
      text: "Diagnostic Report - Lab",
    },
    subject: { reference: patientUrn, display: input.patient.name },
    date: iso(input.order.reported_at) || timestamp,
    author: [{ reference: practitionerUrn, display: input.verifier.name }],
    attester: [
      {
        mode: "professional",
        party: { reference: practitionerUrn, display: input.verifier.name },
      },
    ],
    custodian: { reference: orgUrn, display: input.labName },
    title: `Diagnostic Report - ${input.order.test_name}`,
    section: [
      {
        title: "Laboratory report",
        code: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "721981007",
              display: "Diagnostic studies report",
            },
          ],
          text: "Laboratory report",
        },
        entry: [{ reference: reportUrn, type: "DiagnosticReport" }],
      },
    ],
  };

  const entries: Array<{ fullUrl: string; resource: Fhir }> = [
    { fullUrl: urn("composition", compositionId), resource: composition },
    { fullUrl: patientUrn, resource: patient },
    { fullUrl: practitionerUrn, resource: practitioner },
    { fullUrl: orgUrn, resource: organization },
    { fullUrl: reportUrn, resource: diagnosticReport },
    ...(specimen ? [specimen] : []),
    ...observations,
  ];

  const bundle: Fhir = {
    resourceType: "Bundle",
    id: bundleId,
    meta: {
      versionId: String(input.revisionNo),
      lastUpdated: timestamp,
      profile: [U.bundle],
      security: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
          code: "V",
          display: "very restricted",
        },
      ],
    },
    identifier: {
      system: `urn:diagbill:${input.tenantId}:bundle`,
      value: bundleId,
    },
    type: "document",
    timestamp,
    entry: entries.map((e) => ({
      fullUrl: e.fullUrl,
      resource: e.resource,
    })),
  };

  return { bundle, bundleId, consentId: input.consent.id };
}

/** Structural checks before a draft is persisted. Not a substitute for ABDM validation. */
export function validateAbdmBundle(bundle: Fhir): string[] {
  const issues: string[] = [];
  const entries = (bundle.entry as Array<{ fullUrl?: string; resource?: Fhir }>) ?? [];
  if (bundle.type !== "document") issues.push("Bundle.type must be document");
  if (!bundle.identifier) {
    issues.push("Bundle.identifier is required");
  }
  if (!bundle.timestamp) issues.push("Bundle.timestamp is required");
  if (entries[0]?.resource?.resourceType !== "Composition") {
    issues.push("The first entry must be a Composition");
  }
  const urls = new Set(entries.map((e) => e.fullUrl).filter(Boolean));
  const refs: string[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const obj = value as Fhir;
    if (typeof obj.reference === "string" && obj.reference.startsWith("urn:")) {
      refs.push(obj.reference);
    }
    for (const child of Object.values(obj)) walk(child);
  };
  walk(bundle);
  for (const ref of refs) {
    if (!urls.has(ref)) issues.push(`Unresolved reference ${ref}`);
  }
  const report = entries.find((e) => e.resource?.resourceType === "DiagnosticReport")
    ?.resource as Fhir | undefined;
  if (!report) issues.push("DiagnosticReport is missing");
  else {
    if (!Array.isArray(report.result) || report.result.length === 0) {
      issues.push("DiagnosticReport.result must contain observations");
    }
    if (!Array.isArray(report.resultsInterpreter) || report.resultsInterpreter.length === 0) {
      issues.push("DiagnosticReport.resultsInterpreter is required");
    }
    if (!report.conclusion) issues.push("DiagnosticReport.conclusion is required");
  }
  return [...new Set(issues)];
}
