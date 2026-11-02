export interface Leech {
  id: string;
  topic: string;
  front: string;
  lapses: number;
}

/** D6: cards flagged as leeches with lapse counts. Absent when there are none. */
export function NeedsRewording({ leeches }: { leeches: Leech[] }) {
  if (leeches.length === 0) return null;
  return (
    <section aria-labelledby="needs-rewording" className="mt-8 max-w-5xl">
      <h2 id="needs-rewording" className="mb-1 text-2xl font-semibold">Needs rewording</h2>
      <p className="mb-3 text-on-surface-variant">These cards keep being missed. Try splitting or rewording them.</p>
      <ul className="grid gap-3">
        {leeches.map((c) => (
          <li key={c.id} className="rounded-card border border-card-edge bg-surface-card shadow-card p-4">
            <p className="font-semibold">{c.front}</p>
            <p className="text-sm text-on-surface-variant">
              {c.topic} · missed {c.lapses} {c.lapses === 1 ? "time" : "times"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
