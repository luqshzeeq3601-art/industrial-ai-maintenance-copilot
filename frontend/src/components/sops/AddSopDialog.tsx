import { useState, type FormEvent } from "react";
import type { SopCategory } from "../../api/models";
import { SOP_CATEGORIES } from "../../lib/status";
import { useCreateSop } from "../../api/queries";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { SelectField, TextAreaField, TextField } from "../ui/Field";

const EMPTY = { id: "", title: "", category: "maintenance" as SopCategory, assets: "", body: "" };
type Errors = Partial<Record<keyof typeof EMPTY | "form", string>>;

/** Admin-only: add a draft SOP. The copilot cites it after the document index is rebuilt. */
export function AddSopDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSop();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [created, setCreated] = useState<string | null>(null);

  const bind = (key: keyof typeof EMPTY) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))
  });

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e: Errors = {};
    const id = form.id.trim().toUpperCase();
    if (!/^SOP-[A-Z0-9-]{2,30}$/.test(id)) e.id = "Use the form SOP-XXX, with letters, numbers, and hyphens.";
    if (form.title.trim().length < 3) e.title = "Give the procedure a title of at least 3 characters.";
    if (form.body.trim().length < 20) e.body = "Write out the procedure steps (at least 20 characters).";
    setErrors(e);
    if (Object.keys(e).length) return;
    create.mutate(
      { id, title: form.title.trim(), category: form.category, assets: form.assets.split(",").map((a) => a.trim()).filter(Boolean), body: form.body },
      {
        onSuccess: (sop) => {
          setCreated(sop.id);
          setForm(EMPTY);
        },
        onError: (err) => setErrors({ form: err.message })
      }
    );
  };

  const close = () => {
    setCreated(null);
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add SOP"
      description="Saved as a draft. Rebuild the document index so the copilot can cite it."
      footer={
        created ? (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" type="submit" form="add-sop" loading={create.isPending}>
              Add SOP
            </Button>
          </>
        )
      }
    >
      {created ? (
        <p role="status" className="p-3 rounded-[var(--radius-control)] bg-success-bg text-meta font-medium text-success-ink">
          <span className="font-data">{created}</span> was added as a draft.
        </p>
      ) : (
        <form id="add-sop" onSubmit={submit} noValidate className="space-y-4">
          {errors.form && (
            <p role="alert" className="p-3 rounded-[var(--radius-control)] bg-danger-bg text-meta font-medium text-danger-ink">
              Couldn't add the SOP: {errors.form}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="SOP ID" required placeholder="SOP-MNT-015" className="font-data" error={errors.id} {...bind("id")} />
            <SelectField label="Category" options={SOP_CATEGORIES} {...bind("category")} />
          </div>
          <TextField label="Title" required maxLength={150} error={errors.title} {...bind("title")} />
          <TextField label="Assets" hint="Asset names or IDs, separated by commas. Leave empty if it applies to all." {...bind("assets")} />
          <TextAreaField label="Procedure" required rows={10} maxLength={50000} hint="Markdown is supported. Put safety and lockout steps first." error={errors.body} {...bind("body")} />
        </form>
      )}
    </Dialog>
  );
}
