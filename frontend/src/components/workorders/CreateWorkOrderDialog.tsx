import { useEffect, useState, type FormEvent } from "react";
import type { Equipment } from "../../api/models";
import { useCreateWorkOrder } from "../../api/queries";
import { isoDay } from "../../lib/format";
import { PRIORITY } from "../../lib/status";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { SelectField, TextAreaField, TextField } from "../ui/Field";

interface CreateWorkOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  equipment: Equipment[];
  /** Asset preselected when opened from an asset. */
  initialAsset?: string;
}

type Errors = Partial<Record<"machine_id" | "title" | "due_date" | "form", string>>;

export function CreateWorkOrderDialog({ open, onClose, onCreated, equipment, initialAsset }: CreateWorkOrderDialogProps) {
  const create = useCreateWorkOrder();
  const [form, setForm] = useState({ machine_id: "", title: "", description: "", priority: "medium", assigned_to: "", due_date: "" });
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (open) {
      setForm((f) => ({ ...f, machine_id: initialAsset ?? f.machine_id }));
      setErrors({});
    }
  }, [open, initialAsset]);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))
  });

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.machine_id) e.machine_id = "Choose the asset this work is for.";
    if (form.title.trim().length < 3) e.title = "Describe the work in at least 3 characters.";
    if (form.due_date && form.due_date < isoDay(0)) e.due_date = "The due date can't be in the past.";
    return e;
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`wo-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    create.mutate(
      {
        machine_id: form.machine_id,
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        assigned_to: form.assigned_to.trim() || undefined,
        due_date: form.due_date || undefined
      },
      {
        onSuccess: (wo) => {
          setForm({ machine_id: "", title: "", description: "", priority: "medium", assigned_to: "", due_date: "" });
          onCreated(wo.work_order_id);
        },
        onError: (err) => setErrors({ form: err.message })
      }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create work order"
      description="New work orders wait for a supervisor's approval."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="create-wo" loading={create.isPending}>
            Create work order
          </Button>
        </>
      }
    >
      <form id="create-wo" onSubmit={submit} noValidate className="space-y-4">
        {errors.form && (
          <p role="alert" className="p-3 rounded-[var(--radius-control)] bg-danger-bg text-meta font-medium text-danger-ink">
            Couldn't create the work order: {errors.form}
          </p>
        )}
        <SelectField
          id="wo-machine_id"
          label="Asset"
          required
          placeholder="Choose an asset"
          options={equipment.map((e) => ({ value: e.machine_id, label: `${e.machine_id} · ${e.name}` }))}
          error={errors.machine_id}
          {...field("machine_id")}
        />
        <TextField id="wo-title" label="Title" required maxLength={200} placeholder="What needs doing" error={errors.title} {...field("title")} />
        <TextAreaField label="Description" maxLength={2000} hint="Symptoms, fault codes, and anything the technician should know." {...field("description")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Priority"
            options={(["critical", "high", "medium", "low"] as const).map((p) => ({ value: p, label: PRIORITY[p].label }))}
            {...field("priority")}
          />
          <TextField id="wo-due_date" label="Due date" type="date" min={isoDay(0)} error={errors.due_date} {...field("due_date")} />
        </div>
        <TextField label="Assignee" maxLength={100} placeholder="Name of the technician" autoComplete="off" {...field("assigned_to")} />
      </form>
    </Dialog>
  );
}
