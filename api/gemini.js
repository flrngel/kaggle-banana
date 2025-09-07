export const config = { runtime: 'edge' };

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELS = {
  // Use Gemini 2.0 for TEXT-only steps
  text: process.env.GEMINI_MODEL_TEXT || 'gemini-2.0-flash',
  // Use an IMAGE-generation capable model for final blend (defaults to Nano Banana)
  imageGen:
    process.env.GEMINI_MODEL_IMAGE_GEN ||
    process.env.GEMINI_MODEL_IMAGE ||
    process.env.GEMINI_MODEL_NANOBANANA ||
    'gemini-2.5-flash-image-preview',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response('Missing GEMINI_API_KEY', { status: 500 });
  }

  try {
    const bodyIn = await req.json();

    const toInlineData = (dataUrl) => {
      const [header, b64] = dataUrl.split(',');
      const mime = header.match(/data:(.*?);base64/);
      return {
        mime_type: (mime && mime[1]) || 'image/png',
        data: b64,
      };
    };

    const callGemini = async (model, payload) => {
      const url = `${API_BASE}/${model}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Gemini error: ${text}`);
      }
      return resp.json();
    };

    const extractText = (json) => {
      const parts = json?.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p) => p.text);
      return textPart?.text || '';
    };

    const extractImage = (json) => {
      const parts = json?.candidates?.[0]?.content?.parts || [];
      for (const p of parts) {
        const id = p.inlineData || p.inline_data;
        if (id?.data) {
          const mime = id.mimeType || id.mime_type || 'image/png';
          return `data:${mime};base64,${id.data}`;
        }
      }
      return null;
    };

    // Branch: pipeline (iterative 2-at-a-time: describe -> compose -> blend)
    if (bodyIn?.mode === 'pipeline') {
      const { base, objects = [], userPrompt } = bodyIn;
      if (!base || !Array.isArray(objects)) {
        return new Response('Invalid payload for pipeline', { status: 400 });
      }

      let currentBase = base;
      const stepSize = 2;
      for (let i = 0; i < objects.length; i += stepSize) {
        const chunk = objects.slice(i, i + stepSize);

        // Describe current base + this step's objects (keep prompts short to reduce tokens)
        const describeInputs = [currentBase, ...chunk];
        const describePayloads = describeInputs.map((img, idx) => ({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `Briefly describe item #${idx} in <=20 words: subject, colors, lighting, style.` },
                { inline_data: toInlineData(img) },
              ],
            },
          ],
          generationConfig: { responseModalities: ['TEXT'], temperature: 0 },
        }));
        const descJsons = await Promise.all(describePayloads.map((p) => callGemini(MODELS.text, p)));
        const [baseDesc, ...objDescs] = descJsons.map(extractText);

        // Compose a step prompt prioritizing the new objects but preserving existing composite
        const composePrompt = `You are a compositor. Keep canvas size and all pixels from the current base as-is except where the new objects must blend.
Base (working composite) description: ${baseDesc}
New object descriptions: ${objDescs.map((d, j) => `#${j + 1}: ${d}`).join(' | ')}
Rules:
1) Do not move or resize any content; preserve positions exactly.
2) Only blend edges, lighting, and shadows to make objects fit naturally.
3) Maintain resolution and do not crop.
4) If conflicts arise, prioritize integrating the new objects cleanly while minimally altering the base.
User intent: ${userPrompt || 'N/A'}
Return only the refined composite image.`;

        const parts = [{ text: composePrompt }, { inline_data: toInlineData(currentBase) }, ...chunk.map((o) => ({ inline_data: toInlineData(o) }))];
        const genJson = await callGemini(MODELS.imageGen, {
          contents: [{ role: 'user', parts }],
          generationConfig: { responseModalities: ['IMAGE'], temperature: 0 },
        });
        const img = extractImage(genJson);
        if (!img) {
          // If model failed, return last JSON for debugging
          return new Response(JSON.stringify(genJson, null, 2), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        // Next step uses this as the new base
        currentBase = img;
      }

      return new Response(currentBase, { headers: { 'Content-Type': 'text/plain' } });
    }

    // Default: single image finalize
    const { image, guide, prompt } = bodyIn;
    if (!image || typeof image !== 'string') {
      return new Response('Invalid payload: missing image', { status: 400 });
    }
    const parts = [];
    if (prompt) parts.push({ text: prompt });
    parts.push({ inline_data: toInlineData(image) });
    if (guide && typeof guide === 'string') parts.push({ inline_data: toInlineData(guide) });

    const genJson = await callGemini(MODELS.imageGen, {
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'], temperature: 0 },
    });
    const img = extractImage(genJson);
    if (!img) {
      return new Response(JSON.stringify(genJson, null, 2), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(img, { headers: { 'Content-Type': 'text/plain' } });
  } catch (err) {
    return new Response(`Server error: ${err?.message || 'unknown'}`, { status: 500 });
  }
}
