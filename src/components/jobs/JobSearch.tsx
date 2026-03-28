"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function JobSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("search") || "";
  const [value, setValue] = useState(currentSearch);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("search", value.trim());
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`/jobs?${params.toString()}`);
  };

  const handleClear = () => {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("page");
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search job titles, companies, skills..."
        className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-slate-600 transition-colors duration-200 hover:text-slate-900"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
