import { PageHeader } from "@/components/layout/page-header";
import { ChatThreadList } from "@/components/chat/ChatThreadList";

export default function SeekerMessagesPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="Messages"
        subtitle="Conversations with employers about your applications"
      />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <ChatThreadList basePath="/seeker/messages" isEmployer={false} />
      </div>
    </div>
  );
}
