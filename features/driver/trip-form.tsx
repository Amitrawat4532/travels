"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Rocket } from "lucide-react";
import type { VehicleType } from "@prisma/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert, KeyValue } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { formatDateLong, formatDuration, formatPaise, formatTime, istToDate } from "@/lib/format";
import { addDaysToDateString, useClientToday } from "@/lib/use-client-today";
import type { FieldErrors } from "@/lib/action-result";
import { createTripAction } from "./actions";
import { VehicleVisual } from "@/features/vehicles/vehicle-visual";

export type RouteOption = {
  id: string;
  origin: string;
  destination: string;
  durationMinutes: number;
  distanceKm: number;
  suggestedFarePaise: number;
  boardingSuggestions: string[];
  dropSuggestions: string[];
  stops: { locationId: string; name: string; minutesFromOrigin: number; distanceFromOriginKm: number }[];
};

export type VehicleOption = {
  id: string;
  model: string;
  type: VehicleType;
  registrationNumber: string;
  seatCapacity: number;
  color: string | null;
  hasCarrier: boolean;
  photos: string[];
};

type StopState = { locationId: string; name: string; enabled: boolean; pointName: string; minutes: number; fare: number };

function defaultStops(route: RouteOption, price: number): StopState[] {
  return route.stops.map((s) => ({
    locationId: s.locationId,
    name: s.name,
    enabled: true,
    pointName: `${s.name} Taxi Stand`,
    minutes: s.minutesFromOrigin,
    fare: Math.round((price * s.distanceFromOriginKm) / route.distanceKm / 10) * 10,
  }));
}

function isAtLeastHourAhead(d: Date) {
  return d.getTime() >= Date.now() + 60 * 60_000;
}

