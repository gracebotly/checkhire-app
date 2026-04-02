"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";

type Props = {
  dealId: string;
  guestToken: string | null;
  onUploaded: () => void;
  dealStatus: string;
  acceptanceCriteria?: Array<{ id: string; evidence_type: string; description: string }>;
};

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.zip";

export function EvidenceUploadCard({
  dealId,
  guestToken,
  onUploaded,
  dealStatus,
  acceptanceCriteria,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isEvidence, setIsEvidence] = useState(
    ["in_progress", "funded"].includes(dealStatus)
  );
  const [uploading, setUploading] = useState(false);
  const [content, setContent] = useState("");
  const [criteriaId, setCriteriaId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast("File too large. Maximum 10MB.", "error");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("is_submission_evidence", String(isEvidence));
      if (criteriaId) formData.append("criteria_id", criteriaId);
      if (guestToken) formData.append("guest_token", guestToken);

      const url = guestToken
        ? `/api/deals/${dealId}/guest-activity/upload`
        : `/api/deals/${dealId}/activity/upload`;

      const res = await fetch(url, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);

      // Post text comment if provided
      if (content.trim()) {
        const textUrl = guestToken
          ? `/api/deals/${dealId}/guest-activity`
          : `/api/deals/${dealId}/activity`;
        const body: Record<string, string> = { content: content.trim() };
        if (guestToken) body.guest_token = guestToken;
        await fetch(textUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      toast("Evidence uploaded", "success");
      setFile(null);
      setContent("");
      setCriteriaId(null);
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="border-dashed border-2 border-gray-300 rounded-xl p-5 cursor-pointer transition-colors duration-200 hover:border-gray-400"
      onClick={() => !file && fileRef.current?.click()}
    >
      <div className="text-center mb-4">
        <Upload className="h-8 w-8 text-slate-600 mx-auto mb-2" />
        <p className="text-base font-semibold text-slate-900">
          Add evidence of your work
        </p>
        <p className="text-sm text-slate-600">
          This builds your paper trail and protects you in disputes.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />

      {file && (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <Upload className="h-4 w-4 text-slate-600 shrink-0" />
            <span className="text-sm text-slate-900 truncate">
              {file.name}
            </span>
            <span className="text-xs text-slate-600 shrink-0">
              {(file.size / 1024).toFixed(0)} KB
            </span>
          </div>

          {acceptanceCriteria && acceptanceCriteria.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-900">
                This evidence is for:
              </label>
              <select
                value={criteriaId || ""}
                onChange={(e) => setCriteriaId(e.target.value || null)}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand cursor-pointer"
              >
                <option value="">General evidence</option>
                {acceptanceCriteria.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.evidence_type}] {c.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe this evidence..."
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand"
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="evidence-check"
              checked={isEvidence}
              onCheckedChange={(checked) => setIsEvidence(checked === true)}
            />
            <label
              htmlFor="evidence-check"
              className="text-sm text-slate-700 cursor-pointer"
            >
              Mark as work evidence
            </label>
          </div>

          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      )}
    </div>
  );
}
