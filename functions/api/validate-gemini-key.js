const GOOGLE_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1";
const LEGACY_GEMINI_API_KEY_PATTERN = /^AIza[A-Za-z0-9_-]{35}$/;
const AUTHORIZATION_GEMINI_API_KEY_PATTERN = /^AQ\.[A-Za-z0-9._-]{20,509}$/;

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {}),
    },
  });

export async function onRequestPost({ request }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ valid: false, error: "Invalid key check request." }, { status: 400 });
  }

  const apiKey = typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";
  if (!LEGACY_GEMINI_API_KEY_PATTERN.test(apiKey) && !AUTHORIZATION_GEMINI_API_KEY_PATTERN.test(apiKey)) {
    return json(
      { valid: false, error: "Use a current Google AI Studio key beginning with AQ. or a 39-character legacy key beginning with AIza." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(GOOGLE_MODELS_URL, {
      method: "GET",
      headers: { "x-goog-api-key": apiKey },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const upstreamMessage = data?.error?.message;
      return json(
        {
          valid: false,
          error:
            response.status === 400 || response.status === 401 || response.status === 403
              ? "Google did not accept this key. Copy it again from Google AI Studio and check its API restrictions."
              : upstreamMessage || "The key could not be verified right now. Please try again.",
        },
        { status: response.status >= 500 ? 502 : 400 }
      );
    }

    return json({ valid: true });
  } catch {
    return json(
      { valid: false, error: "The key could not be verified right now. Check your internet connection and try again." },
      { status: 502 }
    );
  }
}
