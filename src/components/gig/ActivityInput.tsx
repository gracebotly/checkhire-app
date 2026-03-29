"use client";

import { useState, useRef } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Props = {
  dealId: string;
  onNewEntry: () => void;
};

const ACCEPTED_TYPES =
  ".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.zip";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function ActivityInput({ dealId, onNewEntry }: Props) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handlePost = async () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 1000) return;

    setPosting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setContent("");
      onNewEntry();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to post",
        "error"
      );
    } finally {
      setPosting(false);
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast("File too large. Maximum 20MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/deals/${dealId}/activity/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      onNewEntry();
      toast("File uploaded", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Upload failed",
        "error"
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a message..."
        maxLength={1000}
        rows={2}
        className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 resize-none"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handlePost}
          disabled={!content.trim() || posting}
        >
          {posting ? "Posting..." : "Post"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        {uploading && (
          <span className="text-xs text-slate-600">Uploading...</span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
