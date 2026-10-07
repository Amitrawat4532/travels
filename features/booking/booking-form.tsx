"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert, KeyValue } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { PLATFORM_FEE_PER_SEAT_PAISE } from "@/lib/constants";
import { formatDateLong, formatPaise, formatTime } from "@/lib/format";
import type { FieldErrors } from "@/lib/action-result";
import { createBookingAction } from "@/features/passenger/actions";

type Stop = { id: string; sequence: number; name: string; point: string; at: string; farePaise: number };

export function BookingForm({
  tripId,
  seats,
  stops,
  defaultBoardingId,
  defaultDropId,
  user,
  driverName,
  vehicleLabel,
  routeLabel,
  paymentLabel,
  policy,
}: {
  tripId: string;
  seats: number[];
  stops: Stop[];
  defaultBoardingId: string;
  defaultDropId: string;
  user: { name: string; phone: string };
  driverName: string;
  vehicleLabel: string;
  routeLabel: string;
  paymentLabel: string;
  policy: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [boardingId, setBoardingId] = useState(defaultBoardingId);
  const [dropId, setDropId] = useState(defaultDropId);
  const [contactPhone, setContactPhone] = useState(user.phone);
  const [passengers, setPassengers] = useState(() =>
    seats.map((seatNumber, i) => ({ seatNumber, name: i === 0 ? user.name : "", phone: i === 0 ? user.phone : "" })),
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [conflict, setConflict] = useState(false);

  const boarding = stops.find((s) => s.id === boardingId)!;
  const drop = stops.find((s) => s.id === dropId)!;
  const dropOptions = stops.filter((s) => s.sequence > boarding.sequence);
  const boardingOptions = stops.slice(0, -1);

  const price = useMemo(() => {
    const perSeat = Math.max(drop.farePaise - boarding.farePaise, 0);
    const fare = perSeat * seats.length;
    const fee = PLATFORM_FEE_PER_SEAT_PAISE * seats.length;
    return { perSeat, fare, fee, total: fare + fee };
  }, [boarding, drop, seats.length]);

  function updatePassenger(i: number, key: "name" | "phone", value: string) {
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));
  }

  function onBoardingChange(id: string) {
    setBoardingId(id);
    const b = stops.find((s) => s.id === id)!;
    if (drop.sequence <= b.sequence) setDropId(stops[stops.length - 1]!.id);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setConflict(false);
    start(async () => {
      const res = await createBookingAction({
        tripId,
        seatNumbers: seats,
        boardingStopId: boardingId,
        dropStopId: dropId,
        contactPhone,
        passengers: passengers.map((p) => ({ ...p, phone: p.phone || contactPhone })),
      });
      if (res.ok && res.data) {
        toast.success(res.message ?? "Booking confirmed!");
        router.push(`/passenger/bookings/${res.data.bookingId}?new=1`);
      } else if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        setConflict(/just booked|no longer|already/i.test(res.error));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_360px]" noValidate>
      <div className="space-y-5">
        {error && (
          <Alert tone="error" title="Booking not completed">
            {error}
            {conflict && (
              <Link href={`/rides/${tripId}`} className="mt-1 block font-semibold underline">
                Pick seats again →
              </Link>
            )}
          </Alert>
        )}

        <Card>
          <CardHeader title="Boarding & drop" description="Driver will see exactly where you get in and get down." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Boarding point" htmlFor="boarding">
              <Select id="boarding" value={boardingId} onChange={(e) => onBoardingChange(e.target.value)}>
                {boardingOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.point} ({formatTime(s.at)})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Drop point" htmlFor="drop" error={fieldErrors.dropStopId}>
              <Select id="drop" value={dropId} onChange={(e) => setDropId(e.target.value)}>
                {dropOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.point} ({formatTime(s.at)})
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Passenger details" description="One name per seat. Phone is optional for co-passengers." />
          <CardBody className="space-y-5">
            {passengers.map((p, i) => (
              <fieldset key={p.seatNumber} className="grid gap-3 sm:grid-cols-[auto_1fr_1fr] sm:items-start">
                <legend className="sr-only">Seat {p.seatNumber}</legend>
                <span className="flex h-12 w-14 items-center justify-center rounded-xl bg-forest-700 text-sm font-bold text-white sm:mt-[26px]" aria-hidden>
                  S{p.seatNumber}
                </span>
                <Field label={`Name (seat ${p.seatNumber})`} htmlFor={`pname-${i}`} error={fieldErrors[`passengers.${i}.name`]}>
                  <Input id={`pname-${i}`} value={p.name} onChange={(e) => updatePassenger(i, "name", e.target.value)} required autoComplete={i === 0 ? "name" : "off"} />
                </Field>
                <Field label="Mobile" htmlFor={`pphone-${i}`} error={fieldErrors[`passengers.${i}.phone`]}>
                  <Input
                    id={`pphone-${i}`}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder={i === 0 ? undefined : "Same as contact"}
                    value={p.phone}
                    onChange={(e) => updatePassenger(i, "phone", e.target.value)}
                  />
                </Field>
              </fieldset>
            ))}
            <Field label="Contact number for the driver" htmlFor="contactPhone" error={fieldErrors.contactPhone} hint="Driver will call this number before pickup">
              <Input id="contactPhone" type="tel" inputMode="numeric" maxLength={10} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Payment" />
          <CardBody className="space-y-3 pt-3 text-sm">
            <div className="flex items-start gap-3 rounded-xl border-2 border-forest-600 bg-forest-50 p-4">
              <Wallet className="mt-0.5 size-5 shrink-0 text-forest-700" aria-hidden />
              <div>
                <p className="font-semibold text-forest-900">{paymentLabel}</p>
                <p className="mt-0.5 text-forest-800/80">
                  Your seat is reserved now. Pay {formatPaise(price.total)} to the driver when you board. Online payment is coming soon.
                </p>
              </div>
              <CheckCircle2 className="ml-auto size-5 shrink-0 text-forest-700" aria-hidden />
            </div>
            <p className="text-muted">{policy}</p>
          </CardBody>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-20">
        <Card>
          <CardHeader title="Booking summary" />
          <CardBody>
            <dl className="divide-y divide-line">
              <KeyValue label="Route">{routeLabel}</KeyValue>
              <KeyValue label="Your trip">
                {boarding.name} → {drop.name}
              </KeyValue>
              <KeyValue label="Date">{formatDateLong(boarding.at)}</KeyValue>
              <KeyValue label="Pickup time">{formatTime(boarding.at)}</KeyValue>
              <KeyValue label="Driver">{driverName}</KeyValue>
              <KeyValue label="Vehicle">{vehicleLabel}</KeyValue>
              <KeyValue label="Seats">{seats.join(", ")}</KeyValue>
              <KeyValue label={`Fare (${seats.length} × ${formatPaise(price.perSeat)})`}>{formatPaise(price.fare)}</KeyValue>
              <KeyValue label="Platform fee">{formatPaise(price.fee)}</KeyValue>
            </dl>
            <div className="mt-3 flex items-center justify-between border-t-2 border-ink pt-3 text-lg font-extrabold">
              <span>Total</span>
              <span className="tabular-nums">{formatPaise(price.total)}</span>
            </div>
            <Button type="submit" size="lg" className="mt-5 w-full" loading={pending}>
              Confirm Booking
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
              <ShieldCheck className="size-3.5" aria-hidden /> Your number is shared only with this driver
            </p>
          </CardBody>
        </Card>
      </aside>
    </form>
  );
}
