import { PageHeader } from "@/components/layout/page-header";
import { ChatThreadList } from "@/components/chat/ChatThreadList";

export default function EmployerMessagesPage() {
  return (
    <div className="min-h-screen">
      <PageHeader
        title="Messages"
        subtitle="All conversations with candidates"
      />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <ChatThreadList basePath="/employer/messages" isEmployer={true} />
      </div>
    </div>
  );
}
