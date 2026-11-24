import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Markdown } from "@/components/Markdown";

describe("Markdown", () => {
	it("renders headings, emphasis, and inline code", () => {
		const html = renderToStaticMarkup(<Markdown>{"## Fixes\n\n**Bold** and `color/brand`"}</Markdown>);
		expect(html).toContain("<h2");
		expect(html).toContain("<strong");
		expect(html).toContain("<code");
	});

	it("renders GFM tables and task lists", () => {
		const html = renderToStaticMarkup(<Markdown>{"| Token | Nodes |\n| --- | --- |\n| a | 1 |\n\n- [x] done"}</Markdown>);
		expect(html).toContain("<table");
		expect(html).toContain('type="checkbox"');
	});

	it("skips raw html so an answer cannot inject markup", () => {
		const html = renderToStaticMarkup(<Markdown>{"<script>alert(1)</script>\n\nsafe"}</Markdown>);
		expect(html).not.toContain("<script");
		expect(html).toContain("safe");
	});

	it("renders images as links rather than loading them", () => {
		const html = renderToStaticMarkup(<Markdown>{"![chart](https://example.com/chart.png)"}</Markdown>);
		expect(html).not.toContain("<img");
		expect(html).toContain("https://example.com/chart.png");
		expect(html).toContain("chart");
	});
});
