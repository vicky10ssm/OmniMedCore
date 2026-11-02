import { PageHeader, Card, EmptyState } from "../ui/kit";

export default function Placeholder({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          message={note}
          hint="Module order is defined in FEATURE_DECISIONS.md — billing & invoices are next."
        />
      </Card>
    </>
  );
}
