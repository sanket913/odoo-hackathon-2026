import { useState } from "react";
import { X, Bot, Copy, ThumbsUp, ThumbsDown, RefreshCw, Sparkles } from "lucide-react";
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
}

export function AICopilotDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(prompt: string) {
    const q = prompt.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await aiApi.ask(q);
      setMessages((m) => [...m, { role: "assistant", content: res.answer, sources: res.sources }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Failed to generate response. Please retry." },
      ]);
      void e;
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-background shadow-xl"
        role="dialog"
        aria-label="Operations Copilot"
      >
        <header className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-brand text-brand-foreground">
              <Bot className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Operations Copilot</div>
              <div className="text-xs text-muted-foreground">AI insights for your fleet</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 hover:bg-muted">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">AI insights are advisory.</strong> Operational
                rules and database records remain authoritative. The Copilot cannot dispatch trips,
                change vehicle status, or bypass business rules.
              </div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Suggested prompts
              </div>
              <div className="grid gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="flex items-center gap-2 rounded-md border bg-card p-3 text-left text-sm hover:bg-muted"
                    onClick={() => send(s)}
                  >
                    <Sparkles className="size-4 text-brand" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    m.role === "user" ? "bg-muted/40" : "bg-card",
                  )}
                >
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {m.role === "user" ? "You" : "Copilot"}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.sources && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.sources.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.role === "assistant" && (
                    <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                      <button
                        aria-label="Copy response"
                        className="rounded p-1 hover:bg-muted hover:text-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(m.content);
                          toast.success("Copied");
                        }}
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        aria-label="Retry"
                        className="rounded p-1 hover:bg-muted hover:text-foreground"
                        onClick={() => send(messages[i - 1]?.content ?? "")}
                      >
                        <RefreshCw className="size-3.5" />
                      </button>
                      <button
                        aria-label="Helpful"
                        className="rounded p-1 hover:bg-muted hover:text-foreground"
                      >
                        <ThumbsUp className="size-3.5" />
                      </button>
                      <button
                        aria-label="Not helpful"
                        className="rounded p-1 hover:bg-muted hover:text-foreground"
                      >
                        <ThumbsDown className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
                  Copilot is thinking…
                </div>
              )}
            </div>
          )}
        </div>

        <form
          className="border-t p-3"
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
              placeholder="Ask about fleet, dispatch or cost…"
              className="min-h-[44px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/30"
              aria-label="Ask the copilot"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Ask
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
