/**
 * Environment Indicator
 *
 * Detects whether pi is running on the host or inside a container
 * (Docker, Podman, Distrobox, Toolbox, LXC, WSL, etc.) and shows the
 * result on the same line as the current folder (line 1 of the footer),
 * on the left side. Line 2 keeps the original token stats / model /
 * thinking-level display so the model name stays exactly where it
 * normally is.
 *
 * Detection methods (first match wins):
 *   1. /.dockerenv file          -> docker
 *   2. /run/.containerenv file   -> podman / oci
 *   3. /proc/1/cgroup markers    -> docker / kubepods / lxc / containerd
 *   4. /proc/1/environ container -> systemd-style env hint
 *   5. /proc/sys/kernel/osrelease "microsoft" -> wsl
 *   6. /proc/vz                  -> openvz
 *   Otherwise                    -> host
 *
 * Set PI_ENV_OVERRIDE=host|container:<name> to force a label.
 */

import { existsSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

type EnvKind =
	| { kind: "host" }
	| { kind: "container"; runtime: string };

const CGROUP_MARKERS: Array<[RegExp, string]> = [
	[/docker/i, "docker"],
	[/kubepods/i, "kubernetes"],
	[/containerd/i, "containerd"],
	[/libpod|buildah/i, "podman"],
	[/lxc/i, "lxc"],
	[/systemd-nspawn/i, "nspawn"],
];

function readProc(path: string): string {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
}

function detectContainerRuntime(): EnvKind {
	// Allow manual override (useful for testing or non-standard setups).
	const override = process.env.PI_ENV_OVERRIDE;
	if (override) {
		if (override === "host") return { kind: "host" };
		const m = override.match(/^container(?::(.+))?$/);
		if (m) return { kind: "container", runtime: m[1] ?? "container" };
	}

	// Docker sets this sentinel file.
	if (existsSync("/.dockerenv")) return { kind: "container", runtime: "docker" };

	// Podman and generic OCI runtimes set this.
	if (existsSync("/run/.containerenv")) {
		const meta = readProc("/run/.containerenv").toLowerCase();
		const runtime = meta.includes("podman") || meta.includes("libpod")
			? "podman"
			: "oci";
		return { kind: "container", runtime };
	}

	// systemd-creds / nspawn set a hint in the init process environment.
	const initEnv = readProc("/proc/1/environ").replace(/\0/g, "\n");
	if (/^container=/m.test(initEnv)) {
		return { kind: "container", runtime: "systemd-nspawn" };
	}

	// cgroup markers cover Docker, Kubernetes, containerd, LXC, Podman, ...
	const cgroup = readProc("/proc/1/cgroup");
	for (const [pattern, runtime] of CGROUP_MARKERS) {
		if (pattern.test(cgroup)) return { kind: "container", runtime };
	}

	// WSL exposes itself via the kernel release string.
	const osrelease = readProc("/proc/sys/kernel/osrelease").toLowerCase();
	if (osrelease.includes("microsoft") || osrelease.includes("wsl")) {
		return { kind: "container", runtime: "wsl" };
	}

	// OpenVZ classic.
	if (existsSync("/proc/vz")) return { kind: "container", runtime: "openvz" };

	// Distrobox/Toolbox containers don't set their own sentinel, but they
	// always run inside a container the methods above already detect
	// (docker or podman). The runtime label stays as the underlying tool,
	// which is what you actually want to know about.
	return { kind: "host" };
}

function hostHint(): string {
	try {
		return hostname();
	} catch {
		return "host";
	}
}

function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10_000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1_000_000) return `${Math.round(count / 1000)}k`;
	if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	return `${Math.round(count / 1_000_000)}M`;
}

