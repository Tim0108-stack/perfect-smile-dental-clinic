import { useEffect, useRef, useState } from "react";
import { chatWithAi } from "@/services/ai";
import type { AiMessage } from "@/services/ai";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

const EMPTY_STATE_SUGGESTIONS = [
  "Summarize tomorrow's appointments",
  "What's happening today?",
  "Who needs attention?",
  "How many consultations are booked this week?",
  "Show me the upcoming appointments",
];

export function AiAssistant() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: AiMessage = {
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await chatWithAi({ messages: newMessages });

      if (response.type === "configuration_error") {
        setError(response.content);
        setMessages((prev) => prev.slice(0, -1));
      } else if (response.type === "error") {
        setError(response.content);
        setMessages((prev) => prev.slice(0, -1));
      } else {
        const assistantMessage: AiMessage = {
          role: "assistant",
          content: response.content,
        };

        setMessages([...newMessages, assistantMessage]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to get response from AI"
      );

      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
    setError(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-4 sm:px-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Perfect Smile AI
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Clinic operations assistant
            </p>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearConversation}
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-7">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="max-w-sm text-center">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                <SparkIcon />
              </div>

              <h3 className="text-sm font-bold text-slate-950">
                Perfect Smile AI Assistant
              </h3>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Ask me about appointments, patients, reminders, and clinic
                operations. I'll query the clinic database to provide accurate
                information.
              </p>

              <div className="mt-6 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  Try asking:
                </p>

                {EMPTY_STATE_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-3 text-sm leading-6 sm:max-w-md lg:max-w-lg ${
                    message.role === "user"
                      ? "bg-teal-600 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-950"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <AssistantMessage content={message.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:max-w-md lg:max-w-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 animation-delay-100" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 animation-delay-200" />
                    </div>

                    <span className="text-xs text-slate-500">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-semibold text-rose-900">
                  {error}
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 px-6 py-4 sm:px-7">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about appointments, patients, reminders... (Shift+Enter for new line)"
            disabled={loading}
            className="flex-1 resize-none"
            rows={3}
          />

          <Button
            onClick={() => void handleSendMessage()}
            disabled={loading || !input.trim()}
            className="h-full"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);

  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          return <div key={index} className="h-2" />;
        }

        if (/^[-*]\s+/.test(trimmedLine)) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-[1px]">•</span>
              <span>
                {renderInlineMarkdown(
                  trimmedLine.replace(/^[-*]\s+/, "")
                )}
              </span>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(trimmedLine)) {
          const match = trimmedLine.match(/^(\d+)\.\s+(.*)$/);

          if (match) {
            return (
              <div key={index} className="flex gap-2">
                <span className="font-semibold">{match[1]}.</span>
                <span>{renderInlineMarkdown(match[2])}</span>
              </div>
            );
          }
        }

        if (/^#{1,3}\s+/.test(trimmedLine)) {
          const heading = trimmedLine.replace(/^#{1,3}\s+/, "");

          return (
            <div
              key={index}
              className="pt-1 font-bold text-slate-950"
            >
              {renderInlineMarkdown(heading)}
            </div>
          );
        }

        return (
          <div key={index}>
            {renderInlineMarkdown(line)}
          </div>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function SparkIcon() {
  return (
    <svg
      className="h-6 w-6 text-teal-600"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}