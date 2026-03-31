type IconProps = { className?: string };

export function VisaIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 16" className={className} aria-hidden="true">
      <path
        fill="#1A1F71"
        d="M19.65 1.04 16.12 15h-3.2L16.44 1.04h3.21ZM32.23 9.86l1.68-4.63.97 4.63h-2.65Zm2.96 5.18h2.96L35.52 1.04h-2.73a1.5 1.5 0 0 0-1.4.93L26.9 15.04h3.26l.65-1.79h3.98l.37 1.79h.03ZM28.2 5.16l.45-2.6A9.42 9.42 0 0 0 25.72 2c-1.67 0-5.63.73-5.63 4.28 0 3.33 4.64 3.37 4.64 5.12S21.3 13 19.79 13a6.56 6.56 0 0 1-3.13-.82l-.46 2.72A8.8 8.8 0 0 0 19.5 16c3.42 0 5.56-1.7 5.56-4.4 0-3.35-4.68-3.66-4.68-5.12 0-1.46 2.35-1.28 3.5-1.28a5.9 5.9 0 0 1 2.54.52l.45-2.6-.67 2.04ZM13.04 1.04l-5 14h-3.3L2.6 3.9c-.13-.5-.24-.68-.63-.9A11.25 11.25 0 0 0 0 2.22l.08-.37-.07-.81h5.25a1.47 1.47 0 0 1 1.45 1.24l1.3 6.9 3.2-8.14h3.27l-1.44 0Z"
      />
    </svg>
  );
}

export function MastercardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 20" className={className} aria-hidden="true">
      <circle cx="12" cy="10" r="8" fill="#EB001B" />
      <circle cx="20" cy="10" r="8" fill="#F79E1B" />
      <path
        d="M16 3.8a8 8 0 0 1 0 12.4A8 8 0 0 1 16 3.8Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function AmexIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 16" className={className} aria-hidden="true">
      <rect width="48" height="16" rx="2" fill="#006FCF" />
      <text
        x="24"
        y="11"
        textAnchor="middle"
        fill="white"
        fontSize="7"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        AMEX
      </text>
    </svg>
  );
}

export function DiscoverIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 16" className={className} aria-hidden="true">
      <rect width="48" height="16" rx="2" fill="#fff" stroke="#E5E7EB" strokeWidth="0.5" />
      <text
        x="24"
        y="11"
        textAnchor="middle"
        fill="#FF6600"
        fontSize="7"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        DISCOVER
      </text>
    </svg>
  );
}

export function ApplePayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 20" className={className} aria-hidden="true">
      <path
        fill="#000"
        d="M8.77 3.44c.55-.7.92-1.66.82-2.63-.8.03-1.76.53-2.33 1.2-.51.59-.96 1.54-.84 2.44.89.07 1.8-.45 2.35-1.01Zm.81 1.29c-1.3-.07-2.41.74-3.03.74-.63 0-1.59-.7-2.63-.68A3.47 3.47 0 0 0 1 7.16c-1.26 2.17-.32 5.39.89 7.16.6.87 1.32 1.84 2.26 1.8.89-.03 1.24-.58 2.32-.58 1.08 0 1.39.58 2.33.56.98-.02 1.6-.88 2.2-1.76.68-1 .96-1.97.98-2.02-.02-.02-1.89-.73-1.9-2.89-.02-1.8 1.47-2.67 1.54-2.71-.85-1.24-2.16-1.38-2.62-1.42l-.42.03Z"
      />
      <text
        x="22"
        y="13.5"
        fill="#000"
        fontSize="9"
        fontWeight="600"
        fontFamily="sans-serif"
      >
        Pay
      </text>
    </svg>
  );
}