function formatCwd(cwd: string, home: string | undefined): string {
	if (!home) return cwd;
	const resolvedCwd = resolve(cwd);
	const resolvedHome = resolve(home);
	const rel = relative(resolvedHome, resolvedCwd);
	const inside = rel === "" ||
		(rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
	if (!inside) return cwd;
	return rel === "" ? "~" : `~${sep}${rel}`;
}

export default function (pi: ExtensionAPI) {
	const env = detectContainerRuntime();

	pi.on("session_start", async (_event, ctx) => {
		const envText = env.kind === "container"
			? `[container:${env.runtime}]`
			: `[host:${hostHint()}]`;

		ctx.ui.setFooter((_tui, theme, footerData) => {
			const unsubBranch = footerData.onBranchChange(() => _tui.requestRender());
			// Dim the env indicator so it matches the pwd/branch styling on
			// the same line instead of standing out in the default fg color.
			const envLabel = theme.fg("dim", envText);

			return {
				dispose: () => unsubBranch(),
				invalidate() {},
				render(width: number): string[] {
					const lines: string[] = [];

					// ----- Line 1: pwd/branch/session (left) + env indicator (right) -----
					let pwdPart = formatCwd(ctx.cwd, process.env.HOME || process.env.USERPROFILE);
					const branch = footerData.getGitBranch();
					if (branch) pwdPart += ` (${branch})`;
					const sessionName = ctx.sessionManager.getSessionName();
					if (sessionName) pwdPart += ` \u2022 ${sessionName}`;
					const pwdLeft = theme.fg("dim", pwdPart);

					const envWidth = visibleWidth(envLabel);
					const pwdLeftWidth = visibleWidth(pwdLeft);
					const gap = 2;
					if (pwdLeftWidth + gap + envWidth <= width) {
						// Both fit - right-align the env indicator.
						const pad = " ".repeat(width - pwdLeftWidth - envWidth);
						lines.push(pwdLeft + pad + envLabel);
					} else if (pwdLeftWidth <= width) {
						// No room for env - keep pwd left-aligned like the default.
						lines.push(truncateToWidth(pwdLeft, width, theme.fg("dim", "...")));
					} else {
						// Terminal too narrow for even pwd - truncate it.
						lines.push(truncateToWidth(pwdLeft, width, theme.fg("dim", "...")));
					}

					// ----- Line 2: token stats (left) + model name (right) -----
					let totalInput = 0;
					let totalOutput = 0;
					let totalCacheRead = 0;
					let totalCacheWrite = 0;
					let totalCost = 0;
					let latestCacheHitRate: number | undefined;
					for (const entry of ctx.sessionManager.getEntries()) {
						if (entry.type === "message" && entry.message.role === "assistant") {
							const m = entry.message as AssistantMessage;
							totalInput += m.usage.input;
							totalOutput += m.usage.output;
							totalCacheRead += m.usage.cacheRead;
							totalCacheWrite += m.usage.cacheWrite;
							totalCost += m.usage.cost.total;
							const promptTokens = m.usage.input + m.usage.cacheRead + m.usage.cacheWrite;
							latestCacheHitRate = promptTokens > 0
								? (m.usage.cacheRead / promptTokens) * 100
								: undefined;
						}
					}

					const contextUsage = ctx.getContextUsage();
					const contextWindow = contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
					const contextPercentValue = contextUsage?.percent ?? 0;
					const contextPercent = contextUsage?.percent != null ? contextPercentValue.toFixed(1) : "?";

					const statsParts: string[] = [];
					if (totalInput) statsParts.push(`\u2191${formatTokens(totalInput)}`);
					if (totalOutput) statsParts.push(`\u2193${formatTokens(totalOutput)}`);
					if (totalCacheRead) statsParts.push(`R${formatTokens(totalCacheRead)}`);
					if (totalCacheWrite) statsParts.push(`W${formatTokens(totalCacheWrite)}`);
					if ((totalCacheRead > 0 || totalCacheWrite > 0) && latestCacheHitRate !== undefined) {
						statsParts.push(`CH${latestCacheHitRate.toFixed(1)}%`);
					}
					if (totalCost) statsParts.push(`$${totalCost.toFixed(3)}`);

					const contextPercentDisplay = contextPercent === "?"
						? `?/${formatTokens(contextWindow)}`
						: `${contextPercent}%/${formatTokens(contextWindow)}`;
					let contextPercentStr: string;
					if (contextPercentValue > 90) contextPercentStr = theme.fg("error", contextPercentDisplay);
					else if (contextPercentValue > 70) contextPercentStr = theme.fg("warning", contextPercentDisplay);
					else contextPercentStr = contextPercentDisplay;
					statsParts.push(contextPercentStr);

					let statsLeft = statsParts.join(" ");
					if (visibleWidth(statsLeft) > width) {
						statsLeft = truncateToWidth(statsLeft, width, "...");
					}

					const modelName = ctx.model?.id ?? "no-model";
					let rightSide = modelName;
					if (ctx.model?.reasoning) {
						const level = pi.getThinkingLevel();
						rightSide = level === "off"
							? `${modelName} \u2022 thinking off`
							: `${modelName} \u2022 ${level}`;
					}
					const providerCount = footerData.getAvailableProviderCount();
					if (providerCount > 1 && ctx.model) {
						const candidate = `(${ctx.model.provider}) ${rightSide}`;
						if (visibleWidth(statsLeft) + 2 + visibleWidth(candidate) <= width) {
							rightSide = candidate;
						}
					}

					const statsLeftWidth = visibleWidth(statsLeft);
					const rightSideWidth = visibleWidth(rightSide);
					const minPadding = 2;
					if (statsLeftWidth + minPadding + rightSideWidth <= width) {
						const pad = " ".repeat(width - statsLeftWidth - rightSideWidth);
						lines.push(theme.fg("dim", statsLeft) + pad + theme.fg("dim", rightSide));
					} else {
						const available = width - statsLeftWidth - minPadding;
						if (available > 0) {
							const truncated = truncateToWidth(rightSide, available, "");
							const pad = " ".repeat(Math.max(0, width - statsLeftWidth - visibleWidth(truncated)));
							lines.push(theme.fg("dim", statsLeft) + pad + theme.fg("dim", truncated));
						} else {
							lines.push(theme.fg("dim", statsLeft));
						}
					}

					// ----- Line 3: extension statuses (left) -----
					const extensionStatuses = footerData.getExtensionStatuses();
					if (extensionStatuses.size > 0) {
						const entries = Array.from(extensionStatuses.entries()) as Array<[string, string]>;
						const sorted = entries
							.sort((a, b) => a[0].localeCompare(b[0]))
							.map(([, text]) => text.replace(/[\r\n\t]+/g, " ").replace(/ +/g, " ").trim());
						if (sorted.length > 0) {
							lines.push(truncateToWidth(sorted.join(" "), width, theme.fg("dim", "...")));
						}
					}

					return lines;
				},
			};
		});
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setFooter(undefined);
	});
}
