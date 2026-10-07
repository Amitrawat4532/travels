"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Checkbox } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { useFormAction } from "@/components/ui/use-form-action";
import { createLocationAction, saveRouteAction } from "./actions";

type Loc = { id: string; name: string };
export type RouteInitial = {
  id: string;
  originId: string;
  destinationId: string;
  distanceKm: number;
  durationMinutes: number;
  suggestedFareRupees: number;
  isPopular: boolean;
  stopIds: string[];
};

export function RouteForm({ locations, initial, onDone }: { locations: Loc[]; initial?: RouteInitial; onDone?: () => void }) {
  const { onSubmit, pending, error, fieldErrors: fe, state } = useFormAction(saveRouteAction);
  const [stopIds, setStopIds] = useState<string[]>(initial?.stopIds ?? []);
  const [addStop, setAddStop] = useState("");

  if (state.ok && !initial) {
    return (
      <div className="space-y-3">
        <Alert tone="success">{state.message}</Alert>
        {onDone && (
          <Button variant="outline" onClick={onDone}>
            Done
          </Button>
        )}
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {stopIds.map((id) => (
        <input key={id} type="hidden" name="stopIds" value={id} />
      ))}
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From" htmlFor={`o-${initial?.id ?? "new"}`} error={fe?.originId}>
          <Select id={`o-${initial?.id ?? "new"}`} name="originId" defaultValue={initial?.originId ?? ""}>
            <option value="" disabled>
              Choose
            </option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="To" htmlFor={`d-${initial?.id ?? "new"}`} error={fe?.destinationId}>
          <Select id={`d-${initial?.id ?? "new"}`} name="destinationId" defaultValue={initial?.destinationId ?? ""}>
            <option value="" disabled>
              Choose
            </option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Distance (km)" htmlFor={`km-${initial?.id ?? "new"}`} error={fe?.distanceKm}>
          <Input id={`km-${initial?.id ?? "new"}`} name="distanceKm" type="number" min={1} defaultValue={initial?.distanceKm} />
        </Field>
        <Field label="Travel time (minutes)" htmlFor={`min-${initial?.id ?? "new"}`} error={fe?.durationMinutes}>
          <Input id={`min-${initial?.id ?? "new"}`} name="durationMinutes" type="number" min={10} defaultValue={initial?.durationMinutes} />
        </Field>
        <Field label="Suggested fare per seat (₹)" htmlFor={`fare-${initial?.id ?? "new"}`} error={fe?.suggestedFareRupees}>
          <Input id={`fare-${initial?.id ?? "new"}`} name="suggestedFareRupees" type="number" min={10} defaultValue={initial?.suggestedFareRupees} />
        </Field>
        <div className="flex flex-col justify-end gap-2 pb-1">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox name="isPopular" value="true" defaultChecked={initial?.isPopular} /> Show as popular route
          </label>
          {!initial && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox name="createReverse" value="true" defaultChecked /> Also create the return route
            </label>
          )}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Intermediate stops (in travel order)</p>
        <ol className="mb-2 flex flex-wrap gap-2">
          {stopIds.map((id, i) => (
            <li key={id} className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 py-1 pr-1 pl-3 text-sm font-medium text-forest-800">
              {i + 1}. {locations.find((l) => l.id === id)?.name}
              <button type="button" className="rounded-full px-1.5 hover:bg-forest-100" onClick={() => setStopIds((s) => s.filter((x) => x !== id))} aria-label="Remove stop">
                ×
              </button>
            </li>
          ))}
        </ol>
        <div className="flex gap-2">
          <Select value={addStop} onChange={(e) => setAddStop(e.target.value)} aria-label="Add stop" className="max-w-xs">
            <option value="">Add a stop…</option>
            {locations
              .filter((l) => !stopIds.includes(l.id))
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </Select>
          <Button
            type="button"
            variant="outline"
            disabled={!addStop}
            onClick={() => {
              setStopIds((s) => [...s, addStop]);
              setAddStop("");
            }}
          >
            Add
          </Button>
        </div>
      </div>
      <Button type="submit" loading={pending}>
        {initial ? "Save route" : "Create route"}
      </Button>
    </form>
  );
}

export function NewRoutePanel({ locations }: { locations: Loc[] }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  if (!open)
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Add route
      </Button>
    );
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="mb-4 text-lg font-bold">New route</h2>
      <RouteForm
        key={key}
        locations={locations}
        onDone={() => {
          setOpen(false);
          setKey((k) => k + 1);
        }}
      />
    </div>
  );
}

export function LocationForm() {
  const { onSubmit, pending, error, fieldErrors: fe, state } = useFormAction(createLocationAction);
  return (
    <form method="post" onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_auto] sm:items-end" key={state.ok ? state.message : "loc"}>
      <Field label="Location name" htmlFor="loc-name" error={fe?.name}>
        <Input id="loc-name" name="name" placeholder="e.g. Gauchar" />
      </Field>
      <Field label="District" htmlFor="loc-district">
        <Input id="loc-district" name="district" placeholder="Chamoli" />
      </Field>
      <Field label="Latitude" htmlFor="loc-lat" error={fe?.latitude}>
        <Input id="loc-lat" name="latitude" inputMode="decimal" placeholder="30.28" />
      </Field>
      <Field label="Longitude" htmlFor="loc-lng" error={fe?.longitude}>
        <Input id="loc-lng" name="longitude" inputMode="decimal" placeholder="79.16" />
      </Field>
      <Button type="submit" loading={pending}>
        Add
      </Button>
      {(error || state.ok) && (
        <p className={state.ok ? "text-sm text-forest-700 sm:col-span-5" : "text-sm text-danger-500 sm:col-span-5"}>{state.ok ? state.message : error}</p>
      )}
    </form>
  );
}
