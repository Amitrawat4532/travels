"use client";

import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import type { VehicleType } from "@prisma/client";
import { Field, Input, Select, Checkbox } from "@/components/ui/form";
import type { FieldErrors } from "@/lib/action-result";
import { VEHICLE_DEFAULT_SEATS, VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { VehicleVisual } from "./vehicle-visual";

const MODEL_SUGGESTIONS: Record<VehicleType, string[]> = {
  HATCHBACK: ["Maruti Swift", "Maruti WagonR", "Hyundai i20", "Tata Tiago"],
  SEDAN: ["Maruti Dzire", "Honda Amaze", "Hyundai Aura", "Toyota Etios"],
  SUV: ["Mahindra Scorpio", "Mahindra Scorpio-N", "Tata Safari", "Mahindra XUV500"],
  BOLERO: ["Mahindra Bolero", "Mahindra Bolero Neo", "Mahindra Bolero Camper"],
  SUMO: ["Tata Sumo Gold", "Tata Sumo Victa"],
  ERTIGA: ["Maruti Ertiga", "Toyota Rumion"],
  INNOVA: ["Toyota Innova Crysta", "Toyota Innova Hycross", "Toyota Innova"],
  TEMPO_TRAVELLER: ["Force Tempo Traveller", "Force Traveller 3350"],
  MINI_BUS: ["Force Traveller 26", "Tata Winger", "Eicher Skyline"],
};

const COLORS = ["White", "Silver", "Grey", "Black", "Red", "Blue", "Maroon", "Brown", "Beige", "Yellow"];

type Initial = Partial<{
  registrationNumber: string;
  type: VehicleType;
  model: string;
  color: string;
  seatCapacity: number;
  isAc: boolean;
  hasCarrier: boolean;
}>;

/** Vehicle details + documents + photos, with a live picture of the vehicle. */
export function VehicleFields({
  errors,
  initial,
  requireDocs = true,
}: {
  errors?: FieldErrors;
  initial?: Initial;
  requireDocs?: boolean;
}) {
  const [type, setType] = useState<VehicleType>(initial?.type ?? "BOLERO");
  const [model, setModel] = useState(initial?.model ?? "");
  const [color, setColor] = useState(initial?.color ?? "White");
  const [seats, setSeats] = useState(initial?.seatCapacity ?? VEHICLE_DEFAULT_SEATS.BOLERO);
  const [hasCarrier, setHasCarrier] = useState(initial?.hasCarrier ?? true);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  function onType(t: VehicleType) {
    setType(t);
    setSeats(VEHICLE_DEFAULT_SEATS[t]);
    if (!model || !MODEL_SUGGESTIONS[t].includes(model)) setModel("");
  }

  function onPhotos(files: FileList | null) {
    if (!files) return;
    const next = [...photos, ...[...files].filter((f) => f.type.startsWith("image/")).map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 6);
    setPhotos(next);
  }

  // Keep the real <input type=file> in sync with the previews (so removed photos are not uploaded).
  function syncInput(input: HTMLInputElement | null) {
    if (!input) return;
    const dt = new DataTransfer();
    photos.forEach((p) => dt.items.add(p.file));
    input.files = dt.files;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vehicle registration number" htmlFor="registrationNumber" error={errors?.registrationNumber} hint="As on RC, e.g. UK07TA4521">
          <Input
            id="registrationNumber"
            name="registrationNumber"
            defaultValue={initial?.registrationNumber}
            autoCapitalize="characters"
            className="font-mono uppercase"
            placeholder="UK07TA4521"
          />
        </Field>
        <Field label="Vehicle type" htmlFor="type" error={errors?.type}>
          <Select id="type" name="type" value={type} onChange={(e) => onType(e.target.value as VehicleType)}>
            {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((t) => (
              <option key={t} value={t}>
                {VEHICLE_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Make & model" htmlFor="model" error={errors?.model} hint="Company + model, e.g. Mahindra Bolero Neo">
          <Input id="model" name="model" list="model-suggestions" value={model} onChange={(e) => setModel(e.target.value)} placeholder={MODEL_SUGGESTIONS[type][0]} />
          <datalist id="model-suggestions">
            {MODEL_SUGGESTIONS[type].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        <Field label="Colour" htmlFor="color" error={errors?.color}>
          <Select id="color" name="color" value={color} onChange={(e) => setColor(e.target.value)}>
            {COLORS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Passenger seats (excluding driver)" htmlFor="seatCapacity" error={errors?.seatCapacity}>
          <Input id="seatCapacity" name="seatCapacity" type="number" min={1} max={20} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
        </Field>
        <Field label="Taxi permit number" htmlFor="permitNumber" error={errors?.permitNumber}>
          <Input id="permitNumber" name="permitNumber" placeholder="e.g. UK-CC-1234/2024" />
        </Field>
        <div className="flex flex-wrap gap-5 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox name="isAc" value="true" defaultChecked={initial?.isAc} /> AC available
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox name="hasCarrier" value="true" checked={hasCarrier} onChange={(e) => setHasCarrier(e.target.checked)} /> Roof carrier for luggage
          </label>
        </div>

        <FileField name="rcDoc" label={`Vehicle RC${requireDocs ? "" : " (optional)"}`} error={errors?.rcDoc} />
        <FileField name="insuranceDoc" label={`Insurance certificate${requireDocs ? "" : " (optional)"}`} error={errors?.insuranceDoc} />
        <FileField name="permitDoc" label="Permit document (optional)" error={errors?.permitDoc} />

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-ink-2">Photos of your vehicle (recommended)</p>
          <p className="mb-2 text-xs text-muted">Passengers trust real photos most — front, side and inside. Up to 6 images.</p>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={p.url} className="relative size-20 overflow-hidden rounded-xl ring-1 ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                <img src={p.url} alt={`Vehicle photo ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((x) => x.url !== p.url))}
                  className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-ink/70 text-white"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-forest-200 text-xs font-semibold text-forest-700 hover:bg-forest-50">
                <ImagePlus className="size-5" aria-hidden />
                Add
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => onPhotos(e.target.files)} />
              </label>
            )}
          </div>
          {/* The actual field submitted with the form */}
          <input ref={syncInput} type="file" name="vehiclePhotos" multiple hidden tabIndex={-1} aria-hidden />
          {errors?.vehiclePhotos && <p className="mt-1.5 text-sm text-danger-500">{errors.vehiclePhotos[0]}</p>}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-sm font-medium text-ink-2">Your vehicle</p>
        <VehicleVisual
          type={type}
          model={model}
          color={color}
          hasCarrier={hasCarrier}
          photos={photos.map((p) => p.url)}
        />
        <p className="mt-2 text-xs text-muted">
          {photos.length
            ? "This is how passengers will see your vehicle."
            : "Preview updates as you type. Add real photos so passengers recognise your gaadi at the stand."}
        </p>
      </div>
    </div>
  );
}

export function FileField({ name, label, error, accept = "image/jpeg,image/png,image/webp,application/pdf" }: { name: string; label: string; error?: string[]; accept?: string }) {
  return (
    <Field label={label} htmlFor={name} error={error} hint="JPG, PNG, WEBP or PDF · max 5 MB">
      <input
        id={name}
        name={name}
        type="file"
        accept={accept}
        className="block w-full cursor-pointer rounded-xl border border-dashed border-line bg-white text-sm text-muted file:mr-3 file:h-11 file:cursor-pointer file:rounded-l-xl file:border-0 file:bg-forest-50 file:px-4 file:font-semibold file:text-forest-800 hover:file:bg-forest-100"
      />
    </Field>
  );
}
