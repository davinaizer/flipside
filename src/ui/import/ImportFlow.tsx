"use client";

import { useState } from "react";
import { buildPreview, parseImportFile } from "@/domain/import-file";
import { ANSWER_STYLES, CARD_COLORS } from "@/shared/enums";
import type { ImportIssue, ImportPreview as Preview, ImportResult } from "@/shared/schemas/import";
import { ApiClientError, api } from "@/ui/api/client";
import { ImportBlocked, ImportPreview, StepHeading } from "./ImportPreview";
import { ImportSuccess } from "./ImportSuccess";

export interface DeckChoice {
  id: string;
  name: string;
}

type Step =
  | { kind: "choose" }
  | { kind: "reading" }
  | { kind: "blocked"; issues: ImportIssue[] }
  | { kind: "preview"; preview: Preview }
  | { kind: "saving"; preview: Preview }
  | { kind: "error"; preview: Preview; message: string }
  | { kind: "done"; deckName: string; result: ImportResult };

// Full class names so Tailwind sees them; tokens live in tokens.css.
const SWATCH = {
  mist: "bg-card-mist",
  cream: "bg-card-cream",
  peach: "bg-card-peach",
  sage: "bg-card-sage",
  lavender: "bg-card-lavender",
  night: "bg-card-night",
} as const;

const field = "min-h-11 rounded-xl bg-surface-container-low px-3 outline outline-1 outline-outline";

/**
 * Add or re-import a deck (PRD section 6 flow). The file is parsed here with the shared domain
 * functions, so choosing it sends nothing; only "Add" posts it, and the server revalidates.
 */
export function ImportFlow({ decks, initialDeckId }: { decks: DeckChoice[]; initialDeckId?: string }) {
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [file, setFile] = useState<File | null>(null);
  const [deckId, setDeckId] = useState(decks.some((d) => d.id === initialDeckId) ? (initialDeckId ?? "") : "");
  const [name, setName] = useState("");

  async function choose(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setStep({ kind: "reading" });
    try {
      const parsed = await parseImportFile(new Uint8Array(await f.arrayBuffer()));
      setStep(parsed.ok ? { kind: "preview", preview: buildPreview(parsed) } : { kind: "blocked", issues: parsed.issues });
    } catch {
      setStep({ kind: "blocked", issues: [{ severity: "block", code: "unreadable", message: "The file could not be read" }] });
    }
  }

  async function add(form: HTMLFormElement, preview: Preview) {
    if (!file) return;
    const body = new FormData(form);
    body.set("file", file);
    setStep({ kind: "saving", preview });
    try {
      const result = await api.commitImport(body);
      const deckName = deckId ? (decks.find((d) => d.id === deckId)?.name ?? "your deck") : name.trim();
      setStep({ kind: "done", deckName, result });
    } catch (e) {
      const message = e instanceof ApiClientError && e.status < 500 ? e.message : "We could not save this just now. Nothing was changed, so you can try again.";
      setStep({ kind: "error", preview, message });
    }
  }

  if (step.kind === "done") return <ImportSuccess deckName={step.deckName} result={step.result} />;
  const preview = "preview" in step ? step.preview : null;
  const saving = step.kind === "saving";

  const existing = decks.find((d) => d.id === deckId);
  const canSave = preview !== null && preview.validCount > 0;
  const cardsLabel = preview ? `${preview.validCount} ${preview.validCount === 1 ? "card" : "cards"}` : "";

  return (
    <form
      className="grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        if (preview) void add(e.currentTarget, preview);
      }}
    >
      <div className="flex flex-col gap-6">
        <section aria-label="Choose file" className="flex flex-col gap-4 rounded-2xl bg-surface-container p-6">
          <StepHeading n={1} title="Choose file" hint="Import cards using a spreadsheet or packaged archive" />
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex min-h-11 cursor-pointer items-center rounded-full bg-primary px-8 text-on-primary focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
              {file ? "Choose a different file" : "Choose CSV or zip"}
              <input
                type="file"
                accept=".csv,.zip,text/csv,application/zip"
                className="sr-only"
                onChange={(e) => void choose(e.target.files?.[0])}
              />
            </label>
            {file && <span className="break-all">{file.name}</span>}
            <a href="/api/v1/imports/template" download className="flex min-h-11 items-center underline">
              Download CSV template
            </a>
          </div>
          {existing && <p>Updating {existing.name}. Choose the new version of its file.</p>}
          <p className="text-on-surface-variant">
            Needs the columns topic, front and back. Add a zip to bring pictures too.
          </p>
        </section>

        {step.kind === "reading" && <p role="status" aria-label="Loading">Reading the file...</p>}
        {step.kind === "blocked" && <ImportBlocked issues={step.issues} />}
        {preview && file && <ImportPreview preview={preview} fileName={file.name} />}
      </div>

      {canSave && (
        <section aria-label="Deck details" className="flex flex-col gap-4 rounded-2xl bg-surface-container p-6">
          <StepHeading n={3} title="Deck details" hint="Appearance and presentation settings" />
          <label className="flex flex-col gap-1">
            Add to
            <select name="deckId" value={deckId} onChange={(e) => setDeckId(e.target.value)} className={field} disabled={saving}>
              <option value="">A new deck</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>Update {d.name}</option>
              ))}
            </select>
          </label>
          {deckId ? (
            <p className="text-on-surface-variant">
              Cards with the same id are updated and keep their progress. New ids are added. Cards missing from the file stay.
            </p>
          ) : (
            <fieldset className="flex flex-col gap-4" disabled={saving}>
              <label className="flex flex-col gap-1">
                Deck name
                <input name="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={field} />
              </label>
              <label className="flex flex-col gap-1">
                Group (optional)
                <input name="group" maxLength={100} className={field} />
                <span className="text-sm text-on-surface-variant">Decks in the same group sit together in the Library.</span>
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1">Card colour</legend>
                <div className="flex flex-wrap gap-2">
                  {CARD_COLORS.map((c) => (
                    <label key={c} className="relative cursor-pointer">
                      <input type="radio" name="color" value={c} defaultChecked={c === "mist"} className="peer sr-only" />
                      <span className={`block size-11 rounded-full outline outline-1 outline-outline ${SWATCH[c]} peer-checked:outline-4 peer-checked:outline-primary peer-focus-visible:outline-offset-2`} />
                      <span className="sr-only">{c[0].toUpperCase() + c.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1">Show answers as</legend>
                <div className="flex gap-1 rounded-full bg-surface-container-low p-1">
                  {ANSWER_STYLES.map((a) => (
                    <label key={a} className="relative flex-1 cursor-pointer">
                      <input type="radio" name="answerStyle" value={a} defaultChecked={a === "paragraph"} className="peer sr-only" />
                      <span className="flex min-h-11 items-center justify-center gap-2 rounded-full px-3 peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
                        <span aria-hidden="true">{a === "bullets" ? "\u2630" : "\u2261"}</span>
                        {a === "bullets" ? "Bullet list" : "Paragraph"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </fieldset>
          )}
          {step.kind === "error" && <p role="alert" className="text-error">{step.message}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="min-h-11 rounded-full bg-primary px-8 text-on-primary disabled:opacity-60">
              {saving ? "Saving..." : deckId ? "Update deck" : `Add ${cardsLabel}`}
            </button>
            <a href="/library" className="flex min-h-11 items-center px-4 underline">Cancel</a>
          </div>
        </section>
      )}
    </form>
  );
}
