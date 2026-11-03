// Dev-only: the preview starts at the panel's receipt list.
import { redirect } from "next/navigation";

export default function PreviewIndex() {
  redirect("/onizleme/panel");
}
