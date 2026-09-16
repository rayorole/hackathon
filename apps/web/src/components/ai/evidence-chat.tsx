"use client";

import { useMemo, useState } from "react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { AssistantRuntimeProvider, ThreadPrimitive, MessagePrimitive, ComposerPrimitive, ActionBarPrimitive } from "@assistant-ui/react";
import { ArrowUp, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiNl as t } from "@/lib/nl";
import { createAssistantTransport } from "@/lib/assistant-transport";
import { MarkdownMessage } from "./markdown-message";

function UserMessage() {
  return <MessagePrimitive.Root className="ml-8 rounded-xl bg-muted p-3 text-sm">
    <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t.you}</span>
    <div className="whitespace-pre-wrap break-words"><MessagePrimitive.Parts /></div>
  </MessagePrimitive.Root>;
}

function AssistantMessage() {
  return <MessagePrimitive.Root className="space-y-2 py-2 text-sm leading-relaxed">
    <span className="block text-xs font-semibold text-primary">{t.assistant}</span>
    <MessagePrimitive.Parts components={{ Text: MarkdownMessage }} />
    <ActionBarPrimitive.Root>
      <ActionBarPrimitive.Reload asChild><Button variant="ghost" size="xs"><RotateCcw />{t.regenerate}</Button></ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  </MessagePrimitive.Root>;
}

export function EvidenceChat({ nr, runId }: { nr: string; runId: string }) {
  const [failed, setFailed] = useState(false);
  const transport = useMemo(() => createAssistantTransport(nr, runId), [nr, runId]);
  const runtime = useChatRuntime({ transport, onError: () => setFailed(true), onFinish: () => setFailed(false) });
  return <AssistantRuntimeProvider runtime={runtime}>
    <ThreadPrimitive.Root className="space-y-3 border-t pt-5" aria-label={t.chat}>
      <div><h3 className="font-semibold">{t.chat}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.chatNote}</p></div>
      <ThreadPrimitive.Empty>
        <div className="flex flex-wrap gap-2">{t.questions.map(question => <Button key={question} variant="outline" size="sm" className="h-auto whitespace-normal py-2 text-left text-xs" onClick={() => { setFailed(false); runtime.thread.append(question); }}>{question}</Button>)}</div>
      </ThreadPrimitive.Empty>
      <ThreadPrimitive.Viewport className="max-h-96 space-y-4 overflow-y-auto" autoScroll>
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
      </ThreadPrimitive.Viewport>
      <ThreadPrimitive.If running><p role="status" className="text-xs text-muted-foreground">{t.answering}</p></ThreadPrimitive.If>
      {failed && <p role="alert" className="text-xs text-destructive">{t.chatFailed}</p>}
      <ComposerPrimitive.Root className="flex items-end gap-2 rounded-xl border bg-card p-2" onSubmitCapture={() => setFailed(false)}>
        <ComposerPrimitive.Input render={<Textarea />} maxLength={6000} aria-label={t.placeholder} placeholder={t.placeholder} className="min-h-16 bg-transparent" />
        <ThreadPrimitive.If running={false}><ComposerPrimitive.Send asChild><Button size="icon" aria-label={t.send}><ArrowUp /></Button></ComposerPrimitive.Send></ThreadPrimitive.If>
        <ThreadPrimitive.If running><ComposerPrimitive.Cancel asChild><Button variant="outline" size="icon" aria-label={t.stop}><Square /></Button></ComposerPrimitive.Cancel></ThreadPrimitive.If>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  </AssistantRuntimeProvider>;
}
