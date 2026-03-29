"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileSlug, setProfileSlug] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name, bio, profile_slug, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setBio(profile.bio || "");
        setProfileSlug(profile.profile_slug || "");
        setAvatarUrl(profile.avatar_url || "");
      }
      setLoading(false);
    }
    load();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!profileSlug) {
      setProfileSlug(generateSlug(value));
    }
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          profile_slug: profileSlug.trim() || undefined,
          avatar_url: avatarUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Settings saved!", "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Settings
        </h1>

        {error && (
          <Alert variant="danger" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">
              Display name
            </label>
            <Input
              value={displayName}
              onChange={(e) =>
                handleDisplayNameChange(e.target.value)
              }
              placeholder="Your name"
              maxLength={50}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio about yourself"
              maxLength={200}
              rows={3}
              className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand resize-none"
            />
            <p className="mt-1 text-xs text-slate-600">
              {bio.length}/200 characters
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">
              Profile URL
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-600">
                checkhire.com/u/
              </span>
              <Input
                value={profileSlug}
                onChange={(e) =>
                  setProfileSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "")
                  )
                }
                placeholder="your-name"
                maxLength={30}
                className="w-48"
              />
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Lowercase letters, numbers, and hyphens only. 3-30
              characters.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-900">
              Avatar URL
            </label>
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              type="url"
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