export function TripForm({ routes, vehicles }: { routes: RouteOption[]; vehicles: VehicleOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const route = routes.find((r) => r.id === routeId)!;
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const vehicle = vehicles.find((v) => v.id === vehicleId)!;
  const today = useClientToday();
  const [pickedDate, setDate] = useState("");
  const date = pickedDate || (today ? addDaysToDateString(today, 1) : "");
  const minDate = today || undefined;
  const [time, setTime] = useState("07:00");
  const [duration, setDuration] = useState(route?.durationMinutes ?? 300);
  const [boardingPoint, setBoardingPoint] = useState(route?.boardingSuggestions[0] ?? "");
  const [dropPoint, setDropPoint] = useState(route?.dropSuggestions[0] ?? "");
  const [price, setPrice] = useState(Math.round((route?.suggestedFarePaise ?? 50000) / 100));
  const [seats, setSeats] = useState(vehicle?.seatCapacity ?? 4);
  const [cancellationHours, setCancellationHours] = useState(6);
  const [notes, setNotes] = useState("");
  const [stops, setStops] = useState<StopState[]>(() => (route ? defaultStops(route, price) : []));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function changeRoute(id: string) {
    const r = routes.find((x) => x.id === id)!;
    const p = Math.round(r.suggestedFarePaise / 100);
    setRouteId(id);
    setDuration(r.durationMinutes);
    setBoardingPoint(r.boardingSuggestions[0] ?? "");
    setDropPoint(r.dropSuggestions[0] ?? "");
    setPrice(p);
    setStops(defaultStops(r, p));
  }

  function changeVehicle(id: string) {
    setVehicleId(id);
    const v = vehicles.find((x) => x.id === id)!;
    setSeats(v.seatCapacity);
  }

  function updateStop(i: number, patch: Partial<StopState>) {
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  const departure = date ? istToDate(date, time) : null;
  const arrival = departure ? new Date(departure.getTime() + duration * 60_000) : null;
  const enabledStops = useMemo(() => stops.filter((s) => s.enabled), [stops]);

  const payload = {
    routeId,
    vehicleId,
    date,
    departureTime: time,
    durationMinutes: duration,
    boardingPoint,
    dropPoint,
    stops: enabledStops.map((s) => ({ locationId: s.locationId, pointName: s.pointName, minutesFromOrigin: s.minutes, fareRupees: s.fare })),
    totalSeats: seats,
    priceRupees: price,
    cancellationHours,
    notes,
  };

  function toPreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date) return setError("Choose a travel date.");
    if (departure && !isAtLeastHourAhead(departure)) return setError("Departure must be at least 1 hour from now.");
    setStep("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function publish() {
    setError(null);
    setFieldErrors({});
    start(async () => {
      const res = await createTripAction(payload);
      if (res.ok && res.data) {
        toast.success(res.message ?? "Ride published");
        router.push(`/driver/trips/${res.data.tripId}?published=1`);
      } else if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        setStep("edit");
      }
    });
  }

  if (step === "preview" && departure && arrival) {
    const timeline = [
      { name: route.origin, point: boardingPoint, at: departure, fare: 0 },
      ...enabledStops.map((s) => ({ name: s.name, point: s.pointName, at: new Date(departure.getTime() + s.minutes * 60_000), fare: s.fare })),
      { name: route.destination, point: dropPoint, at: arrival, fare: price },
    ];
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Trip preview" description="This is what passengers will see. Check everything once." />
          <CardBody>
            <p className="text-xs font-bold tracking-wider text-forest-600 uppercase">
              {route.origin} → {route.destination}
            </p>
            <p className="mt-1 text-2xl font-extrabold">
              {formatDateLong(departure)} · {formatTime(departure)}
            </p>
            <p className="text-sm text-muted">
              Arrives approx. {formatTime(arrival)} ({formatDuration(duration)})
            </p>
            <ol className="mt-5 space-y-3 border-l-2 border-forest-200 pl-4">
              {timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-1.5 -left-[23px] size-3 rounded-full border-2 border-forest-600 bg-white" aria-hidden />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <p className="font-semibold">
                      {formatTime(t.at)} · {t.name}
                    </p>
                    {i > 0 && <p className="text-sm text-muted">{formatPaise(t.fare * 100)} from start</p>}
                  </div>
                  <p className="text-sm text-muted">{t.point}</p>
                </li>
              ))}
            </ol>
            {notes && <p className="mt-4 rounded-xl bg-paper p-3 text-sm">📝 {notes}</p>}
          </CardBody>
        </Card>
        <div className="space-y-4">
          <VehicleVisual type={vehicle.type} model={vehicle.model} color={vehicle.color} hasCarrier={vehicle.hasCarrier} photos={vehicle.photos} />
          <Card>
            <CardBody>
              <dl className="divide-y divide-line">
                <KeyValue label="Vehicle">
                  {vehicle.model} ({VEHICLE_TYPE_LABELS[vehicle.type]})
                </KeyValue>
                <KeyValue label="Seats for passengers">{seats}</KeyValue>
                <KeyValue label="Price per seat">{formatPaise(price * 100)}</KeyValue>
                <KeyValue label="Free cancellation">{cancellationHours ? `Until ${cancellationHours} hrs before` : "Until departure"}</KeyValue>
                <KeyValue label="If all seats fill">{formatPaise(price * 100 * seats)}</KeyValue>
              </dl>
              {error && (
                <Alert tone="error" className="mt-4">
                  {error}
                </Alert>
              )}
              <Button size="lg" className="mt-5 w-full" onClick={publish} loading={pending}>
                {!pending && <Rocket className="size-5" aria-hidden />} Publish Ride
              </Button>
              <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep("edit")} disabled={pending}>
                <ArrowLeft className="size-4" aria-hidden /> Edit details
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={toPreview} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Card>
        <CardHeader title="Route & vehicle" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Route (From → To)" htmlFor="route" error={fieldErrors.routeId}>
            <Select id="route" value={routeId} onChange={(e) => changeRoute(e.target.value)}>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.origin} → {r.destination}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vehicle" htmlFor="vehicle" error={fieldErrors.vehicleId}>
            <Select id="vehicle" value={vehicleId} onChange={(e) => changeVehicle(e.target.value)}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.model} · {v.registrationNumber} ({v.seatCapacity} seats)
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Date & time" />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Travel date" htmlFor="date" error={fieldErrors.date}>
            <Input id="date" type="date" value={date} min={minDate} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Departure time" htmlFor="time" error={fieldErrors.departureTime}>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </Field>
          <Field
            label="Journey time (minutes)"
            htmlFor="duration"
            error={fieldErrors.durationMinutes}
            hint={arrival ? `Estimated arrival ${formatTime(arrival)}` : undefined}
          >
            <Input id="duration" type="number" min={30} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Pickup, stops & drop" description="Passengers can board or get down at any enabled stop." />
        <CardBody className="space-y-5">
          <Field label={`Boarding location in ${route.origin}`} htmlFor="boarding" error={fieldErrors.boardingPoint}>
            <Input id="boarding" list="boarding-suggestions" value={boardingPoint} onChange={(e) => setBoardingPoint(e.target.value)} />
            <datalist id="boarding-suggestions">
              {route.boardingSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>

          {stops.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium text-ink-2">Intermediate stops</legend>
              {stops.map((s, i) => (
                <div key={s.locationId} className="rounded-xl border border-line p-3">
                  <label className="flex items-center gap-3 font-semibold">
                    <Checkbox checked={s.enabled} onChange={(e) => updateStop(i, { enabled: e.target.checked })} />
                    {s.name}
                  </label>
                  {s.enabled && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
                      <Field label="Stop landmark" htmlFor={`stop-p-${i}`} error={fieldErrors[`stops.${enabledStops.indexOf(s)}.pointName`]}>
                        <Input id={`stop-p-${i}`} value={s.pointName} onChange={(e) => updateStop(i, { pointName: e.target.value })} />
                      </Field>
                      <Field label="Minutes from start" htmlFor={`stop-m-${i}`} error={fieldErrors[`stops.${enabledStops.indexOf(s)}.minutesFromOrigin`]}>
                        <Input id={`stop-m-${i}`} type="number" min={1} value={s.minutes} onChange={(e) => updateStop(i, { minutes: Number(e.target.value) })} />
                      </Field>
                      <Field label="Fare from start (₹)" htmlFor={`stop-f-${i}`} error={fieldErrors[`stops.${enabledStops.indexOf(s)}.fareRupees`]}>
                        <Input id={`stop-f-${i}`} type="number" min={0} step={10} value={s.fare} onChange={(e) => updateStop(i, { fare: Number(e.target.value) })} />
                      </Field>
                    </div>
                  )}
                </div>
              ))}
            </fieldset>
          )}

          <Field label={`Destination drop point in ${route.destination}`} htmlFor="drop" error={fieldErrors.dropPoint}>
            <Input id="drop" list="drop-suggestions" value={dropPoint} onChange={(e) => setDropPoint(e.target.value)} />
            <datalist id="drop-suggestions">
              {route.dropSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Seats & price" />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Total seats for passengers" htmlFor="seats" error={fieldErrors.totalSeats} hint={`${vehicle.model} has ${vehicle.seatCapacity} passenger seats`}>
            <Input id="seats" type="number" min={1} max={vehicle.seatCapacity} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
          </Field>
          <Field label="Price per seat, full route (₹)" htmlFor="price" error={fieldErrors.priceRupees} hint={`Suggested ${formatPaise(route.suggestedFarePaise)}`}>
            <Input id="price" type="number" min={50} step={10} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </Field>
          <Field label="Free cancellation until" htmlFor="cancel">
            <Select id="cancel" value={cancellationHours} onChange={(e) => setCancellationHours(Number(e.target.value))}>
              <option value={0}>Departure</option>
              <option value={3}>3 hours before</option>
              <option value={6}>6 hours before</option>
              <option value={12}>12 hours before</option>
              <option value={24}>24 hours before</option>
            </Select>
          </Field>
          <Field label="Note for passengers (optional)" htmlFor="notes" className="sm:col-span-3">
            <Textarea id="notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Roof carrier for luggage. Tea break at Devprayag." />
          </Field>
        </CardBody>
      </Card>

      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <Button type="submit" size="lg" className="w-full shadow-lift sm:w-auto">
          <Eye className="size-5" aria-hidden /> Preview trip
        </Button>
      </div>
    </form>
  );
}
