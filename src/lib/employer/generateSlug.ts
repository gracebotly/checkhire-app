/**
 * Generates a URL-safe slug from a job title with a random suffix.
 * Example: "Senior React Engineer" → "senior-react-engineer-x7k2m9"
 */
export function generateListingSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
}
