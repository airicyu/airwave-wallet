// src/tools/schemas.ts
var keyValueGetSchema = {
  type: "object",
  properties: {
    key: { type: "string", description: "Storage key" }
  },
  required: ["key"],
  additionalProperties: false
};
var keyValueSetSchema = {
  type: "object",
  properties: {
    key: { type: "string", description: "Storage key" },
    value: { type: "string", description: "String value to store" }
  },
  required: ["key", "value"],
  additionalProperties: false
};
var fetchSchema = {
  type: "object",
  properties: {
    url: { type: "string", description: "HTTP(S) URL" },
    method: { type: "string", description: "HTTP method, default GET" },
    headers: {
      type: "object",
      description: "Optional request headers",
      additionalProperties: { type: "string" }
    },
    body: { type: "string", description: "Optional request body" }
  },
  required: ["url"],
  additionalProperties: false
};
var SYSTEM_TOOL_NAMES = {
  KV_GET: "kv.get",
  KV_SET: "kv.set",
  MEMORY_GET: "memory.get",
  MEMORY_SET: "memory.set",
  FETCH: "fetch"
};
function buildSystemToolDefinitions() {
  return [
    {
      type: "function",
      function: {
        name: SYSTEM_TOOL_NAMES.KV_GET,
        description: "Read a string value from the host-injected key-value store.",
        parameters: keyValueGetSchema
      }
    },
    {
      type: "function",
      function: {
        name: SYSTEM_TOOL_NAMES.KV_SET,
        description: "Write a string value to the host-injected key-value store.",
        parameters: keyValueSetSchema
      }
    },
    {
      type: "function",
      function: {
        name: SYSTEM_TOOL_NAMES.MEMORY_GET,
        description: "Read a session-scoped in-memory string (not persisted).",
        parameters: keyValueGetSchema
      }
    },
    {
      type: "function",
      function: {
        name: SYSTEM_TOOL_NAMES.MEMORY_SET,
        description: "Write a session-scoped in-memory string (not persisted).",
        parameters: keyValueSetSchema
      }
    },
    {
      type: "function",
      function: {
        name: SYSTEM_TOOL_NAMES.FETCH,
        description: "HTTP(S) fetch with optional host URL allowlist.",
        parameters: fetchSchema
      }
    }
  ];
}

// src/tools/system.ts
function isUrlAllowed(url, allowlist) {
  if (!allowlist || allowlist.length === 0) {
    return true;
  }
  for (const entry of allowlist) {
    if (typeof entry === "string") {
      if (url.startsWith(entry)) {
        return true;
      }
    } else if (entry.test(url)) {
      return true;
    }
  }
  return false;
}
async function defaultFetchImpl(req) {
  const method = req.method ?? "GET";
  const headers = req.headers ?? {};
  const response = await fetch(req.url, {
    method,
    headers,
    body: req.body
  });
  const body = await response.text();
  return { status: response.status, body };
}
async function executeSystemTool(name, args, ctx) {
  switch (name) {
    case SYSTEM_TOOL_NAMES.KV_GET: {
      const key = requireString(args, "key");
      return await ctx.kvStore.get(key);
    }
    case SYSTEM_TOOL_NAMES.KV_SET: {
      const key = requireString(args, "key");
      const value = requireString(args, "value");
      await ctx.kvStore.set(key, value);
      return { ok: true };
    }
    case SYSTEM_TOOL_NAMES.MEMORY_GET: {
      const key = requireString(args, "key");
      return ctx.memory.get(key) ?? null;
    }
    case SYSTEM_TOOL_NAMES.MEMORY_SET: {
      const key = requireString(args, "key");
      const value = requireString(args, "value");
      ctx.memory.set(key, value);
      return { ok: true };
    }
    case SYSTEM_TOOL_NAMES.FETCH: {
      const url = requireString(args, "url");
      if (!isUrlAllowed(url, ctx.fetchAllowlist)) {
        throw new Error(`URL not allowed by fetch allowlist: ${url}`);
      }
      const method = optionalString(args, "method");
      const body = optionalString(args, "body");
      const headers = optionalHeaders(args, "headers");
      return await ctx.fetchImpl({
        url,
        method,
        headers,
        body
      });
    }
    default:
      throw new Error(`Unknown system tool: ${name}`);
  }
}
function requireString(args, field) {
  const value = args[field];
  if (typeof value !== "string") {
    throw new Error(`Expected string "${field}"`);
  }
  return value;
}
function optionalString(args, field) {
  const value = args[field];
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected string "${field}"`);
  }
  return value;
}
function optionalHeaders(args, field) {
  const value = args[field];
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected object "${field}"`);
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== "string") {
      throw new Error(`Header "${k}" must be a string`);
    }
    out[k] = v;
  }
  return out;
}

