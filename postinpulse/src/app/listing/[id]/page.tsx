import { Suspense } from "react";
import { ListingDetail, ListingDetailSkeleton } from "@/components/market/listing-detail";

export default function ListingPage({ params }: PageProps<"/listing/[id]">) {
  return (
    <Suspense fallback={<ListingDetailSkeleton />}>
      <ListingFromParams params={params} />
    </Suspense>
  );
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function ListingFromParams({ params }: Pick<PageProps<"/listing/[id]">, "params">) {
  const { id } = await params;
  return <ListingDetail id={safeDecode(id)} />;
}
