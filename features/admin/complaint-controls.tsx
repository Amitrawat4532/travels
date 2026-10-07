"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { updateComplaintAction } from "./actions";

export function ComplaintControls({ id, status, note }: { id: string; status: string; note: string }) {
  const [s, setS] = useState(status);
  const [n, setN] = useState(note);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const fd = new FormData();
          fd.set("id", id);
          fd.set("status", s);
          fd.set("adminNote", n);
          const res = await updateComplaintAction(fd);
          if (res.ok) {
            toast.success(res.message ?? "Saved");
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <Select value={s} onChange={(e) => setS(e.target.value)} aria-label="Complaint status" className="h-10">
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
      </Select>
      <Textarea value={n} onChange={(e) => setN(e.target.value)} placeholder="Internal note / resolution sent to user" className="min-h-10 py-2" aria-label="Admin note" />
      <Button type="submit" size="sm" loading={pending} className="h-10">
        Save
      </Button>
    </form>
  );
}
