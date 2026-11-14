import { EXTENSION_IDS } from "./extension-id";

/**
 * Talking to the Chrome extension from the site (externally_connectable lists only accountie.app, so this works there only).
 * Shared by the Kurallar panel ("Eklentiye bağla") and the setup wizard.
 */
type Runtime = { sendMessage(id: string, message: unknown, callback: (response?: { ok?: boolean }) => void): void; lastError?: unknown };

export const extensionRuntime = () => (globalThis as { chrome?: { runtime?: Partial<Runtime> } }).chrome?.runtime as Runtime | undefined;

/** One message to one extension id: `answered` when an extension replied at all, `ok` when it accepted the message. */
function send(runtime: Runtime, id: string, message: unknown): Promise<{ answered: boolean; ok: boolean }> {
  return new Promise((resolve) => {
    try {
      runtime.sendMessage(id, message, (response) => {
        // No extension behind the id: Chrome sets lastError ("Could not establish connection").
        if (runtime.lastError || response === undefined) return resolve({ answered: false, ok: false });
        resolve({ answered: true, ok: Boolean(response.ok) });
      });
    } catch {
      resolve({ answered: false, ok: false });
    }
  });
}

/**
 * Whether the extension is installed: it answers any message from the site (the key it does not recognise with {ok:false}),
 * while a missing one leaves Chrome's lastError. No key is sent.
 */
export async function extensionInstalled(): Promise<boolean> {
  const runtime = extensionRuntime();
  if (!runtime?.sendMessage) return false;
  for (const id of EXTENSION_IDS) if ((await send(runtime, id, { type: "accountie-ping" })).answered) return true;
  return false;
}

/** Hands the key to the first extension (store release, then the repo copy) that takes it. */
export async function offerToken(token: string): Promise<boolean> {
  const runtime = extensionRuntime();
  if (!runtime?.sendMessage) return false;
  for (const id of EXTENSION_IDS) if ((await send(runtime, id, { type: "accountie-token", token })).ok) return true;
  return false;
}
