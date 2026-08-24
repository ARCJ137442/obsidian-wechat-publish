export type DesktopAdapter = {
	getBasePath?: () => string;
};

export type ElectronShell = {
	openExternal: (url: string) => Promise<void>;
};

export type ElectronClipboard = {
	write: (data: { text: string; html: string }) => void;
};

export function getVaultBasePath(adapter: unknown): string | undefined {
	if (!adapter || typeof adapter !== "object") return undefined;
	const getBasePath = (adapter as DesktopAdapter).getBasePath;
	return typeof getBasePath === "function" ? getBasePath.call(adapter) : undefined;
}

export function readOptionalDesktopText(path: string): string | undefined {
	const fs = require("fs") as typeof import("fs");
	if (!fs.existsSync(path)) return undefined;
	return fs.readFileSync(path, "utf-8");
}

export function loadOptionalDesktopModule<T>(path: string): T | undefined {
	const fs = require("fs") as typeof import("fs");
	if (!fs.existsSync(path)) return undefined;
	return require(path) as T;
}

export function getDesktopHttp(): typeof import("http") {
	return require("http") as typeof import("http");
}

export function getElectronShell(): ElectronShell {
	return (require("electron") as { shell: ElectronShell }).shell;
}

export function getElectronClipboard(): ElectronClipboard {
	return (require("electron") as { clipboard: ElectronClipboard }).clipboard;
}

export function binaryToBase64(buffer: ArrayBuffer): string {
	const { Buffer } = require("buffer") as typeof import("buffer");
	return Buffer.from(new Uint8Array(buffer)).toString("base64");
}
