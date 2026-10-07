"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl" aria-hidden>
        ⛰️
      </p>
      <h1 className="mt-4 text-2xl font-extrabold">Kuch gadbad ho gayi</h1>
      <p className="mt-2 text-muted">Something went wrong on our side. Please try again — your bookings are safe.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">Ref: {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>
          <RotateCcw className="size-4" aria-hidden /> Try again
        </Button>
        <LinkButton href="/" variant="outline">Home</LinkButton>
      </div>
    </div>
  );
}
