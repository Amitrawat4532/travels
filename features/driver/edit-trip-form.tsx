"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { formatTime, istToDate } from "@/lib/format";
import type { FieldErrors } from "@/lib/action-result";
import { updateTripAction } from "./actions";

export function EditTripForm({
  trip,
  minSeats,
  maxSeats,
  hasBookings,
}: {
  trip: { id: string; date: string; time: string; durationMinutes: number; boardingPoint: string; dropPoint: string; totalSeats: number; notes: string };
  minSeats: number;
  maxSeats: number;
  hasBookings: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(trip);
  const [error, setError] = useState<string | null>(null);
  const [fe, setFe] = useState<FieldErrors>({});
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));
  const arrival = v.date && v.time ? new Date(istToDate(v.date, v.time).getTime() + v.durationMinutes * 60_000) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await updateTripAction({
        tripId: v.id,
        date: v.date,
        departureTime: v.time,
        durationMinutes: v.durationMinutes,
        boardingPoint: v.boardingPoint,
        dropPoint: v.dropPoint,
        totalSeats: v.totalSeats,
        notes: v.notes,
      });
      if (res.ok) {
        toast.success(res.message ?? "Trip updated");
        router.push(`/driver/trips/${v.id}`);
        router.refresh();
      } else {
        setError(res.error);
        setFe(res.fieldErrors ?? {});
      }
    });
  }

  return (
    <form method="post" onSubmit={submit} className="max-w-2xl space-y-5" noValidate>
      {hasBookings && (
        <Alert tone="warning" title="Passengers have booked this trip">
          If you change the time or pickup/drop point, every passenger is notified and can cancel for free.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Date" htmlFor="date" error={fe.date}>
            <Input id="date" type="date" value={v.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="Departure time" htmlFor="time" error={fe.departureTime}>
            <Input id="time" type="time" value={v.time} onChange={(e) => set("time", e.target.value)} />
          </Field>
          <Field label="Journey time (min)" htmlFor="dur" error={fe.durationMinutes} hint={arrival ? `Arrives ${formatTime(arrival)}` : undefined}>
            <Input id="dur" type="number" min={30} step={15} value={v.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} />
          </Field>
          <Field label="Boarding point" htmlFor="bp" error={fe.boardingPoint} className="sm:col-span-3">
            <Input id="bp" value={v.boardingPoint} onChange={(e) => set("boardingPoint", e.target.value)} />
          </Field>
          <Field label="Drop point" htmlFor="dp" error={fe.dropPoint} className="sm:col-span-3">
            <Input id="dp" value={v.dropPoint} onChange={(e) => set("dropPoint", e.target.value)} />
          </Field>
          <Field
            label="Total seats"
            htmlFor="seats"
            error={fe.totalSeats}
            hint={`Between ${minSeats} (booked seats) and ${maxSeats} (vehicle capacity)`}
            className="sm:col-span-3"
          >
            <Input id="seats" type="number" min={minSeats} max={maxSeats} value={v.totalSeats} onChange={(e) => set("totalSeats", Number(e.target.value))} />
          </Field>
          <Field label="Note for passengers" htmlFor="notes" className="sm:col-span-3">
            <Textarea id="notes" value={v.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </CardBody>
      </Card>
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
