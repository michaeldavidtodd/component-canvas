import type { ParsedCssVariable } from "@/lib/cssTokens";
import { parseCssVariables } from "@/lib/cssTokens";

/**
 * Tailwind v4 theme backfill.
 *
 * Tailwind v4 ships its default theme as CSS custom properties inside an
 * `@theme` block. A stylesheet that does `@import "tailwindcss"` references that
 * theme but does not include it, so we fetch it from the CDN and merge it with
 * the uploaded CSS. Uploaded declarations always win.
 */

/** Sentinel for "resolve the newest Tailwind v4 release". */
export const TAILWIND_LATEST = "latest";

const VERSIONS_ENDPOINT = "https://data.jsdelivr.com/v1/packages/npm/tailwindcss";

/** Used when the jsDelivr version list can't be reached. */
export const FALLBACK_TAILWIND_VERSIONS: readonly string[] = [
	"4.1.18",
	"4.1.17",
	"4.1.16",
	"4.1.15",
	"4.1.14",
	"4.1.13",
	"4.1.12",
	"4.1.11",
	"4.1.10",
	"4.1.9",
	"4.1.8",
	"4.1.7",
	"4.1.6",
	"4.1.5",
	"4.1.4",
	"4.1.3",
	"4.1.2",
	"4.1.1",
	"4.1.0",
	"4.0.0",
];

const themeUrl = (version: string): string =>
	version === TAILWIND_LATEST ? "https://cdn.jsdelivr.net/npm/tailwindcss@4/theme.css" : `https://cdn.jsdelivr.net/npm/tailwindcss@${version}/theme.css`;

/** Human-readable label for a picker value. */
export const formatTailwindVersion = (version: string): string => (version === TAILWIND_LATEST ? "Latest v4" : `v${version}`);

const compareVersionsDesc = (a: string, b: string): number => {
	const left = a.split(".").map(Number);
	const right = b.split(".").map(Number);
	for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
		const diff = (right[index] ?? 0) - (left[index] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
};

let versionsPromise: Promise<string[]> | null = null;

/** Fetch the available Tailwind v4 versions from jsDelivr, newest first. */
export const fetchTailwindVersions = (): Promise<string[]> => {
	if (versionsPromise) return versionsPromise;

	versionsPromise = (async () => {
		try {
			const response = await fetch(VERSIONS_ENDPOINT);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = (await response.json()) as { versions?: Array<{ version?: string }> };
			const versions = (data.versions ?? [])
				.map((entry) => entry.version)
				.filter((version): version is string => typeof version === "string" && /^4\.\d+\.\d+/.test(version));
			if (versions.length === 0) throw new Error("No v4 versions found");
			return versions.sort(compareVersionsDesc);
		} catch {
			return [...FALLBACK_TAILWIND_VERSIONS];
		}
	})();

	return versionsPromise;
};

const themeCache = new Map<string, ParsedCssVariable[]>();

/** Fetch and parse Tailwind's default theme for a version. Cached per version. */
export const fetchTailwindTheme = async (version: string): Promise<ParsedCssVariable[]> => {
	const cached = themeCache.get(version);
	if (cached) return cached;

	let response: Response;
	try {
		response = await fetch(themeUrl(version));
	} catch {
		throw new Error("Could not reach the Tailwind CDN. Check your connection and try again.");
	}

	if (!response.ok) {
		throw new Error(`Could not fetch the Tailwind theme (HTTP ${response.status}).`);
	}

	const css = await response.text();
	const parsed = parseCssVariables(css);
	if (parsed.variables.length === 0) {
		throw new Error("The Tailwind theme response didn't contain any tokens.");
	}

	themeCache.set(version, parsed.variables);
	return parsed.variables;
};

export interface TailwindMergeResult {
	variables: ParsedCssVariable[];
	/** Number of tokens added from the fetched theme. */
	backfilled: number;
}

/**
 * Merge the fetched Tailwind theme into the uploaded variables.
 *
 * Uploaded CSS wins: a fetched token is skipped when the upload already declares
 * the same name in any scope, so user overrides always take precedence. Fetched
 * tokens are tagged with `origin: "tailwind"` so the preview can distinguish
 * them. Source order is re-indexed so the merged list stays stable.
 */
export const mergeTailwindTheme = (uploaded: ParsedCssVariable[], fetched: ParsedCssVariable[]): TailwindMergeResult => {
	const uploadedNames = new Set(uploaded.map((variable) => variable.name));
	const seen = new Set<string>();
	const merged: ParsedCssVariable[] = uploaded.map((variable) => ({ ...variable, origin: variable.origin ?? "upload" }));
	let backfilled = 0;

	for (const variable of fetched) {
		if (uploadedNames.has(variable.name)) continue;
		const key = `${variable.scope}::${variable.name}`;
		if (seen.has(key)) continue;
		seen.add(key);
		merged.push({ ...variable, origin: "tailwind" });
		backfilled += 1;
	}

	return {
		variables: merged.map((variable, index) => ({ ...variable, sourceOrder: index })),
		backfilled,
	};
};

/** Cheap pre-parse check so the dialog can flag Tailwind v4 before parsing. */
export const looksLikeTailwindV4 = (css: string): boolean => /@import\s+(?:url\(\s*)?["']?tailwindcss\b|@theme\b|@layer\s+theme\b/i.test(css);