// Dev-only fixture preview of the account rules screen.
import { AppHeader } from "@/components/AppHeader";
import { RulesView } from "@/components/RulesView";
import { PREVIEW_RULE_ROWS } from "@/lib/preview-fixtures";

export default function PreviewRules() {
  return (
    <>
      <AppHeader current="kurallar" />
      <RulesView rows={PREVIEW_RULE_ROWS} />
    </>
  );
}