export function GooglePayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 20" className={className} aria-hidden="true">
      <path
        d="M10.9 10.2V14h-1.4V3.6h3.7c.9 0 1.7.3 2.3.9.6.6.9 1.3.9 2.2s-.3 1.6-.9 2.2c-.6.6-1.4.9-2.3.9h-2.3Zm0-5.3V9h2.3c.6 0 1-.2 1.4-.6.4-.4.6-.8.6-1.3s-.2-1-.6-1.3c-.4-.4-.8-.6-1.4-.6h-2.3Z"
        fill="#4285F4"
      />
      <path
        d="M20.3 6.7c1 0 1.8.3 2.4.8.6.5.9 1.3.9 2.2V14h-1.3v-1h-.1c-.6.8-1.3 1.2-2.2 1.2-.8 0-1.5-.2-2-.7-.5-.5-.8-1-.8-1.7 0-.7.3-1.3.8-1.7s1.2-.6 2.1-.6c.8 0 1.4.1 1.9.4v-.3c0-.5-.2-1-.6-1.3-.4-.3-.8-.5-1.3-.5-.8 0-1.4.3-1.8 1l-1.2-.8c.6-.9 1.5-1.3 2.7-1.3h-.1Zm-1.7 5.8c0 .4.2.7.5.9.3.3.7.4 1.1.4.6 0 1.1-.2 1.6-.7.5-.5.7-1 .7-1.6-.4-.3-1-.5-1.7-.5s-1.2.2-1.6.4c-.4.3-.6.6-.6 1v.1Z"
        fill="#4285F4"
      />
      <path
        d="m29.8 7 -4.6 10.5h-1.4l1.7-3.7L22.8 7h1.5l2 5.1h.1l2-5.1h1.4Z"
        fill="#4285F4"
      />
      <path
        d="M7.3 9.4c0-.4 0-.8-.1-1.2H3.7v2.3h2c-.1.6-.4 1-1 1.4v1.1h1.5c.9-.8 1.4-2 1.4-3.4l-.3-.2Z"
        fill="#4285F4"
      />
      <path
        d="M3.7 13c1.3 0 2.4-.4 3.2-1.2l-1.5-1.2c-.4.3-1 .5-1.7.5-1.3 0-2.4-.9-2.8-2H.4v1.2C1.2 12 2.4 13 3.7 13Z"
        fill="#34A853"
      />
      <path
        d="M.9 9.1c-.1-.3-.2-.7-.2-1.1s.1-.8.2-1.1V5.7H.4C.2 6.3 0 7 0 7.8s.1 1.5.4 2.2l.5.1Z"
        fill="#FBBC04"
      />
      <path
        d="M3.7 4.8c.7 0 1.4.3 1.9.7l1.4-1.4C6.1 3.3 5 2.8 3.7 2.8 2.4 2.8 1.2 3.6.4 4.8L.9 6c.4-1.2 1.5-2 2.8-2v.8Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function PayPalIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 20" className={className} aria-hidden="true">
      <path
        d="M7.4 2.8h4c1.3 0 2.4.3 3 1 .7.8.8 1.9.5 3.2-.5 2.5-2.3 4-4.9 4H8.5c-.3 0-.6.3-.7.6L7 16.2c0 .2-.2.3-.4.3H4.2c-.3 0-.4-.2-.4-.5L5.8 3.4c.1-.4.4-.6.7-.6h.9Z"
        fill="#003087"
      />
      <path
        d="M18 2.8h4c1.3 0 2.4.3 3 1 .7.8.8 1.9.5 3.2-.5 2.5-2.3 4-4.9 4H19c-.3 0-.6.3-.7.6l-.8 4.6c0 .2-.2.3-.4.3h-2.4c-.3 0-.4-.2-.4-.5l2-12.6c.1-.4.3-.6.7-.6Z"
        fill="#0070E0"
      />
      <text
        x="34"
        y="13"
        fill="#003087"
        fontSize="7"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        al
      </text>
    </svg>
  );
}

export function CashAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <rect width="20" height="20" rx="4" fill="#00D632" />
      <path
        d="M12.7 7.03c-.15-.78-.82-1.38-2.06-1.52l-.08-.72a.4.4 0 0 0-.44-.36l-.47.05a.4.4 0 0 0-.36.44l.07.67c-.37.06-.75.15-1.12.27a.4.4 0 0 0-.26.5l.14.46a.4.4 0 0 0 .52.26c.62-.2 1.24-.34 1.73-.28.7.09 1.04.38 1.08.7.05.37-.18.72-1.1 1.04-1.24.43-2.3 1.04-2.1 2.46.14 1 .93 1.66 2.02 1.82l.08.72a.4.4 0 0 0 .44.36l.47-.05a.4.4 0 0 0 .36-.44l-.08-.68c.36-.07.72-.17 1.07-.3a.4.4 0 0 0 .24-.51l-.15-.46a.4.4 0 0 0-.52-.24c-.56.2-1.13.33-1.56.28-.63-.08-.97-.36-1.02-.72-.04-.3.15-.65 1.06-.97 1.4-.5 2.36-1.07 2.14-2.53Z"
        fill="#fff"
      />
    </svg>
  );
}

export function BankTransferIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 17h14M4 13v4M8 13v4M12 13v4M16 13v4M2 9h16M10 3l8 6H2l8-6Z" />
    </svg>
  );
}
