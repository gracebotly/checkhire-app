"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  X,
  Mail,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";

const EMAIL_RE =
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

const VALID_ROLES = [
  { value: "poster", label: "Poster", description: "Can create and manage job listings" },
  { value: "admin", label: "Admin", description: "Full access including team management" },
];

interface InviteModalProps {
  onClose: () => void;
  onInvited: () => void;
}

export function InviteModal({ onClose, onInvited }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("poster");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [inviteResult, setInviteResult] = useState<{
    email: string;
    role: string;
    company_name: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserEmail(data.user?.email?.toLowerCase() ?? null);
    });
  }, []);

  const validateEmailField = (value: string): string | null => {
    if (!value.trim()) return null;
    if (!EMAIL_RE.test(value.trim())) return "Please enter a valid email address.";
    return null;
  };

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setEmailFieldError("Please enter a valid email address (e.g. name@company.com).");
      return;
    }

    if (currentUserEmail && trimmed === currentUserEmail) {
      setError("You cannot invite yourself.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/employer/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, role }),
      });
      const data = await res.json();

      if (data.ok && data.invite) {
        setInviteResult({
          email: data.invite.email,
          role: data.invite.role,
          company_name: data.invite.company_name,
        });
      } else {
        const errorMessages: Record<string, string> = {
          ALREADY_MEMBER: "This person is already a team member.",
          INVALID_EMAIL: data.message || "Please enter a valid email address.",
          INVALID_ROLE: "Invalid role selected.",
          ADMIN_REQUIRED: "Only admins can invite team members.",
          CANNOT_INVITE_SELF: "You cannot invite yourself.",
          USER_NOT_FOUND: data.message || "No CheckHire account found for this email.",
        };
        setError(errorMessages[data.code] || data.message || "Failed to send invite.");
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !sending && email.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {inviteResult ? "Member Added" : "Invite Team Member"}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors duration-200 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {inviteResult ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="px-6 py-6"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm text-slate-900">
                  <span className="font-semibold">{inviteResult.email}</span> has been
                  added to {inviteResult.company_name} as{" "}
                  {VALID_ROLES.find((r) => r.value === inviteResult.role)?.label || inviteResult.role}.
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  They can now access the employer dashboard and post listings.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 px-6 py-5"
            >
              {/* Email field */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                      if (emailFieldError) setEmailFieldError(null);
                    }}
                    onBlur={() => setEmailFieldError(validateEmailField(email))}
                    onKeyDown={handleKeyDown}
                    placeholder="teammate@company.com"
                    autoFocus
                    className={`w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-colors duration-200 placeholder:text-slate-600 focus:ring-2 focus:ring-brand/20 ${
                      emailFieldError || error
                        ? "border-red-300 focus:border-red-400"
                        : "border-gray-200 focus:border-brand"
                    }`}
                  />
                </div>
                {emailFieldError && (
                  <p className="mt-1 text-xs text-red-600">{emailFieldError}</p>
                )}
              </div>

              {/* Role selection */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Role
                </label>
                <div className="space-y-2">
                  {VALID_ROLES.map((r) => (
                    <label
                      key={r.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-200 ${
                        role === r.value
                          ? "border-brand bg-brand-muted"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                          role === r.value
                            ? "border-brand bg-brand"
                            : "border-gray-300"
                        }`}
                      >
                        {role === r.value && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name="invite-role"
                        value={r.value}
                        checked={role === r.value}
                        onChange={(e) => setRole(e.target.value)}
                        className="sr-only"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{r.label}</p>
                        <p className="text-xs text-slate-600">{r.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* General error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          {inviteResult ? (
            <button
              onClick={onInvited}
              className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={sending || !email.trim()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {sending ? "Adding..." : "Add Member"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
