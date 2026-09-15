import { Platform } from "obsidian";

export type DesktopAdapter = {
	getBasePath?: () => string;
};

export type ElectronShell = {
	openExternal: (url: string) => Promise<void>;
};

export type ElectronClipboard = {
	write: (data: { text: string; html: string }) => void;
	writeText?: (text: string) => void;
};

function desktopRequire<T>(moduleName: string): T | undefined {
	if (!Platform.isDesktop || typeof require !== "function") return undefined;
	try {
		return require(moduleName) as T;
	} catch {
		return undefined;
	}
}

export function getVaultBasePath(adapter: unknown): string | undefined {
	if (!adapter || typeof adapter !== "object") return undefined;
	const getBasePath = (adapter as DesktopAdapter).getBasePath;
	return typeof getBasePath === "function" ? getBasePath.call(adapter) : undefined;
}

export function readOptionalDesktopText(path: string): string | undefined {
	const fs = desktopRequire<typeof import("fs")>("fs");
	if (!fs) return undefined;
	if (!fs.existsSync(path)) return undefined;
	return fs.readFileSync(path, "utf-8");
}

export function loadOptionalDesktopModule<T>(path: string): T | undefined {
	const fs = desktopRequire<typeof import("fs")>("fs");
	if (!fs) return undefined;
	if (!fs.existsSync(path)) return undefined;
	return desktopRequire<T>(path);
}

export function getDesktopHttp(): typeof import("http") {
	const http = desktopRequire<typeof import("http")>("http");
	if (!http) throw new Error("预览功能仅支持桌面端");
	return http;
}

export function getElectronShell(): ElectronShell {
	const electron = desktopRequire<{ shell?: ElectronShell }>("electron");
	if (!electron?.shell) throw new Error("系统浏览器预览仅支持桌面端");
	return electron.shell;
}

export function getElectronClipboard(): ElectronClipboard | undefined {
	return desktopRequire<{ clipboard?: ElectronClipboard }>("electron")?.clipboard;
}

export function binaryToBase64(buffer: ArrayBuffer): string {
	const nodeBuffer = desktopRequire<typeof import("buffer")>("buffer");
	if (!nodeBuffer) throw new Error("图片 Base64 处理仅支持桌面端");
	return nodeBuffer.Buffer.from(new Uint8Array(buffer)).toString("base64");
}
