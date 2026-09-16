"use client";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";

function safeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function MarkdownMessage() {
  return <MarkdownTextPrimitive
    skipHtml
    allowedElements={["p", "a", "strong", "em", "del", "ul", "ol", "li", "blockquote", "code", "pre", "h1", "h2", "h3", "h4", "hr", "br", "table", "thead", "tbody", "tr", "th", "td"]}
    urlTransform={safeSourceUrl}
    className="space-y-3 break-words [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-5 [&_li]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2"
    components={{ a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">{children}</a> : <span>{children}</span> }}
  />;
}
