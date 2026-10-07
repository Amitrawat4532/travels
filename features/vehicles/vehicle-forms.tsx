"use client";

import { useState } from "react";
import { ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { useFormAction } from "@/components/ui/use-form-action";
import { addVehicleAction, addVehiclePhotosAction } from "@/features/driver/actions";
import { VehicleFields } from "./vehicle-fields";

export function AddVehicleForm() {
  const [open, setOpen] = useState(false);
  const { onSubmit, pending, error, fieldErrors, state } = useFormAction(addVehicleAction);
  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Add vehicle
      </Button>
    );
  }
  if (state.ok) {
    return (
      <Alert tone="success" title="Vehicle submitted">
        {state.message}
      </Alert>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-card" noValidate>
      <h2 className="text-lg font-bold">Add a vehicle</h2>
      {error && <Alert tone="error">{error}</Alert>}
      <VehicleFields errors={fieldErrors} />
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          Submit for approval
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddPhotosForm({ vehicleId, remaining }: { vehicleId: string; remaining: number }) {
  const { onSubmit, pending, error, state } = useFormAction(addVehiclePhotosAction);
  const [count, setCount] = useState(0);
  if (remaining <= 0) return null;
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2" key={state.ok ? state.message : "f"}>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-forest-300 px-3 text-sm font-semibold text-forest-700 hover:bg-forest-50">
        <ImagePlus className="size-4" aria-hidden />
        {count ? `${count} selected` : "Choose photos"}
        <input
          type="file"
          name="vehiclePhotos"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => setCount(Math.min(e.target.files?.length ?? 0, remaining))}
        />
      </label>
      {count > 0 && (
        <Button type="submit" size="sm" loading={pending}>
          Upload
        </Button>
      )}
      {error && <span className="text-sm text-danger-500">{error}</span>}
      {state.ok && <span className="text-sm text-forest-700">{state.message}</span>}
    </form>
  );
}
