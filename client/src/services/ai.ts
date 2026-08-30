/**
 * AI Chat Service
 * Client-side service for communicating with the Perfect Smile AI agent
 */

import { supabase } from "@/lib/supabaseClient";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatRequest {
  messages: AiMessage[];
}

export interface AiChatResponse {
  type: "text" | "error" | "configuration_error";
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export async function chatWithAi(
  request: AiChatRequest
): Promise<AiChatResponse> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`AI service error: ${response.statusText}`);
  }

  return response.json();
}
