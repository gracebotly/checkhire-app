/**
 * Prohibited gig keyword blocklist.
 * Checked server-side on deal creation to prevent illegal/prohibited gigs.
 * Returns the matched term if blocked, or null if clean.
 */

const BLOCKED_PATTERNS: RegExp[] = [
  // Weapons & violence
  /\b(gun|firearm|weapon|ammo|ammunition|explosive|bomb)\b/i,
  // Drugs & controlled substances
  /\b(drug|narcotic|cocaine|heroin|meth|fentanyl|marijuana|cannabis|weed|thc|cbd oil)\b/i,
  // Adult content
  /\b(onlyfans|of agency|escort|adult content|nsfw|porn|xxx|sex work|cam girl|cam boy)\b/i,
  // Academic fraud
  /\b(write my essay|take my exam|do my homework|take my class|academic writing|college paper|term paper|thesis writing|coursework)\b/i,
  // Financial fraud
  /\b(money laundering|fake id|counterfeit|forged document|identity theft|credit card fraud|bank fraud)\b/i,
  // Hacking & cybercrime
  /\b(hack|ddos|phishing|ransomware|malware|spyware|keylogger|crack software|bypass security)\b/i,
  // Gambling
  /\b(casino|gambling|sports betting|poker bot|slot machine)\b/i,
  // Account manipulation
  /\b(buy account|sell account|rent account|fake review|fake follower|bot traffic|click farm)\b/i,
];

export function checkBlocklist(text: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}
