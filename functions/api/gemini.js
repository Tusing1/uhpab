const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });

const extractGeminiText = (data) => {
  if (data.output_text) return data.output_text;
  if (data.outputText) return data.outputText;

  const stepText = data.steps
    ?.map((step) => {
      if (step.output_text) return step.output_text;
      if (step.outputText) return step.outputText;
      return step.content?.map((part) => part.text).filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  if (stepText) return stepText;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

export async function onRequestPost({ request, env }) {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_AI_API_KEY || "";

  if (!apiKey) {
    return json(
      { error: "Gemini is not configured on the server yet. Add GEMINI_API_KEY in Cloudflare Pages settings." },
      { status: 503 }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const model = typeof payload.model === "string" && payload.model.trim() ? payload.model.trim() : "gemini-3.6-flash";

  if (!prompt) {
    return json({ error: "Prompt is required." }, { status: 400 });
  }

  const response = await fetch(GEMINI_INTERACTIONS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      generation_config: {
        max_output_tokens: 4096,
        thinking_level: "medium",
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json({ error: data.error?.message || "Gemini request failed." }, { status: response.status });
  }

  const text = extractGeminiText(data);
  if (!text) {
    return json({ error: "Gemini returned no text." }, { status: 502 });
  }

  return json({ text });
}

export async function onRequestGet() {
  return json({ ok: true, configured: true });
}
