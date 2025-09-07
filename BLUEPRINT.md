# Blueprint: One-Page Canvas Image Editing & Generation Tool

## 0. Core vs Non-Core

| Area               | Core (Essential)                                                                                                                  | Non-Core (Optional)                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Background Removal | Use `@imgly/background-removal` (browser-based, ONNX/WASM) to cut out objects locally. Mind **AGPL license** implications.        | Server-side background removal models or custom segmentation tuning. |
| Final Compositing  | Deterministic compositing done directly on canvas, with **Gemini 2.5 Flash (Nano Banana)** used only for final seamless blending. | AI-driven positioning of every object layer (unpredictable).         |
| Prompting          | Descriptive, contextual prompts with positional metadata + guide overlay images.                                                  | Simple keyword prompts only.                                         |
| Licensing          | Secure commercial license for `@imgly` for production.                                                                            | Leaving AGPL licensing issues unresolved.                            |

> **Trust Level Tags**
>
> * Gemini 2.5 Flash image cost: \~\$0.039 per generated image — **Source:** Google Dev Blog (Aug 2025), **Confidence:** High.
> * Best performance with **≤3 images per request** — **Source:** Gemini API Guide, **Confidence:** Medium.
> * Alpha channel support is unstable; handle transparency in the canvas, not in Gemini — **Source:** Forum reports, **Confidence:** Medium/Low.

---

## 1. Goal & Scope

A single-page web tool that allows users to:

1. Upload a **base image**.
2. Add objects by uploading images and automatically removing backgrounds.
3. Manage these as **layers** (position, scale, rotate, opacity).
4. Click **Generate** to:

   * Deterministically flatten the canvas into a composite PNG.
   * Send the composite + guide images to Gemini for seamless blending, lighting, and edge refinement.
   * Return a **final polished PNG**.

Gemini is **NOT** responsible for object positioning — only for visual harmonization.

---

## 2. External Research Summary

* **@imgly/background-removal-js**

  * Browser + Node support, fast, local inference.
  * **License:** AGPL — commercial licensing required for private use.
  * Produces high-quality cutout PNGs with transparency.

* **Gemini 2.5 Flash Image (Nano Banana)**

  * Handles multi-image fusion, local edits, character consistency, and invisible watermarking (SynthID).
  * **Model ID:** `gemini-2.5-flash-image-preview`.
  * Works best with **descriptive, context-rich prompts** and limited images.
  * Alpha channel outputs may be inconsistent — final transparency should be handled on canvas side.

---

## 3. Architecture Overview

| Layer              | Technology                                                    |
| ------------------ | ------------------------------------------------------------- |
| UI                 | React + Konva or Fabric.js for layered canvas editing         |
| Performance        | WebWorker + OffscreenCanvas for smooth performance            |
| Background Removal | `@imgly/background-removal` in WebWorker                      |
| AI Integration     | Serverless Edge Function to proxy Gemini API (hide API keys)  |
| Deployment         | Vercel for hosting and scaling                                |
| Storage            | Local Blob/IndexedDB for images, no external storage required |

### Data Model

```json
{
  "canvas": {"width": 1024, "height": 1024, "bgColor": "#ffffff"},
  "layers": [
    {"id": 1, "type": "base", "src": "blob:url", "x": 0, "y": 0, "scale": 1, "rotation": 0, "z": 0, "opacity": 1},
    {"id": 2, "type": "object", "src": "blob:url", "mask": "blob:url", "x": 100, "y": 200, "scale": 1.2, "rotation": 15, "z": 1, "opacity": 0.9}
  ],
  "history": []
}
```

---

## 4. User Flow

1. **Upload Base Image** → Added as first layer.
2. **Add Object Image** → Runs background removal → Outputs a cutout PNG → Added as object layer.
3. **Edit Object** → Drag, scale, rotate, adjust opacity in canvas.
4. **Generate** → Two steps:

   * **Step A (Deterministic Flattening):**

     * Merge layers pixel-perfectly into a single PNG.
     * Generate a guide overlay image showing object outlines and positions.
   * **Step B (Gemini Finalization):**

     * Send the flattened image + guide overlay to Gemini.
     * Prompt Gemini to ONLY refine edges, lighting, and blending.
     * Return a polished final composite.

---

## 5. Prompt Design

### Input Package to Gemini

* **Contents:** \[Text prompt, Flattened composite, Guide overlay, Optional: raw cutouts]
* **Images per request:** Max 3.
* **Resolution:** 1024×1024 or fixed canvas size.

### Prompt Template Example

```
You are a photo compositor.
Canvas size: 1024×1024.

Task: Blend the provided composite exactly as shown in Image 1.
Use Image 2 as a strict guide for object positions.

Rules:
1. Do not move or resize any elements.
2. Only improve edge blending, lighting, and realism.
3. Preserve all non-object pixels as they are.
4. Return a single PNG, same size, with no cropping.
```

---

## 6. UI/UX Design

* **Left Panel:** Layer list with visibility toggles, lock, and drag for reordering.
* **Center:** Canvas with snap guides, gridlines, and zoom controls.
* **Right Panel:** Object properties (position, rotation, opacity, blend mode).
* **Top Toolbar:**

  * Upload Base
  * Add Object
  * Remove Background
  * Generate Final
  * Export PNG/WebP
* **Shortcuts:**

  * Delete: Remove layer
  * Ctrl+Z/Y: Undo/Redo
  * Ctrl+↑/↓: Change Z-order

---

## 7. Compositing Strategies

| Strategy                                        | Pros                                           | Cons                                       | Recommendation               |
| ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------ | ---------------------------- |
| **A. Deterministic First, AI Last (Preferred)** | Pixel-perfect, reproducible, cheap (1 AI call) | Less creative flexibility                  | **Default**                  |
| **B. Iterative AI Layer Insertion**             | Potentially more natural blending              | Position drift, expensive, less consistent | Optional for special effects |

---

## 8. Transparency Handling

* **All alpha masking is handled by the canvas**, not Gemini.
* Gemini receives images with transparent cutouts **only for context**, never as final alpha layers.
* Final result is a standard PNG merged with proper transparency.

---

## 9. Security & Cost

* **API Proxy:**

  * Vercel Edge Functions handle Gemini API calls.
  * API keys stored securely on server.
  * Rate limiting enabled.

* **Cost Estimate:**

  * \~\$0.039 per final generation (1 call).
  * Retry and variations scale linearly with usage.

---

## 10. Licensing

* **IMG.LY library:**

  * AGPL-3.0 — must obtain commercial license for production.
* **Gemini outputs:**

  * SynthID watermark included by default.
  * Must comply with Google AI usage policies.

---

## 11. Testing Checklist

* Verify object positions remain exact post-generation.
* Test overlapping objects for correct z-order and blending.
* Check lighting consistency and natural edge blending.
* Confirm transparency renders properly across browsers.
* Run repeated generation tests to measure output drift.

---

## 12. Roadmap

1. **MVP (Week 1)**

   * Upload → Remove Background → Layer Editing → Generate → Export.
2. **Polish (Week 2-3)**

   * Snap guides, history stack, keyboard shortcuts.
3. **Pro Features (Later)**

   * Automatic shadow generation.
   * Lighting estimation and matching.
   * Preset prompt library.

---

## 13. Reference Links

* [IMG.LY Background Removal GitHub](https://github.com/imgly/background-removal-js)
* [Gemini 2.5 Flash Docs](https://ai.google.dev/gemini-api/docs)
* [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
* [Konva.js](https://konvajs.org/)
