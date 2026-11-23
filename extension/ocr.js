(function (root) {
  "use strict";

  let session = null;
  let allowed = null;
  let initPromise = null;

  async function init() {
    if (session) return;
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const ort = root.ort;
      if (!ort) throw new Error("ONNX Runtime yüklenmedi.");
      const modelUrl = root.chrome.runtime.getURL("ocr/common.onnx");
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = root.chrome.runtime.getURL("ocr/");
      session = await ort.InferenceSession.create(modelUrl, { executionProviders: ["wasm"] });
      const { gibCharset } = await root.chrome.storage.local.get("gibCharset");
      const charset = root.AccountieOcrCharset;
      allowed = new Set((gibCharset || charset?.DEFAULT_ALLOWED || "ABCDEFGHJKLMNPQRSTUVWXYZ23456789").split(""));
    })();
    await initPromise;
  }

  async function tensor(bitmap) {
    const height = 64;
    const width = Math.max(64, Math.round(bitmap.width * height / bitmap.height));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const floats = new Float32Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      floats[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    }
    return new root.ort.Tensor("float32", floats, [1, 1, height, width]);
  }

  function decodeOutput(output, charset, allowedChars) {
    if (!charset || !Array.isArray(output)) return { ok: false, reason: "invalid-output" };

    const indices = [];
    if (output.length === 1 && output[0].length) {
      for (const index of output[0]) indices.push(Number(index));
    } else if (output.length) {
      for (const index of output) indices.push(Number(Array.isArray(index) ? index[0] : index));
    }

    const ctc = [];
    let previous = null;
    for (const rawIndex of indices) {
      const index = Math.round(rawIndex);
      if (index === previous) continue;
      previous = index;
      if (index === 0) continue;
      if (index >= 0 && index < charset.length) {
        const char = charset[index];
        if (allowedChars.has(char)) ctc.push(char);
      }
      if (ctc.length >= 5) break;
    }

    const text = ctc.join("");
    if (!/^[A-Z0-9]{5}$/.test(text)) return { ok: false, reason: "invalid-output", text };
    return { ok: true, text, confidence: null, length: text.length };
  }

  async function classify(png) {
    await init();
    const blob = await (await fetch(`data:image/png;base64,${png}`)).blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const input = await tensor(bitmap);
      const feeds = {};
      feeds[session.inputNames[0]] = input;
      const result = await session.run(feeds);
      const tensorResult = result[session.outputNames[0]];
      return decodeOutput(Array.from(tensorResult.data), root.AccountieOcrCharset?.CHARSET, allowed);
    } finally {
      bitmap.close();
    }
  }

  root.chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type !== "ocr") return;
    classify(message.png)
      .then((value) => respond({ ...value }))
      .catch((error) => respond({ ok: false, reason: "model-error", detail: String(error?.message || error).slice(0, 200) }));
    return true;
  });

  root.AccountieOcr = Object.freeze({ decodeOutput });
  init().catch(() => {});
})(globalThis);
