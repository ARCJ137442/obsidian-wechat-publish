import type { CalloutManagerJson } from "../../src/callout-plugin";

/** A portable fixture for custom Callout Manager settings. */
export const CALLOUT_MANAGER_FIXTURE: CalloutManagerJson = {
	callouts: {
		custom: ["code", "download", "branch", "history", "inspire", "todo"],
		settings: {
			code: [{ changes: { color: "208, 181, 48", icon: "lucide-braces" } }],
			download: [{ changes: { color: "83, 223, 221", icon: "lucide-arrow-down-to-line" } }],
			branch: [{ changes: { color: "255, 193, 7", icon: "lucide-git-branch" } }],
			history: [{ changes: { color: "255, 255, 255" } }],
			inspire: [{ changes: { color: "255, 255, 0" } }],
			todo: [{ changes: { color: "0, 255, 145", icon: "lucide-list-todo" } }],
		},
	},
};
