"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";

export const BIRTH_YEARS = Array.from({ length: 1975 - 1943 + 1 }, (_, i) => 1975 - i);

export function BirthYearJump() {
  const [year, setYear] = useState(1960);
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <label htmlFor="by-select" className="sr-only">
        Your birth year
      </label>
      <select id="by-select" className="input sm:max-w-[12rem]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
        {BIRTH_YEARS.map((y) => (
          <option key={y} value={y}>
            Born in {y}
          </option>
        ))}
      </select>
      <Link
        href={`/social-security-by-birth-year/${year}`}
        prefetch
        className="btn btn-sun"
        onClick={() => track("birth_year_jump", { year })}
      >
        Show my dates <Icon name="arrow" size={18} />
      </Link>
    </div>
  );
}
