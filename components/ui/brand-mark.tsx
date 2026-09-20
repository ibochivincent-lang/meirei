"use client";

import Image from "next/image";
import logo from "@/public/logo.svg";

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#FF6B4E] to-[#FF5B3E] shadow-sm ring-1 ring-black/10 md:h-9 md:w-9">
        <Image src={logo} alt="命令 Meirei" width={36} height={36} className="h-full w-full object-cover" priority />
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[22px] font-bold leading-none tracking-tight text-ink-900 md:text-[25px]">
            meirei
          </span>
          <span className="font-display text-sm font-semibold text-accent-500 md:text-base">
            命令
          </span>
        </div>
        <span className="font-sans text-[9px] font-medium uppercase tracking-widest text-ink-400">
          X Layer Mandate Agent
        </span>
      </div>
    </div>
  );
}
