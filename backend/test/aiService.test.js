const test = require('node:test');
const assert = require('node:assert/strict');
const { generateText, generateJson, isAIConfigured, getModel } = require('../src/services/aiService');

const withEnvironment = async (env, callback) => {
  const keys = ['GROQ_API_KEY', 'GROQ_MODEL'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const previousFetch = global.fetch;
  try {
    keys.forEach((key) => delete process.env[key]);
    Object.assign(process.env, env);
    await callback();
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    global.fetch = previousFetch;
  }
};

const completionResponse = (content, status = 200) => new Response(JSON.stringify({
  choices: [{ message: { role: 'assistant', content } }],
}), { status, headers: { 'content-type': 'application/json' } });

test('AI service reports unconfigured without a Groq server key and avoids network calls', async () => {
  await withEnvironment({}, async () => {
    global.fetch = async () => { throw new Error('fetch should not be called without a key'); };
    assert.equal(isAIConfigured(), false);
    assert.equal(await generateText({ systemInstruction: 'test', prompt: 'hello' }), null);
  });
});

test('AI service treats the documented .env example placeholder as unconfigured', async () => {
  await withEnvironment({ GROQ_API_KEY: 'your_groq_api_key_here' }, async () => {
    global.fetch = async () => { throw new Error('fetch should not be called for a placeholder key'); };
    assert.equal(isAIConfigured(), false);
    assert.equal(await generateText({ systemInstruction: 'test', prompt: 'hello' }), null);
  });
});

test('AI service calls Groq through the backend-only API key and extracts response text', async () => {
  await withEnvironment({ GROQ_API_KEY: 'test-only-key', GROQ_MODEL: 'openai/test-model' }, async () => {
    let requestUrl = '';
    let requestInit;
    global.fetch = async (url, init) => {
      requestUrl = String(url);
      requestInit = init;
      return completionResponse('Hello from Groq test model');
    };
    const result = await generateText({ systemInstruction: 'Be concise', prompt: 'Say hello' });
    assert.equal(result, 'Hello from Groq test model');
    assert.equal(requestUrl, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(requestInit.headers.Authorization, 'Bearer test-only-key');
    const body = JSON.parse(requestInit.body);
    assert.equal(body.model, 'openai/test-model');
    assert.deepEqual(body.messages, [
      { role: 'system', content: 'Be concise' },
      { role: 'user', content: 'Say hello' },
    ]);
    assert.equal(getModel(), 'openai/test-model');
  });
});

test('AI service sends strict JSON schema requests and parses the structured result', async () => {
  await withEnvironment({ GROQ_API_KEY: 'test-only-key' }, async () => {
    let requestInit;
    global.fetch = async (_url, init) => {
      requestInit = init;
      return completionResponse('{"date":"2026-10-28","afterTime":"17:00","preferredTime":null}');
    };
    const schema = {
      type: 'object',
      properties: {
        date: { type: 'string' },
        afterTime: { type: ['string', 'null'] },
        preferredTime: { type: ['string', 'null'] },
      },
      required: ['date', 'afterTime', 'preferredTime'],
      additionalProperties: false,
    };
    const result = await generateJson({
      systemInstruction: 'Parse the appointment request',
      prompt: 'Tomorrow after 5',
      responseSchema: schema,
      schemaName: 'appointment_intent',
    });
    assert.deepEqual(result, { date: '2026-10-28', afterTime: '17:00', preferredTime: null });
    const format = JSON.parse(requestInit.body).response_format;
    assert.equal(format.type, 'json_schema');
    assert.equal(format.json_schema.name, 'appointment_intent');
    assert.equal(format.json_schema.strict, true);
    assert.deepEqual(format.json_schema.schema, schema);
  });
});

test('AI service maps provider rate-limit failures without exposing credentials', async () => {
  await withEnvironment({ GROQ_API_KEY: 'test-only-key' }, async () => {
    global.fetch = async () => new Response(JSON.stringify({ error: { message: 'Rate limit exceeded' } }), {
      status: 429, headers: { 'content-type': 'application/json' },
    });
    await assert.rejects(() => generateText({ systemInstruction: 'test', prompt: 'test' }), (error) => {
      assert.equal(error.code, 'AI_RATE_LIMIT');
      assert.match(error.message, /429/);
      assert.doesNotMatch(error.message, /test-only-key/);
      return true;
    });
  });
});
