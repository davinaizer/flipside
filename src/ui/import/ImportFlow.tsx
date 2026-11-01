"use client";

import { useState } from "react";
import { buildPreview, parseImportFile } from "@/domain/import-file";
import { ANSWER_STYLES, CARD_COLORS } from "@/shared/enums";
import type { ImportIssue, ImportPreview as Preview, ImportResult } from "@/shared/schemas/import";
import { ApiClientError, api } from "@/ui/api/client";
import { ImportBlocked, ImportPreview } from "./ImportPreview";
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

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex min-h-11 cursor-pointer items-center rounded-full bg-primary px-8 text-on-primary focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
          Choose CSV or zip
          <input
            type="file"
            accept=".csv,.zip,text/csv,application/zip"
            className="sr-only"
            onChange={(e) => void choose(e.target.files?.[0])}
          />
        </label>
        <a href="/api/v1/imports/template" download className="flex min-h-11 items-center underline">
          Download CSV template
        </a>
      </div>
      {deckId && (
        <p>Updating {decks.find((d) => d.id === deckId)?.name}. Choose the new version of its file.</p>
      )}
      <p className="text-on-surface-variant">
        Needs the columns topic, front and back. Add a zip to bring pictures too.
      </p>

      {step.kind === "reading" && (
        <p role="status" aria-label="Loading">Reading the file...</p>
      )}
      {step.kind === "blocked" && <ImportBlocked issues={step.issues} />}
      {preview && file && <ImportPreview preview={preview} fileName={file.name} />}

      {preview && preview.validCount > 0 && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void add(e.currentTarget, preview);
          }}
        >
          <label className="flex flex-col gap-1">
            Add to
            <select
              name="deckId"
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className={field}
              disabled={saving}
            >
              <option value="">A new deck</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  Update {d.name}
                </option>
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
              </label>
              <label className="flex flex-col gap-1">
                Card colour
                <select name="color" defaultValue="mist" className={field}>
                  {CARD_COLORS.map((c) => (
                    <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Answer style
                <select name="answerStyle" defaultValue="paragraph" className={field}>
                  {ANSWER_STYLES.map((a) => (
                    <option key={a} value={a}>{a === "bullets" ? "Bullet list" : "Paragraph"}</option>
                  ))}
                </select>
              </label>
            </fieldset>
          )}
          {step.kind === "error" && (
            <p role="alert" className="text-error">{step.message}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 self-start rounded-full bg-primary px-8 text-on-primary disabled:opacity-60"
          >
            {saving ? "Saving..." : deckId ? "Update deck" : "Add deck"}
          </button>
        </form>
      )}
    </div>
  );
}
