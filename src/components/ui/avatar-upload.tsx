"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type AvatarUploadProps = {
  currentUrl: string | null;
  displayName: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name[0]?.toUpperCase() || "?";
}

export function AvatarUpload({
  currentUrl,
  displayName,
  onUploaded,
  onRemoved,
}: AvatarUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setError("Only PNG, JPG, WebP, and GIF images are allowed");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.message || "Upload failed");
        return;
      }

      onUploaded(data.avatar_url);
    } catch {
      setError("Something went wrong");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setError("");

    try {
      const res = await fetch("/api/users/avatar", { method: "DELETE" });
      const data = await res.json();

      if (!data.ok) {
        setError(data.message || "Failed to remove");
        return;
      }

      onRemoved();
    } catch {
      setError("Something went wrong");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt=""
              className="h-16 w-16 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-brand-muted text-lg font-semibold text-brand">
              {getInitials(displayName)}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="group absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/0 transition-colors duration-200 hover:bg-black/30"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Camera className="h-5 w-5 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            )}
          </button>
        </div>

        <div className="space-y-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : currentUrl ? "Change photo" : "Upload photo"}
          </Button>
          {currentUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="block cursor-pointer text-xs text-slate-600 transition-colors duration-200 hover:text-red-600"
            >
              {removing ? "Removing..." : "Remove photo"}
            </button>
          )}
          <p className="text-xs text-slate-600">PNG, JPG, WebP, or GIF. Max 2MB.</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
