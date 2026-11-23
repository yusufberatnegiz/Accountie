import { EXTENSION_IDS } from "./extension-id";

/**
 * Talking to the Chrome extension from the site (externally_connectable lists only accountie.app, so this works there only).
 * Shared by the Kurallar panel ("Eklentiye bağla") and the setup wizard.
 */
type Reply = { ok?: boolean; importing?: boolean };
type Runtime = { sendMessage(id: string, message: unknown, callback: (response?: Reply) => void): void; lastError?: unknown };

export const extensionRuntime = () => (globalThis as { chrome?: { runtime?: Partial<Runtime> } }).chrome?.runtime as Runtime | undefined;

/** One message to one extension id: `answered` when an extension replied at all, `ok` when it accepted the message. */
function send(runtime: Runtime, id: string, message: unknown): Promise<{ answered: boolean; ok: boolean; reply?: Reply }> {
  return new Promise((resolve) => {
    try {
      runtime.sendMessage(id, message, (response) => {
        // No extension behind the id: Chrome sets lastError ("Could not establish connection").
        if (runtime.lastError || response === undefined) return resolve({ answered: false, ok: false });
        resolve({ answered: true, ok: Boolean(response.ok), reply: response });
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

/** Whether the extension's firm import is running; null when no extension answers the question (versions before 0.6.1). */
export async function importRunning(): Promise<boolean | null> {
  const runtime = extensionRuntime();
  if (!runtime?.sendMessage) return null;
  for (const id of EXTENSION_IDS) {
    const { reply } = await send(runtime, id, { type: "accountie-import-status" });
    if (reply?.ok && typeof reply.importing === "boolean") return reply.importing;
  }
  return null;
}

export async function launchGibScan(account: string, until: string): Promise<"started" | "manual" | "unavailable"> {
  const runtime = extensionRuntime();
  if (!runtime?.sendMessage) return "unavailable";
  let installed = false;
  for (const id of EXTENSION_IDS) {
    const { ok, answered } = await send(runtime, id, { type: "accountie-gib-scan", account, until });
    if (ok) return "started";
    installed ||= answered;
  }
  return installed ? "manual" : "unavailable";
}
