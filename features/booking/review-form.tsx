"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { useFormAction } from "@/components/ui/use-form-action";
import { cn } from "@/lib/utils";
import { submitReviewAction } from "@/features/passenger/actions";

const LABELS = ["", "Bahut kharab", "Theek nahi", "Theek-thaak", "Accha", "Bahut badhiya!"];

export function ReviewForm({ bookingId, driverName }: { bookingId: string; driverName: string }) {
  const { onSubmit, pending, error, state } = useFormAction(submitReviewAction);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  if (state.ok) {
    return <Alert tone="success" title="Thank you! 🙏">{state.message}</Alert>;
  }

  const shown = hover || rating;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <fieldset>
        <legend className="text-sm font-medium text-ink-2">How was your ride with {driverName.split(" ")[0]}?</legend>
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              className="rounded-lg p-1 transition-transform hover:scale-110"
            >
              <Star className={cn("size-9", n <= shown ? "fill-marigold-400 text-marigold-400" : "text-line")} />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-ink-2">{LABELS[shown]}</span>
        </div>
      </fieldset>
      <div>
        <Label htmlFor="comment">Review (optional)</Label>
        <Textarea id="comment" name="comment" maxLength={600} placeholder="Time pe aaye? Driving kaisi thi? Gaadi saaf thi?" />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" loading={pending} disabled={!rating}>
        Submit rating
      </Button>
    </form>
  );
}
