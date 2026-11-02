import { CSV_TEMPLATE } from "@/domain/csv-template";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response(CSV_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="flipside-template.csv"',
    },
  });
}
