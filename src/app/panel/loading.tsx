import { AppShell } from "@/components/AppShell";
import { PanelLoading } from "@/components/PanelLoading";

// Shown while the force-dynamic panel pages wait for the database.
export default function Loading() {
  return <AppShell current="fisler"><PanelLoading /></AppShell>;
}