// src/harness.ts
var RESERVED_NAMES = new Set(Object.values(SYSTEM_TOOL_NAMES));
function createHarness(options) {
  const hostTools = options.hostTools ?? [];
  for (const tool of hostTools) {
    if (RESERVED_NAMES.has(tool.name)) {
      throw new Error(`Host tool name conflicts with system tool: ${tool.name}`);
    }
  }
  const memory = new Map;
  const fetchImpl = options.fetchImpl ?? defaultFetchImpl;
  const systemCtx = {
    kvStore: options.kvStore,
    memory,
    fetchImpl,
    fetchAllowlist: options.fetchAllowlist
  };
  const hostByName = new Map;
  for (const tool of hostTools) {
    if (hostByName.has(tool.name)) {
      throw new Error(`Duplicate host tool name: ${tool.name}`);
    }
    hostByName.set(tool.name, tool);
  }
  const apiTools = [
    ...buildSystemToolDefinitions(),
    ...hostTools.map(hostToolToApi)
  ];
  return {
    options,
    apiTools,
    async executeTool(name, args) {
      if (RESERVED_NAMES.has(name)) {
        return executeSystemTool(name, args, systemCtx);
      }
      const host = hostByName.get(name);
      if (!host) {
        throw new Error(`Unknown tool: ${name}`);
      }
      return host.execute(args);
    }
  };
}
function hostToolToApi(tool) {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  };
}
// src/truncate.ts
var TRUNCATION_SUFFIX = `
...[truncated]`;
function truncateUtf8(text, maxBytes) {
  const suffixBytes = new TextEncoder().encode(TRUNCATION_SUFFIX).length;
  const limit = Math.max(0, maxBytes - suffixBytes);
  const encoder = new TextEncoder;
  const bytes = encoder.encode(text);
  if (bytes.length <= maxBytes) {
    return text;
  }
  let end = limit;
  while (end > 0) {
    const slice = bytes.slice(0, end);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(slice) + TRUNCATION_SUFFIX;
    } catch {
      end -= 1;
    }
  }
  return TRUNCATION_SUFFIX.trimStart();
}
function stringifyToolResult(value) {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

// src/loop.ts
async function runAgentLoop(harness, loopOptions) {
  const maxSteps = harness.options.maxSteps ?? 8;
  const toolResultMaxBytes = harness.options.toolResultMaxBytes ?? 8192;
  const onEvent = loopOptions.onEvent;
  const retryEmptyFinal = loopOptions.retryEmptyFinal === true;
  const messages = [...loopOptions.messages];
  if (loopOptions.systemMessage) {
    messages.unshift({ role: "system", content: loopOptions.systemMessage });
  }
  let steps = 0;
  let stopReason = "max_steps";
  let emptyFinalRetried = false;
  while (steps < maxSteps) {
    steps += 1;
    await emit(onEvent, {
      type: "step",
      step: steps,
      maxSteps,
      messages: [...messages]
    });
    const { message } = await harness.options.callModel({
      messages,
      tools: harness.apiTools,
      temperature: loopOptions.temperature,
      maxTokens: loopOptions.maxTokens
    });
    const assistantMessage = {
      role: "assistant",
      content: message.content ?? null,
      ...message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}
    };
    messages.push(assistantMessage);
    await emit(onEvent, {
      type: "assistant",
      step: steps,
      message: assistantMessage
    });
    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      if (!isBlankContent(assistantMessage.content)) {
        stopReason = "completed";
        break;
      }
      if (retryEmptyFinal && !emptyFinalRetried) {
        emptyFinalRetried = true;
        const nudgeText = loopOptions.emptyFinalUserMessage?.trim();
        if (nudgeText) {
          const nudgeMessage = { role: "user", content: nudgeText };
          messages.push(nudgeMessage);
          await emit(onEvent, {
            type: "nudge",
            step: steps,
            reason: "empty_final",
            message: nudgeMessage
          });
        }
        continue;
      }
      stopReason = "empty_final";
      break;
    }
    for (const toolCall of toolCalls) {
      const toolMessage = await runSingleToolCall(harness, toolCall, toolResultMaxBytes);
      messages.push(toolMessage);
      await emit(onEvent, {
        type: "tool",
        step: steps,
        toolCall,
        message: toolMessage
      });
    }
  }
  const finalText = extractFinalText(messages);
  const result = { messages, steps, stopReason, finalText };
  await emit(onEvent, {
    type: "done",
    steps,
    stopReason,
    finalText,
    messages: [...messages]
  });
  return result;
}
function extractFinalText(messages) {
  for (let i = messages.length - 1;i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role !== "assistant") {
      continue;
    }
    if (message.tool_calls?.length) {
      continue;
    }
    return (message.content ?? "").trim();
  }
  return "";
}
function isBlankContent(content) {
  return (content ?? "").trim().length === 0;
}
async function emit(onEvent, event) {
  if (!onEvent) {
    return;
  }
  await onEvent(event);
}
async function runSingleToolCall(harness, toolCall, toolResultMaxBytes) {
  const name = toolCall.function.name;
  let content;
  try {
    const args = parseToolArguments(toolCall.function.arguments);
    const result = await harness.executeTool(name, args);
    content = truncateUtf8(stringifyToolResult(result), toolResultMaxBytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    content = truncateUtf8(JSON.stringify({ ok: false, error: message }), toolResultMaxBytes);
  }
  return {
    role: "tool",
    tool_call_id: toolCall.id,
    content
  };
}
function parseToolArguments(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Arguments must be a JSON object");
    }
    return parsed;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON arguments: ${detail}`);
  }
}
// src/openrouter.ts
function normalizeOpenRouterMessageContent(raw) {
  const fromContent = coerceVisibleText(raw.content);
  if (fromContent !== null) {
    return fromContent;
  }
  return coerceVisibleText(raw.reasoning_content) ?? coerceVisibleText(raw.reasoning);
}
function coerceVisibleText(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const parts = [];
  for (const part of value) {
    if (typeof part === "string") {
      parts.push(part);
      continue;
    }
    if (typeof part !== "object" || part === null) {
      continue;
    }
    const obj = part;
    if (typeof obj.text === "string") {
      parts.push(obj.text);
    } else if (typeof obj.content === "string") {
      parts.push(obj.content);
    }
  }
  const joined = parts.join("").trim();
  return joined.length > 0 ? joined : null;
}
function createOpenRouterCallModel(options) {
  const baseUrl = (options.baseUrl ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const fetchFn = options.fetchImpl ?? fetch;
  const apiKey = options.apiKey;
  return async (req) => {
    const body = {
      model: options.model,
      messages: req.messages,
      tools: req.tools,
      temperature: req.temperature,
      max_tokens: req.maxTokens
    };
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };
    if (options.referer) {
      headers["HTTP-Referer"] = options.referer;
    }
    if (options.title) {
      headers["X-Title"] = options.title;
    }
    const response = await fetchFn(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data.error?.message ?? `OpenRouter HTTP ${response.status}`;
      throw new Error(msg);
    }
    const choice = data.choices?.[0];
    if (!choice?.message) {
      throw new Error("OpenRouter response missing message");
    }
    const raw = choice.message;
    const tool_calls = raw.tool_calls?.map((tc) => ({
      id: tc.id,
      type: "function",
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments
      }
    }));
    const message = {
      role: "assistant",
      content: normalizeOpenRouterMessageContent(raw),
      ...tool_calls?.length ? { tool_calls } : {}
    };
    return {
      message,
      finishReason: choice.finish_reason ?? null
    };
  };
}
// src/sandbox.ts
var REQUEST_KIND = "bubble-harness.sandbox";
var RESULT_KIND = "bubble-harness.sandbox.result";
var CLOSE_KIND = "bubble-harness.sandbox.close";
function createInProcessSandboxPorts() {
  const hostListeners = new Set;
  const guestListeners = new Set;
  return {
    guest: {
      postMessage(data) {
        for (const listener of [...hostListeners]) {
          listener(data);
        }
      },
      onMessage(handler) {
        guestListeners.add(handler);
        return () => {
          guestListeners.delete(handler);
        };
      }
    },
    host: {
      postMessage(data) {
        for (const listener of [...guestListeners]) {
          listener(data);
        }
      },
      onMessage(handler) {
        hostListeners.add(handler);
        return () => {
          hostListeners.delete(handler);
        };
      }
    }
  };
}
function createSandboxGuest(port, options = {}) {
  const pending = new Map;
  let nextId = 0;
  let closed = false;
  const unsubscribe = port.onMessage((data) => {
    const message = decodeMessage(data);
    if (!message) {
      return;
    }
    if (message.kind === CLOSE_KIND) {
      closed = true;
      rejectPending(pending, new Error("Sandbox port closed"));
      unsubscribe();
      return;
    }
    if (message.kind !== RESULT_KIND || typeof message.id !== "string") {
      return;
    }
    const waiter = pending.get(message.id);
    if (!waiter) {
      return;
    }
    pending.delete(message.id);
    if (message.ok === true) {
      if (!Object.prototype.hasOwnProperty.call(message, "result")) {
        waiter.reject(new Error("Sandbox request failed"));
        return;
      }
      waiter.resolve(message.result);
      return;
    }
    const error = typeof message.error === "string" ? message.error : "Sandbox request failed";
    waiter.reject(new Error(error));
  });
  async function request(op, payload) {
    if (closed) {
      throw new Error("Sandbox port closed");
    }
    const id = String(++nextId);
    const promise = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
    port.postMessage({ kind: REQUEST_KIND, id, op, payload });
    return promise;
  }
  const kvStore = {
    async get(key) {
      const result = await request("kv.get", { key });
      if (result === null) {
        return null;
      }
      if (typeof result !== "string") {
        throw new Error("Sandbox request failed");
      }
      return result;
    },
    async set(key, value) {
      await request("kv.set", { key, value });
    }
  };
  const fetchImpl = async (req) => {
    const result = await request("fetch", req);
    if (typeof result !== "object" || result === null || typeof result.status !== "number" || typeof result.body !== "string") {
      throw new Error("Sandbox request failed");
    }
    return result;
  };
  const callModel = async (req) => {
    const result = await request("callModel", req);
    if (typeof result !== "object" || result === null || typeof result.message !== "object" || result.message === null) {
      throw new Error("Sandbox request failed");
    }
    return result;
  };
  const hostTools = (options.hostToolSchemas ?? []).map((schema) => ({
    name: schema.name,
    description: schema.description,
    parameters: schema.parameters,
    execute: (args) => request("hostTool", { name: schema.name, args })
  }));
  try {
    return createHarness({
      kvStore,
      callModel,
      fetchImpl,
      fetchAllowlist: options.fetchAllowlist,
      hostTools,
      maxSteps: options.maxSteps,
      toolResultMaxBytes: options.toolResultMaxBytes
    });
  } catch (err) {
    unsubscribe();
    rejectPending(pending, new Error("Sandbox port closed"));
    throw err;
  }
}
function createSandboxHost(port, handlers) {
  const fetchImpl = handlers.fetchImpl ?? defaultFetchImpl;
  const hostByName = new Map;
  for (const tool of handlers.hostTools ?? []) {
    if (hostByName.has(tool.name)) {
      throw new Error(`Duplicate host tool name: ${tool.name}`);
    }
    hostByName.set(tool.name, tool);
  }
  let closed = false;
  const unsubscribe = port.onMessage((data) => {
    if (closed) {
      return;
    }
    const message = decodeMessage(data);
    if (!message || message.kind !== REQUEST_KIND) {
      return;
    }
    if (typeof message.id !== "string" || typeof message.op !== "string") {
      return;
    }
    handleRequest(port, fetchImpl, hostByName, handlers, message.id, message.op, message.payload);
  });
  return {
    close() {
      if (closed) {
        return;
      }
      closed = true;
      port.postMessage({ kind: CLOSE_KIND });
      unsubscribe();
    }
  };
}
async function handleRequest(port, fetchImpl, hostByName, handlers, id, op, payload) {
  try {
    const result = jsonClone(await dispatch(fetchImpl, hostByName, handlers, op, payload));
    const response = {
      kind: RESULT_KIND,
      id,
      ok: true,
      result
    };
    try {
      JSON.stringify(response);
    } catch {
      port.postMessage({
        kind: RESULT_KIND,
        id,
        ok: false,
        error: "Result is not JSON-serializable"
      });
      return;
    }
    port.postMessage(response);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    port.postMessage({
      kind: RESULT_KIND,
      id,
      ok: false,
      error
    });
  }
}
async function dispatch(fetchImpl, hostByName, handlers, op, payload) {
  const body = asRecord(payload);
  switch (op) {
    case "kv.get":
      return handlers.kvStore.get(requireString2(body, "key"));
    case "kv.set":
      await handlers.kvStore.set(requireString2(body, "key"), requireString2(body, "value"));
      return { ok: true };
    case "fetch":
      return fetchImpl({
        url: requireString2(body, "url"),
        method: optionalString2(body, "method"),
        headers: optionalHeaders2(body, "headers"),
        body: optionalString2(body, "body")
      });
    case "callModel":
      return handlers.callModel(body);
    case "hostTool": {
      const name = requireString2(body, "name");
      const tool = hostByName.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }
      const args = body.args;
      if (typeof args !== "object" || args === null || Array.isArray(args)) {
        throw new Error("Host tool args must be a JSON object");
      }
      return tool.execute(args);
    }
    default:
      throw new Error(`Unknown sandbox op: ${op}`);
  }
}
function jsonClone(value) {
  try {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new Error("Result is not JSON-serializable");
    }
    const cloned = JSON.parse(encoded);
    if (!sameJsonShape(value, cloned)) {
      throw new Error("Result is not JSON-serializable");
    }
    return cloned;
  } catch (err) {
    if (err instanceof Error && err.message === "Result is not JSON-serializable") {
      throw err;
    }
    throw new Error("Result is not JSON-serializable");
  }
}
function sameJsonShape(value, cloned) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    return false;
  }
  if (value === null || typeof value !== "object") {
    return value === cloned;
  }
  if (Array.isArray(value)) {
    if (!Array.isArray(cloned) || value.length !== cloned.length) {
      return false;
    }
    return value.every((item, index) => sameJsonShape(item, cloned[index]));
  }
  if (typeof cloned !== "object" || cloned === null || Array.isArray(cloned)) {
    return false;
  }
  const originalKeys = Object.keys(value);
  const clonedKeys = Object.keys(cloned);
  if (originalKeys.length !== clonedKeys.length) {
    return false;
  }
  return originalKeys.every((key) => sameJsonShape(value[key], cloned[key]));
}
function decodeMessage(data) {
  try {
    const cloned = JSON.parse(JSON.stringify(data));
    if (typeof cloned !== "object" || cloned === null || Array.isArray(cloned)) {
      return null;
    }
    return cloned;
  } catch {
    return null;
  }
}
function rejectPending(pending, error) {
  for (const waiter of pending.values()) {
    waiter.reject(error);
  }
  pending.clear();
}
function asRecord(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("Sandbox payload must be a JSON object");
  }
  return payload;
}
function requireString2(body, key) {
  const value = body[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string field: ${key}`);
  }
  return value;
}
function optionalString2(body, key) {
  const value = body[key];
  if (value === undefined) {
    return;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected string field: ${key}`);
  }
  return value;
}
function optionalHeaders2(body, key) {
  const value = body[key];
  if (value === undefined) {
    return;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Expected headers object: ${key}`);
  }
  const headers = {};
  for (const [header, headerValue] of Object.entries(value)) {
    if (typeof headerValue !== "string") {
      throw new Error(`Expected string header: ${header}`);
    }
    headers[header] = headerValue;
  }
  return headers;
}

// src/index.ts
var PACKAGE_NAME = "bubble-harness";
var PACKAGE_VERSION = "0.2.1";
function getVersion() {
  return PACKAGE_VERSION;
}
export {
  runAgentLoop,
  normalizeOpenRouterMessageContent,
  isUrlAllowed,
  getVersion,
  extractFinalText,
  createSandboxHost,
  createSandboxGuest,
  createOpenRouterCallModel,
  createInProcessSandboxPorts,
  createHarness,
  buildSystemToolDefinitions,
  SYSTEM_TOOL_NAMES,
  PACKAGE_VERSION,
  PACKAGE_NAME
};
