import { useState } from "react";
import {
  Bot,
  Copy,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { aiApi } from "@/lib/api/services";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SUGGESTED = [
  "Summarise current fleet status",
  "Which drivers have compliance risks?",
  "Explain why my dispatch is blocked",
  "Which vehicles have the highest operational cost?",
];

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  createdAt: string;
}

export function AICopilotDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(prompt: string) {
    const q = prompt.trim();
    if (!q || loading) return;
    const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: q, createdAt: new Date().toISOString() }]);
    setInput("");
    setLoading(true);
    try {
      const res = await aiApi.ask(q, history);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Failed to generate response. Please retry.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-[#efeae2] shadow-xl"
        role="dialog"
        aria-label="Operations Copilot"
      >
        <header className="flex items-center justify-between bg-[#075e54] p-4 text-white">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-white/15">
              <Bot className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Operations Copilot</div>
              <div className="text-xs text-white/75">online · Groq powered</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#efeae2,#e6ddd1)] p-4">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-white/85 p-3 text-xs text-slate-600 shadow-sm">
                <strong className="text-slate-900">AI insights are advisory.</strong> Operational
                rules and database records remain authoritative. The Copilot cannot dispatch trips,
                change vehicle status, or bypass business rules.
              </div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Suggested prompts
              </div>
              <div className="grid gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="flex items-center gap-2 rounded-xl bg-white/90 p-3 text-left text-sm shadow-sm hover:bg-white"
                    onClick={() => send(s)}
                  >
                    <Sparkles className="size-4 text-[#128c7e]" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={`${m.createdAt}-${i}`}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[82%] rounded-xl px-3 py-2 text-sm shadow-sm",
                      m.role === "user"
                        ? "rounded-tr-sm bg-[#dcf8c6] text-slate-900"
                        : "rounded-tl-sm bg-white text-slate-900",
                    )}
                  >
                    <ChatMessageContent content={m.content} />
                    {m.sources && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.sources.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-[#e7f3ef] px-2 py-0.5 text-[10px] text-[#075e54]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 text-right text-[10px] text-slate-500">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {m.role === "assistant" && (
                      <div className="mt-1 flex items-center gap-1 text-slate-500">
                        <button
                          aria-label="Copy response"
                          className="rounded p-1 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            toast.success("Copied");
                          }}
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          aria-label="Retry"
                          className="rounded p-1 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => send(messages[i - 1]?.content ?? "")}
                        >
                          <RefreshCw className="size-3.5" />
                        </button>
                        <button aria-label="Helpful" className="rounded p-1 hover:bg-slate-100">
                          <ThumbsUp className="size-3.5" />
                        </button>
                        <button aria-label="Not helpful" className="rounded p-1 hover:bg-slate-100">
                          <ThumbsDown className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
                    Copilot is typing...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form
          className="border-t bg-[#f0f2f5] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              placeholder="Message Copilot"
              className="min-h-[44px] flex-1 resize-none rounded-2xl border-0 bg-white px-4 py-2 text-sm shadow-sm focus:outline-hidden focus:ring-2 focus:ring-[#128c7e]/30"
              aria-label="Ask the copilot"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid size-11 place-items-center rounded-full bg-[#128c7e] text-white shadow-sm disabled:opacity-50"
              aria-label="Send message"
            >
              <SendHorizontal className="size-5" />
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function ChatMessageContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  return (
    <div className="space-y-1 leading-relaxed">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-2" />;

        const heading = trimmed.match(/^\*\*(.+?)\*\*:?\s*$/);
        if (heading) {
          return (
            <div key={index} className="pt-2 font-semibold">
              {heading[1]}
            </div>
          );
        }

        const bullet = trimmed.match(/^[-*]\s+(.+)$/);
        if (bullet) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-0.5 text-slate-500">•</span>
              <span>{renderInlineMarkdown(bullet[1])}</span>
            </div>
          );
        }

        return <p key={index}>{renderInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
