import { describe, expect, it } from "vitest";

import { formatTokenValue, isValidTokenValue, toCssColor } from "@/lib/tokenValues";

describe("isValidTokenValue", () => {
	it("rejects empty values", () => {
		expect(isValidTokenValue("", "hex")).toBe(false);
		expect(isValidTokenValue(undefined, "px")).toBe(false);
	});

	it("accepts any non-empty value when no format is given", () => {
		expect(isValidTokenValue("16", undefined)).toBe(true);
	});

	it("validates hex colors", () => {
		expect(isValidTokenValue("#3B82F6", "hex")).toBe(true);
		expect(isValidTokenValue("#fff", "hex")).toBe(true);
		expect(isValidTokenValue("#GGGGGG", "hex")).toBe(false);
	});

	it("validates dimension units numerically", () => {
		expect(isValidTokenValue("16", "px")).toBe(true);
		expect(isValidTokenValue("1.5", "rem")).toBe(true);
		expect(isValidTokenValue("wide", "px")).toBe(false);
	});

	it("accepts a valid rgb color", () => {
		expect(isValidTokenValue("59 130 246", "rgb")).toBe(true);
	});
});

describe("toCssColor", () => {
	it("returns hex values unchanged", () => {
		expect(toCssColor("#3B82F6", "hex")).toBe("#3B82F6");
	});

	it("wraps bare channels in a CSS function", () => {
		expect(toCssColor("59 130 246", "rgb")).toBe("rgb(59 130 246)");
	});

	it("leaves full CSS functions untouched", () => {
		expect(toCssColor("rgb(59 130 246)", "rgb")).toBe("rgb(59 130 246)");
	});

	it("returns null for an invalid hex value", () => {
		expect(toCssColor("not-a-color", "hex")).toBeNull();
	});

	it("returns null when the format is not a color format", () => {
		expect(toCssColor("16", "px")).toBeNull();
	});
});

describe("formatTokenValue", () => {
	it("appends the unit to dimension values", () => {
		expect(formatTokenValue("16", "px")).toBe("16px");
	});

	it("keeps color values in their notation", () => {
		expect(formatTokenValue("#3B82F6", "hex")).toBe("#3B82F6");
	});

	it("returns an empty string for empty values", () => {
		expect(formatTokenValue("", "px")).toBe("");
	});
});
