"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { DealTemplate } from "@/types/database";

export default function TemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<DealTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (data.ok) setTemplates(data.templates);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
      toast("Template deleted", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to delete",
        "error"
      );
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Gig Templates
        </h1>

        {loading ? (
          <div className="mt-6 space-y-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted">
              <FileText className="h-7 w-7 text-brand" />
            </div>
            <p className="text-base font-semibold text-slate-900">
              No templates yet
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Save one when you post your next gig.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {templates.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  ease: "easeOut",
                  delay: i * 0.04,
                }}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {t.template_name}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {t.title}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                      {t.default_amount && (
                        <span className="font-mono tabular-nums">
                          ${(t.default_amount / 100).toFixed(2)}
                        </span>
                      )}
                      {t.has_milestones && (
                        <span>
                          {(t.milestone_templates as unknown[])?.length || 0}{" "}
                          milestones
                        </span>
                      )}
                      <span>Used {t.use_count}×</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/deal/new?template=${t.id}`}>
                      <Button size="sm">Use Template</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(t.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Delete confirmation */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader
            title="Delete Template"
            description="Are you sure? This cannot be undone."
          />
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
