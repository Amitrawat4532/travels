"use client";

import { Download } from "lucide-react";
import { Button, type ButtonVariant } from "./button";

export function PrintButton({ label = "Download / View ticket", variant = "outline" }: { label?: string; variant?: ButtonVariant }) {
  return (
    <Button type="button" variant={variant} onClick={() => window.print()} className="no-print">
      <Download className="size-4" aria-hidden /> {label}
    </Button>
  );
}
