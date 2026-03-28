"use client";

import { ResumeUploader } from "@/components/seeker/ResumeUploader";
import { SkillsInput } from "@/components/seeker/SkillsInput";
import { Button } from "@/components/ui/button";
import type { SeekerProfile } from "@/types/database";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Loader2, Save } from "lucide-react";
import { useCallback, useState } from "react";

interface ProfileFormProps {
  initialProfile: SeekerProfile | null;
  fullName: string;
  userId: string;
}

export function ProfileFormClient({
  initialProfile,
  fullName,
  userId,
}: ProfileFormProps) {
  const [skills, setSkills] = useState<string[]>(initialProfile?.skills ?? []);
  const [yearsExperience, setYearsExperience] = useState<string>(
    initialProfile?.years_experience?.toString() ?? ""
  );
  const [locationCity, setLocationCity] = useState(
    initialProfile?.location_city ?? ""
  );
  const [locationState, setLocationState] = useState(
    initialProfile?.location_state ?? ""
  );
  const [educationLevel, setEducationLevel] = useState(
    initialProfile?.education_level ?? ""
  );
  const [educationField, setEducationField] = useState(
    initialProfile?.education_field ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<string>(
    initialProfile?.parse_status ?? "pending"
  );
  const [parsedSummary, setParsedSummary] = useState<string | null>(
    initialProfile?.parsed_summary ?? null
  );

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/seeker/profile", {
        method: initialProfile ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills,
          years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
          location_city: locationCity || null,
          location_state: locationState || null,
          education_level: educationLevel || null,
          education_field: educationField || null,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Failed to save profile.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleResumeParseComplete = useCallback(
    (status: string, summary: string | null) => {
      setParseStatus(status);
      setParsedSummary(summary);
    },
    []
  );

  return (
    <div className="space-y-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="font-display text-lg font-semibold text-slate-900">Resume</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload your resume and we will automatically extract your work history,
          skills, and education. Employers see a structured profile — never your
          raw PDF (until you reach the offer stage).
        </p>
        {!!fullName && (
          <p className="mt-2 text-xs text-slate-600">Profile name: {fullName}</p>
        )}
        <div className="mt-4">
          <ResumeUploader
            userId={userId}
            currentParseStatus={parseStatus}
            hasExistingResume={!!initialProfile?.resume_file_url}
            onParseComplete={handleResumeParseComplete}
          />
        </div>

        {parseStatus === "parsed" && parsedSummary && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-900">
                  Resume parsed successfully
                </p>
                <p className="mt-1 text-sm text-emerald-800">{parsedSummary}</p>
              </div>
            </div>
          </div>
        )}
        {parseStatus === "failed" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Resume parsing failed
                </p>
                <p className="mt-1 text-sm text-red-800">
                  You can still fill in your profile manually below. Try
                  re-uploading if the issue persists.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.04 }}
        className="rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Skills & Experience
        </h2>
        <div className="mt-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-900">Skills</label>
            <p className="mt-0.5 text-xs text-slate-600">
              Type a skill and press Enter to add it.
            </p>
            <div className="mt-2">
              <SkillsInput skills={skills} onChange={setSkills} />
            </div>
          </div>

          <div>
            <label
              htmlFor="years_exp"
              className="block text-sm font-medium text-slate-900"
            >
              Years of Experience
            </label>
            <input
              id="years_exp"
              type="number"
              min="0"
              max="60"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="e.g. 5"
              className="mt-1 w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.08 }}
        className="rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Location & Education
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-900">
              City
            </label>
            <input
              id="city"
              type="text"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              placeholder="e.g. Austin"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label
              htmlFor="state"
              className="block text-sm font-medium text-slate-900"
            >
              State
            </label>
            <input
              id="state"
              type="text"
              value={locationState}
              onChange={(e) => setLocationState(e.target.value)}
              placeholder="e.g. Texas"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label
              htmlFor="edu_level"
              className="block text-sm font-medium text-slate-900"
            >
              Education Level
            </label>
            <input
              id="edu_level"
              type="text"
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              placeholder="e.g. B.S. Computer Science"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label
              htmlFor="edu_field"
              className="block text-sm font-medium text-slate-900"
            >
              Field of Study
            </label>
            <input
              id="edu_field"
              type="text"
              value={educationField}
              onChange={(e) => setEducationField(e.target.value)}
              placeholder="e.g. Software Engineering"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSaveProfile}
          disabled={saving}
          className="cursor-pointer bg-brand text-white transition-colors duration-200 hover:bg-brand-hover"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Profile"}
        </Button>
        {saved && <span className="text-sm font-medium text-emerald-600">Profile saved.</span>}
        {error && <span className="text-sm font-medium text-red-600">{error}</span>}
      </div>
    </div>
  );
}
