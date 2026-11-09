// Dedicated administrator section for the pathologist signature catalogue.

import PathologistsSettings from "./PathologistsSettings";
import { PageHeader } from "../ui/kit";

export default function Pathologists() {
  return (
    <>
      <PageHeader
        title="Pathologists"
        subtitle="Names, qualifications and scanned signatures used on pathology reports"
      />
      <PathologistsSettings canEdit />
    </>
  );
}
