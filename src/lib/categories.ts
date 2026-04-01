import type { DealCategory } from "@/types/database";

export const DEAL_CATEGORIES: { value: DealCategory; label: string; description: string }[] = [
  { value: "web_dev", label: "Web & App Dev", description: "Websites, apps, bug fixes, custom software" },
  { value: "design", label: "Design & Branding", description: "Logos, graphics, UI/UX, social media visuals" },
  { value: "writing", label: "Writing & Content", description: "Blog posts, copywriting, scripts, SEO content" },
  { value: "video", label: "Video & Animation", description: "Editing, short-form content, motion graphics" },
  { value: "marketing", label: "Marketing & Social", description: "Management, ads, outreach, strategy" },
  { value: "virtual_assistant", label: "Virtual Assistant", description: "Admin, data entry, research, scheduling" },
  { value: "audio", label: "Audio & Music", description: "Voice acting, editing, mixing, transcription" },
  { value: "translation", label: "Translation", description: "Any language pair, localization" },
  { value: "other", label: "Other Digital", description: "Anything remote that doesn't fit above" },
];

export const categoryLabels: Record<string, string> = Object.fromEntries(
  DEAL_CATEGORIES.map((c) => [c.value, c.label])
);
