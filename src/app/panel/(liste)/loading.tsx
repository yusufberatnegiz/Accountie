import { AppShell } from "@/components/AppShell";
import { PanelLoading } from "@/components/PanelLoading";

// Shown while the list (and the rules, which re-export it) wait for the database. The review screen has none: its title morphs in from the list row.
export default function Loading() {
  return <AppShell current="fisler"><PanelLoading /></AppShell>;
}
