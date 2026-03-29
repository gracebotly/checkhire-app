"use client";

import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Props = {
  url: string;
  title?: string;
};

export function ShareButton({ url, title }: Props) {
  const { toast } = useToast();

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: title || "CheckHire Gig", url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied!", "success");
    } catch {
      toast("Failed to copy link", "error");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Link2 className="mr-1.5 h-4 w-4" />
      Copy Link
    </Button>
  );
}
