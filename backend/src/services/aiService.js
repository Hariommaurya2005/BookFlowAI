const DEFAULT_MODEL = 'openai/gpt-oss-20b';

const getApiKey = () => {
  const value = String(process.env.GROQ_API_KEY || '').trim();
  if (!value || /^(your[_ -].*api[_ -]?key(?:[_ -].*)?|replace[_ -].*key|placeholder.*)$/i.test(value)) return '';
  return value;
};
const getModel = () => process.env.GROQ_MODEL || DEFAULT_MODEL;
const isAIConfigured = () => Boolean(getApiKey());

/**
 * Server-side Groq chat-completions client. The API key must remain in backend/.env.
 * Groq exposes an OpenAI-compatible endpoint, so no extra SDK dependency is required.
 */
const generateContent = async ({
  systemInstruction,
  prompt,
  responseSchema,
  schemaName = 'structured_response',
  temperature = 0.2,
  timeoutMs = 18000,
}) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const model = getModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const systemContent = responseSchema
    ? `${systemInstruction}\n\nReturn a JSON object matching the provided response schema. Do not include markdown fences or any text outside the JSON object.`
    : systemInstruction;

  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: prompt },
    ],
    ...(Number.isFinite(temperature) ? { temperature } : {}),
    ...(responseSchema
      ? {
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: schemaName,
              strict: true,
              schema: responseSchema,
            },
          },
        }
      : {}),
  };

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      // Avoid returning provider diagnostics that could accidentally include sensitive request details.
      const providerMessage = typeof payload?.error?.message === 'string'
        ? payload.error.message.slice(0, 300)
        : 'AI provider request failed';
      const err = new Error(`Groq API error (${response.status}): ${providerMessage}`);
      err.code = response.status === 429
        ? 'AI_RATE_LIMIT'
        : [401, 403].includes(response.status)
          ? 'AI_AUTH_ERROR'
          : response.status === 400
            ? 'AI_BAD_REQUEST'
            : 'AI_PROVIDER_ERROR';
      err.status = response.status;
      throw err;
    }

    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      const err = new Error('Groq returned an empty response');
      err.code = 'AI_EMPTY_RESPONSE';
      throw err;
    }
    return text.trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Groq API request timed out');
      timeoutError.code = 'AI_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const generateJson = async (options) => {
  const text = await generateContent({ ...options, responseSchema: options.responseSchema });
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error('Groq returned invalid structured JSON');
    err.code = 'AI_INVALID_JSON';
    throw err;
  }
};

const generateText = async (options) => generateContent(options);

module.exports = { generateJson, generateText, isAIConfigured, getModel };
