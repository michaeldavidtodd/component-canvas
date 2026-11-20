import { useEffect, useRef } from "react";

export interface KeyboardShortcutHandlers {
	onAddNode: () => void;
	onSave: () => void;
	onOptimizeLayout: () => void;
	onShowHistory: () => void;
	onUndo: () => void;
	onRedo: () => void;
}

interface UseKeyboardShortcutsOptions {
	enabled?: boolean;
}

const isEditableTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false;
	return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
};

const isModalOpen = (): boolean =>
	document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]') !== null;

/**
 * Registers the canvas keyboard shortcuts on `window`.
 *
 * Shortcuts are ignored while typing in a form control or while a modal is
 * open. `Cmd` is the primary modifier (macOS); history uses `Ctrl+H` because
 * macOS reserves `Cmd+H` for hiding the app.
 */
export const useKeyboardShortcuts = (handlers: KeyboardShortcutHandlers, { enabled = true }: UseKeyboardShortcutsOptions = {}) => {
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;

	useEffect(() => {
		if (!enabled) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (isEditableTarget(event.target) || isModalOpen()) return;

			const key = event.key.toLowerCase();
			const command = event.metaKey;
			const noAlt = !event.altKey;

			if (command && !event.shiftKey && noAlt && key === "n") {
				event.preventDefault();
				handlersRef.current.onAddNode();
				return;
			}

			if (command && !event.shiftKey && noAlt && key === "s") {
				event.preventDefault();
				handlersRef.current.onSave();
				return;
			}

			if (command && !event.shiftKey && noAlt && key === "o") {
				event.preventDefault();
				handlersRef.current.onOptimizeLayout();
				return;
			}

			if (event.ctrlKey && !command && !event.shiftKey && noAlt && key === "h") {
				event.preventDefault();
				handlersRef.current.onShowHistory();
				return;
			}

			if (command && !event.shiftKey && noAlt && key === "z") {
				event.preventDefault();
				handlersRef.current.onUndo();
				return;
			}

			// Shift+Cmd+R is the requested redo shortcut; Shift+Cmd+Z is the macOS
			// convention and is supported as an alias.
			if (command && event.shiftKey && noAlt && (key === "r" || key === "z")) {
				event.preventDefault();
				handlersRef.current.onRedo();
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [enabled]);
};
