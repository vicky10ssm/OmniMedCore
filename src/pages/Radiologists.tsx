// Dedicated administrator section for the radiologist signature catalogue.
// Configuration is still stored in the tenant-scoped radiologists table.

import RadiologistsSettings from "./RadiologistsSettings";
import { PageHeader } from "../ui/kit";

export default function Radiologists() {
  return (
    <>
      <PageHeader
        title="Radiologists"
        subtitle="Names, qualifications and scanned signatures used on X-ray reports"
      />
      <RadiologistsSettings canEdit />
    </>
  );
}
