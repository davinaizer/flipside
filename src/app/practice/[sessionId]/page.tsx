/** Stub: the practice screen lands in F6. Start practice already opens this route. */
export default async function PracticePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return (
    <main className="min-h-screen bg-surface p-8 text-on-surface" data-session={sessionId}>
      <h1 className="text-3xl font-semibold">Practice</h1>
    </main>
  );
}
