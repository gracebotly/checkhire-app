import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
  variant?: "icon" | "full" | "full-white";
}

export function Logo({ size = 20, className, variant = "icon" }: LogoProps) {
  if (variant === "full") {
    return (
      <Image
        src="/logo-full-color.svg"
        alt="CheckHire"
        width={size * 3.75}
        height={size}
        className={className}
        priority
      />
    );
  }

  if (variant === "full-white") {
    return (
      <Image
        src="/logo-full-white.svg"
        alt="CheckHire"
        width={size * 3.75}
        height={size}
        className={className}
        priority
      />
    );
  }

  // Default: icon-only inline SVG (renders crisp at any size, no network request)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      width={size}
      height={size}
      className={className}
      aria-label="CheckHire"
      role="img"
    >
      <rect x="0" y="0" width="80" height="80" rx="16" fill="#1A7A6D" />
      <path
        d="M28 22 Q16 22, 16 38 Q16 54, 28 54"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M40 48 L47 56 L47 22"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="62"
        y1="22"
        x2="62"
        y2="56"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <line
        x1="47"
        y1="38"
        x2="62"
        y2="38"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
