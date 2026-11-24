/**
 * Markdown for advisor answers.
 *
 * The model answers in markdown, so the thread renders it rather than showing the
 * syntax. Styles are written out per element instead of using a prose plugin: the
 * answer sits inside a chat bubble and has to read at the same scale as the rest
 * of the thread.
 *
 * Raw HTML is skipped and images render as links, so an answer cannot pull a
 * remote asset into the webview (which would leak the reader's address to a host
 * the model picked). Links open in the system browser for the same reason: a
 * navigation inside the app would replace the canvas.
 */
import { memo, type MouseEvent } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";

const openLink = (event: MouseEvent<HTMLAnchorElement>, href?: string) => {
	if (!href) return;
	event.preventDefault();
	void openExternal(href);
};

const linkClassName = "font-medium underline underline-offset-2 hover:text-primary";

const components: Components = {
	p: ({ children }) => <p className="mt-3 text-pretty first:mt-0">{children}</p>,
	h1: ({ children }) => (
		<h1 className="mt-5 font-display text-base font-semibold first:mt-0">{children}</h1>
	),
	h2: ({ children }) => (
		<h2 className="mt-5 font-display text-sm font-semibold first:mt-0">{children}</h2>
	),
	h3: ({ children }) => <h3 className="mt-4 text-sm font-semibold first:mt-0">{children}</h3>,
	h4: ({ children }) => <h4 className="mt-3 text-sm font-semibold first:mt-0">{children}</h4>,
	h5: ({ children }) => <h5 className="mt-3 text-sm font-semibold first:mt-0">{children}</h5>,
	h6: ({ children }) => (
		<h6 className="mt-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase first:mt-0">
			{children}
		</h6>
	),
	ul: ({ children }) => (
		<ul className="mt-3 list-disc space-y-1 ps-5 first:mt-0 marker:text-muted-foreground">{children}</ul>
	),
	ol: ({ children }) => (
		<ol className="mt-3 list-decimal space-y-1 ps-5 first:mt-0 marker:text-muted-foreground">{children}</ol>
	),
	li: ({ children }) => <li className="leading-relaxed [&>ol]:mt-1 [&>ul]:mt-1">{children}</li>,
	a: ({ href, children }) => (
		<a href={href} onClick={(event) => openLink(event, href)} className={linkClassName}>
			{children}
		</a>
	),
	strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
	em: ({ children }) => <em className="italic">{children}</em>,
	del: ({ children }) => <del className="text-muted-foreground line-through">{children}</del>,
	code: ({ children }) => (
		<code className="rounded-md bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>
	),
	pre: ({ children }) => (
		<pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 first:mt-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-xs">
			{children}
		</pre>
	),
	blockquote: ({ children }) => (
		<blockquote className="mt-3 border-s-2 border-border ps-3 text-muted-foreground first:mt-0">
			{children}
		</blockquote>
	),
	hr: () => <hr className="my-4 border-border" />,
	table: ({ children }) => (
		<div className="mt-3 overflow-x-auto first:mt-0">
			<table className="w-full border-collapse text-xs">{children}</table>
		</div>
	),
	th: ({ children }) => (
		<th className="border-b border-border px-2 py-1.5 text-start font-medium text-foreground">{children}</th>
	),
	td: ({ children }) => <td className="border-b border-border/60 px-2 py-1.5 align-top">{children}</td>,
	// Task lists: the model can emit `- [ ]` items; the checkbox is read-only.
	input: ({ type, checked }) =>
		type === "checkbox" ? <input type="checkbox" checked={checked} disabled className="me-1.5 align-middle" /> : null,
	img: ({ src, alt }) =>
		typeof src === "string" ? (
			<a href={src} onClick={(event) => openLink(event, src)} className={linkClassName}>
				{alt || src}
			</a>
		) : null,
};

/**
 * Render one markdown document. `streaming` adds a caret after the last block so
 * a growing answer reads as in progress.
 */
export const Markdown = memo(function Markdown({
	children,
	className,
	streaming = false,
}: {
	children: string;
	className?: string;
	streaming?: boolean;
}) {
	return (
		<div
			className={cn(
				"text-sm leading-relaxed [&_li>p]:mt-0",
				streaming &&
					"[&>*:last-child]:after:ms-0.5 [&>*:last-child]:after:inline-block [&>*:last-child]:after:h-4 [&>*:last-child]:after:w-0.5 [&>*:last-child]:after:animate-pulse [&>*:last-child]:after:rounded-full [&>*:last-child]:after:bg-foreground/50 [&>*:last-child]:after:align-text-bottom [&>*:last-child]:after:content-['']",
				className,
			)}
		>
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
				{children}
			</ReactMarkdown>
		</div>
	);
});
