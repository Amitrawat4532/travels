import { connection } from "next/server";
import { Sparkles } from "lucide-react";
import { getActiveLocations } from "@/server/queries/rides";
import { isDemoMode } from "@/server/demo";

/** Thin strip shown while the site runs on built-in sample content (no database). */
export async function DemoBanner() {
  await connection();
  await getActiveLocations(); // detects an unreachable database
  if (!isDemoMode()) return null;
  return (
    <div className="bg-marigold-400 px-4 py-1.5 text-center text-xs font-semibold text-forest-900 sm:text-[13px]">
      <Sparkles className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />
      Demo preview — rides shown are sample data. Login aur booking jaldi shuru honge.
    </div>
  );
}
