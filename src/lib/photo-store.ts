// Receipt photos live only in this browser tab's memory; the server never stores them.
const photos = new Map<string, string>();

export const setPhoto = (receiptId: string, blob: Blob) => photos.set(receiptId, URL.createObjectURL(blob));
export const getPhoto = (receiptId: string) => photos.get(receiptId);
