/* eslint-env worker */
/* eslint-disable no-restricted-globals */
/* global importScripts */
importScripts('/browser.js');

const imageDataToBlob = async (imageData) => {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return await canvas.convertToBlob({ type: 'image/png' });
};

const ensureBlob = async (input) => {
  if (input instanceof Blob) return input;
  if (input && input.data && input.width && input.height) {
    return imageDataToBlob(input);
  }
  if (typeof input === 'string' && input.startsWith('data:')) {
    const res = await fetch(input);
    return await res.blob();
  }
  throw new Error('Unsupported image input');
};

self.onmessage = async (event) => {
  const { image } = event.data;
  // Try calling with raw payload first (may be ImageData), then Blob fallback
  try {
    const mod = self.backgroundRemoval || {};
    const candidates = [
      self.removeBackground,
      mod.removeBackground,
      mod.default && mod.default.removeBackground,
      mod.default,
      mod,
    ];
    const fn = candidates.find((c) => typeof c === 'function');
    if (!fn) throw new Error('removeBackground function not found');
    try {
      const out1 = await fn(image);
      if (out1) return self.postMessage({ blob: out1 });
    } catch (_) {
      // fallthrough to blob path
    }
    const blobIn = await ensureBlob(image);
    const out2 = await fn(blobIn);
    self.postMessage({ blob: out2 || blobIn });
  } catch (e) {
    const blob = await ensureBlob(image);
    self.postMessage({ blob });
  }
};
