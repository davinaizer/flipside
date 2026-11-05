import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "@/shared/settings";
import { SettingsProvider } from "@/ui/settings/SettingsProvider";
import { PracticeView } from "./PracticeView";
import { SettingsPopover, SettingsShortcut } from "./SettingsPopover";

test("the shortcut opens a dialog, and the popover holds the reading options", () => {
  expect(renderToStaticMarkup(<SettingsShortcut onOpen={() => {}} />)).toContain(
    "Reading settings",
  );
  const html = renderToStaticMarkup(
    <SettingsProvider initial={DEFAULT_SETTINGS}>
      <SettingsPopover onClose={() => {}} />
    </SettingsProvider>,
  );
  expect(html).toContain('role="dialog"');
  expect(html).toContain('aria-modal="true"');
  for (const t of ["Lexend", "Large", "Reset to defaults", "Done"]) expect(html).toContain(t);
});

test("PracticeView places the header action in the top bar", () => {
  const html = renderToStaticMarkup(
    <PracticeView
      card={{
        cardId: "c",
        deckId: "d",
        deckName: "D",
        answerStyle: "paragraph",
        topic: "T",
        front: "Q",
        back: "A",
        frontImage: null,
        backImage: null,
        labels: { not_yet: "", nearly: "", got_it: "" },
      }}
      revealed={false}
      done={0}
      total={1}
      settings={DEFAULT_SETTINGS}
      onReveal={() => {}}
      headerAction={<SettingsShortcut onOpen={() => {}} />}
    />,
  );
  expect(html).toContain("Reading settings");
});
