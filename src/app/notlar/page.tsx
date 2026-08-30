import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { currentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { todayInIstanbul } from "@/lib/deadlines";
import { loadRelationChoices } from "@/lib/office-data";
import { reminderInputParts } from "@/lib/reminders";
import { createNote, deleteNote, toggleNote, updateNote } from "./actions";

export const metadata: Metadata = { title: "Notlar" };
export const dynamic = "force-dynamic";

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const user = await currentUser();
  const { hata } = await searchParams;
  const [rows, relationChoices] = await Promise.all([
    db.select().from(notes).where(eq(notes.ownerId, user.id)).orderBy(desc(notes.noteDate), desc(notes.updatedAt)),
    loadRelationChoices(),
  ]);
  const relationLabels = new Map(relationChoices.map((choice) => [choice.value, choice.label]));

  return <AppShell title="Notlar">
    <section className="page-heading"><div><p className="eyebrow">Ofis içi</p><h1>Notlar ve hatırlatmalar</h1><p>Tarihli notlarınızı ve hatırlatma zamanlarını tek yerde takip edin.</p></div></section>
    {hata ? <div className="login-error" role="alert">{hata}</div> : null}
    <div className="notes-layout">
      <section className="panel note-form-panel">
        <div className="panel-heading"><div><h2>Yeni not</h2><p>Hatırlatma isteğe bağlıdır.</p></div></div>
        <form action={createNote} className="note-form">
          <label>Başlık<input className="field" name="title" maxLength={160} required /></label>
          <label>Not<textarea className="field" name="body" rows={5} maxLength={5000} /></label>
          <label>Not tarihi<input className="field" name="noteDate" type="date" defaultValue={todayInIstanbul()} required /></label>
          <fieldset className="note-reminder"><legend>Hatırlatma</legend><p>İsteğe bağlı. Saat seçmezseniz 09:00 kullanılır.</p><div className="note-reminder-grid">
            <label>Tarih<input className="field note-date-field" name="reminderDate" type="date" /></label>
            <label>Saat<input className="field note-date-field" name="reminderTime" type="time" /></label>
          </div></fieldset>
          <label>İlgili kayıt<select className="field" name="relation" defaultValue=""><option value="">Bağlantı yok</option>{relationChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
          <button className="button primary" type="submit">Notu kaydet</button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Kayıtlı notlar</h2><p>{rows.length} not</p></div></div>
        {rows.length === 0 ? <div className="empty"><strong>Henüz not yok</strong>İlk notunuzu soldaki formdan ekleyebilirsiniz.</div> : <div className="notes-list">
          {rows.map((note) => {
            const relationValue = note.relatedType && note.relatedId ? `${note.relatedType}:${note.relatedId}` : "";
            const reminderInput = reminderInputParts(note.reminderAt);
            return <article className={`note-item${note.completedAt ? " completed" : ""}`} key={note.id}>
              <div className="note-meta"><span>{note.noteDate}</span>{note.reminderAt ? <span>Hatırlatma: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(note.reminderAt)}</span> : null}<span>Kişisel</span>{relationValue && relationLabels.get(relationValue) ? <span>{relationLabels.get(relationValue)}</span> : null}</div>
              <h3>{note.title}</h3>{note.body ? <p>{note.body}</p> : null}
              <div className="note-actions">
                <form action={toggleNote}><input name="id" type="hidden" value={note.id} /><input name="completed" type="hidden" value={String(Boolean(note.completedAt))} /><button className="button secondary" type="submit">{note.completedAt ? "Geri aç" : "Tamamla"}</button></form>
                <form action={deleteNote}><input name="id" type="hidden" value={note.id} /><button className="button danger-button" type="submit">Sil</button></form>
              </div>
              <details className="note-edit"><summary>Düzenle</summary><form action={updateNote} className="note-form compact-form">
                <input name="id" type="hidden" value={note.id} />
                <label>Başlık<input className="field" name="title" maxLength={160} defaultValue={note.title} required /></label>
                <label>Not<textarea className="field" name="body" rows={3} maxLength={5000} defaultValue={note.body} /></label>
                <label>Not tarihi<input className="field" name="noteDate" type="date" defaultValue={note.noteDate} required /></label>
                <fieldset className="note-reminder"><legend>Hatırlatma</legend><p>Boş bırakırsanız mevcut hatırlatma kaldırılır.</p><div className="note-reminder-grid">
                  <label>Tarih<input className="field note-date-field" name="reminderDate" type="date" defaultValue={reminderInput.date} /></label>
                  <label>Saat<input className="field note-date-field" name="reminderTime" type="time" defaultValue={reminderInput.time} /></label>
                </div></fieldset>
                <label>İlgili kayıt<select className="field" name="relation" defaultValue={relationValue}><option value="">Bağlantı yok</option>{relationChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
                <button className="button primary" type="submit">Değişiklikleri kaydet</button>
              </form></details>
            </article>;
          })}
        </div>}
      </section>
    </div>
  </AppShell>;
}
