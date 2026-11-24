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
      const charset = root.AccountieOcrCharset;
      allowed = new Set((charset?.DEFAULT_ALLOWED || "ABCDEFGHJKLMNPQRSTUVWXYZ23456789").split(""));
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
      floats[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 127.5 - 1;
    }
    return new root.ort.Tensor("float32", floats, [1, 1, height, width]);
  }

  function decodeOutput(tensorData, dims, charset, allowedChars) {
    if (!charset || !dims || dims.length !== 3) return { ok: false, reason: "invalid-output" };
    const T = dims[0], C = dims[2];
    if (C !== charset.length || tensorData.length !== T * C) return { ok: false, reason: "invalid-output" };

    let last = 0;
    const ctc = [];
    for (let t = 0; t < T; t++) {
      const start = t * C;
      let best = 0, max = -Infinity;
      for (let k = 0; k < C; k++) {
        if (tensorData[start + k] > max) { max = tensorData[start + k]; best = k; }
      }
      if (best !== 0 && best !== last) {
        const char = charset[best];
        if (allowedChars.has(char.toUpperCase())) ctc.push(char);
        if (ctc.length >= 5) break;
      }
      last = best;
    }

    const text = ctc.join("");
    if (!/^[a-zA-Z0-9]{5}$/.test(text)) return { ok: false, reason: "invalid-output", text };
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
      return decodeOutput(tensorResult.data, tensorResult.dims, root.AccountieOcrCharset?.CHARSET, allowed);
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
