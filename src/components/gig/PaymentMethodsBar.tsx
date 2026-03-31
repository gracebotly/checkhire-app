import {
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  DiscoverIcon,
  ApplePayIcon,
  GooglePayIcon,
  PayPalIcon,
  CashAppIcon,
  BankTransferIcon,
} from "@/components/icons/PaymentIcons";

type Props = {
  variant: "full" | "compact";
};

const icons = [
  { Component: VisaIcon, label: "Visa" },
  { Component: MastercardIcon, label: "Mastercard" },
  { Component: AmexIcon, label: "Amex" },
  { Component: DiscoverIcon, label: "Discover" },
  { Component: ApplePayIcon, label: "Apple Pay" },
  { Component: GooglePayIcon, label: "Google Pay" },
  { Component: PayPalIcon, label: "PayPal" },
  { Component: CashAppIcon, label: "Cash App" },
  { Component: BankTransferIcon, label: "Bank Transfer" },
];

export function PaymentMethodsBar({ variant }: Props) {
  const isFull = variant === "full";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {icons.map(({ Component, label }) => (
          <span
            key={label}
            title={label}
            className={
              isFull
                ? "opacity-60 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0"
                : ""
            }
          >
            <Component
              className={isFull ? "h-9" : "h-6"}
            />
          </span>
        ))}
      </div>
      {isFull && (
        <p className="text-xs text-slate-600">
          All payments processed securely by Stripe
        </p>
      )}
    </div>
  );
}
