/* global chrome */
// Eklenti, Accountie sitesinde seçili temayı (açık, koyu ya da sistem) izler. Site seçimi kendi localStorage'ında ("tema",
// src/lib/theme.ts) tutar; açık bir Accountie sekmesi varsa oradan okunur ve saklanır, yoksa son okunan kullanılır.
// "Sistem" ya da hiç okunmamışsa işletim sisteminin teması geçerlidir (CSS'teki prefers-color-scheme).
(async function () {
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: dark)");
  let choice = (await chrome.storage.local.get("tema").catch(() => ({}))).tema;
  const apply = () => { root.dataset.look = choice === "light" || choice === "dark" ? choice : media.matches ? "dark" : "light"; };
  apply();
  media.addEventListener("change", apply);
  try {
    for (const tab of await chrome.tabs.query({ url: "https://accountie.vercel.app/*" })) {
      const [frame] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => localStorage.getItem("tema") });
      if (!frame) continue;
      choice = frame.result === "light" || frame.result === "dark" ? frame.result : "system";
      await chrome.storage.local.set({ tema: choice });
      apply();
      break;
    }
  } catch { /* Sekme okunamadı: son bilinen seçim kalır. */ }
})();
