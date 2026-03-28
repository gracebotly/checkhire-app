import { PageHeader } from "@/components/layout/page-header";
import { ListingForm } from "@/components/employer/ListingForm";

export default function NewListingPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="Create Listing"
        subtitle="Post a verified job listing on CheckHire."
      />
      <div className="mx-auto max-w-4xl px-6 py-6">
        <ListingForm />
      </div>
    </div>
  );
}
