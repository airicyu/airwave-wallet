/**
 * Types for the vendored bubble-harness browser bundle.
 * Source of truth remains ../bubble-harness/src.
 */

export const PACKAGE_NAME: string;
export const PACKAGE_VERSION: string;
export function getVersion(): string;

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system"; content?: string | null }
  | { role: "user"; content?: string | null }
  | { role: "assistant"; content?: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface AssistantMessage {
  role: "assistant";
  content?: string | null;
  tool_calls?: ToolCall[];
}

export interface ToolMessage {
  role: "tool";
  tool_call_id: string;
  content: string;
}

export interface UserMessage {
  role: "user";
  content?: string | null;
}

export interface JsonSchemaObject {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface HostToolDefinition {
  name: string;
  description?: string;
  parameters: JsonSchemaObject;
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface KVStore {
  get(key: string): Promise<string | null> | string | null;
  set(key: string, value: string): Promise<void> | void;
}

export interface CallModelRequest {
  messages: ChatMessage[];
  tools: unknown[];
  temperature?: number;
  maxTokens?: number;
}

export interface CallModelResult {
  message: AssistantMessage;
  finishReason?: string | null;
}

export type CallModelFn = (req: CallModelRequest) => Promise<CallModelResult>;

export type AgentStopReason = "completed" | "max_steps" | "empty_final";

export type AgentLoopEvent =
  | {
      type: "step";
      step: number;
      maxSteps: number;
      messages: ChatMessage[];
    }
  | {
      type: "assistant";
      step: number;
      message: AssistantMessage;
    }
  | {
      type: "tool";
      step: number;
      toolCall: ToolCall;
      message: ToolMessage;
    }
  | {
      type: "nudge";
      step: number;
      reason: "empty_final";
      message: UserMessage;
    }
  | {
      type: "done";
      steps: number;
      stopReason: AgentStopReason;
      finalText: string;
      messages: ChatMessage[];
    };

export type AgentLoopEventHandler = (event: AgentLoopEvent) => void | Promise<void>;

export interface HarnessOptions {
  kvStore: KVStore;
  hostTools?: HostToolDefinition[];
  callModel: CallModelFn;
  maxSteps?: number;
  toolResultMaxBytes?: number;
  fetchAllowlist?: Array<string | RegExp>;
}

export interface Harness {
  options: HarnessOptions;
  apiTools: unknown[];
  executeTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface RunAgentLoopOptions {
  messages: ChatMessage[];
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
  retryEmptyFinal?: boolean;
  emptyFinalUserMessage?: string;
  onEvent?: AgentLoopEventHandler;
}

export interface RunAgentLoopResult {
  messages: ChatMessage[];
  steps: number;
  stopReason: AgentStopReason;
  finalText: string;
}

export function createHarness(options: HarnessOptions): Harness;
export function extractFinalText(messages: ChatMessage[]): string;
export function runAgentLoop(
  harness: Harness,
  loopOptions: RunAgentLoopOptions,
): Promise<RunAgentLoopResult>;
export function createOpenRouterCallModel(options: {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  referer?: string;
  title?: string;
}): CallModelFn;
export function normalizeOpenRouterMessageContent(raw: {
  content?: unknown;
  reasoning_content?: unknown;
  reasoning?: unknown;
}): string | null;
