/** The Chrome Web Store release (Accountie Luca Doldurucu): the id the store gave it. */
export const STORE_EXTENSION_ID = "ibjlhifpjjkbokfamkckibabonbgdjgj";

/**
 * A copy loaded unpacked from extension/ (the office's install before the store release): its id is fixed by the public
 * "key" in extension/manifest.json, the same on every computer. shortcut: tried after the store id; drop it once every
 * office runs the store release.
 */
export const DEV_EXTENSION_ID = "leffpncjckoidaabeaciahdhbnjihojg";

/** The ids "Eklentiye bağla" offers the key to, in order: the first that answers takes it. */
export const EXTENSION_IDS = [STORE_EXTENSION_ID, DEV_EXTENSION_ID] as const;

export const EXTENSION_STORE_URL = `https://chromewebstore.google.com/detail/accountie-luca-doldurucu/${STORE_EXTENSION_ID}`;
