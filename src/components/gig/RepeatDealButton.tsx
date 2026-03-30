"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  dealId: string;
  otherPartyName: string;
};

export function RepeatDealButton({ dealId, otherPartyName }: Props) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.push(`/deal/new?repeat_from=${dealId}`)}
      className="cursor-pointer"
    >
      <RefreshCw className="mr-1.5 h-4 w-4" />
      Work with {otherPartyName} again
    </Button>
  );
}
