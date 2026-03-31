import { Suspense } from "react";
import { SettingsContent } from "./settings-content";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="h-8 w-32 animate-pulse rounded bg-gray-100" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
