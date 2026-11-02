import type { Stats } from "@/shared/schemas/stats";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** By deck (S4): rows arrive lowest mastery first. Mastered is the share in boxes 4-5 (PRD s7), with the count as secondary text. */
export function ByDeckTable({ decks }: { decks: Stats["byDeck"] }) {
  if (decks.length === 0) return null;
  const th = "px-4 py-3 text-left text-base font-semibold text-on-surface-variant";
  return (
    <section aria-labelledby="by-deck-title">
      <h2 id="by-deck-title" className="text-2xl font-semibold">By deck</h2>
      <p className="text-base text-on-surface-variant">Sorted by lowest mastery</p>
      <div className="mt-4 overflow-x-auto rounded-card border border-card-edge bg-surface-card shadow-card">
        <table className="w-full min-w-[32rem] text-base">
          <thead>
            <tr>
              <th scope="col" className={th}>Deck</th>
              <th scope="col" className={th}>Cards</th>
              <th scope="col" className={th}>Mastered</th>
              <th scope="col" className={th}>Median time</th>
              <th scope="col" className={th}>Last practised</th>
            </tr>
          </thead>
          <tbody>
            {decks.map((d) => (
              <tr key={d.deckId} className="border-t border-outline-variant">
                <th scope="row" className="px-4 py-3 text-left font-semibold">{d.name}</th>
                <td className="px-4 py-3">{d.cards}</td>
                <td className="px-4 py-3">
                  {d.mastery === null ? "–" : `${Math.round(d.mastery * 100)}%`}
                  <span className="text-on-surface-variant">{` (${d.mastered})`}</span>
                </td>
                <td className="px-4 py-3">{d.medianSeconds === null ? "–" : `${Math.round(d.medianSeconds)} s`}</td>
                <td className="px-4 py-3">{d.lastPractisedAt ? day(d.lastPractisedAt) : "Not yet"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
