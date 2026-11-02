"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

/** Offers "add to home screen": Chrome/Edge fire beforeinstallprompt, iOS Safari only allows the Share menu. */
export function InstallHint() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- platform check needs the browser
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    addEventListener("beforeinstallprompt", onPrompt);
    return () => removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!prompt && !ios) return null;
  return (
    <section className="panel panel-pad stack" aria-labelledby="install-title">
      <h2 id="install-title">Telefona ekleyin</h2>
      {prompt ? (
        <>
          <p>Accountie ana ekranda ayrı bir uygulama gibi açılır, fiş çekmek tek dokunuş olur.</p>
          <div className="actions">
            <button className="btn" type="button" onClick={() => prompt.prompt().then(() => setPrompt(null))}>Ana ekrana ekle</button>
          </div>
        </>
      ) : (
        <p>Safari&apos;de Paylaş düğmesine, ardından Ana Ekrana Ekle&apos;ye dokunun. Accountie ana ekranda ayrı bir uygulama gibi açılır.</p>
      )}
    </section>
  );
}
