import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Text } from "@earendil-works/pi-tui";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
// Custom Ollama Web Search + Fetch for pi
// Uses OLLAMA_API_KEY (injected by pi from auth.json) and OLLAMA_HOST env vars.
// Falls back to local Ollama (localhost:11434) without auth.

interface SearchResponse {
  results: Array<{
    title: string;
    url: string;
    content: string;
  }>;
}

interface FetchResponse {
  title: string;
  content: string;
  links: string[];
}

function getApiKey(): string | undefined {
  // Pi injects auth.json keys into process.env when running inside pi
  if (process.env.OLLAMA_API_KEY) return process.env.OLLAMA_API_KEY;
  // Fallback: read directly from auth.json (useful outside pi's process)
  try {
    const raw = readFileSync(`${homedir()}/.pi/agent/auth.json`, "utf8");
    const auth = JSON.parse(raw) as Record<string, { type: string; key: string }>;
    return auth["ollama-cloud"]?.key;
  } catch {
    return undefined;
  }
}

function getOllamaBaseUrl(): string {
  return (
    process.env.OLLAMA_HOST?.trimEnd().replace(/\/$/, "") ||
    (getApiKey() ? "https://ollama.com" : "http://localhost:11434")
  );
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = getApiKey();
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

export default function (pi: ExtensionAPI) {
  // web_search tool
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description:
      "Search the web for real-time information using Ollama's web_search API. Uses the same auth key as the ollama-cloud provider (from auth.json via OLLAMA_API_KEY env var).",
    promptGuidelines: [
      "Use web_search with max_results 5 (default) for most queries. Only increase max_results to 10 or more when doing deep research that explicitly requires broad source coverage.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "The search query to execute" }),
      max_results: Type.Optional(
        Type.Number({
          description: "Maximum number of search results to return (default: 5)",
          default: 5,
        })
      ),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const maxResults = params.max_results ?? 5;
      const baseUrl = getOllamaBaseUrl();

      try {
        const response = await fetch(
          `${baseUrl}/api/web_search`,
          {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              query: params.query,
              max_results: maxResults,
            }),
            signal,
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Unauthorized. Check that `ollama-cloud` is logged in with /login, or set OLLAMA_API_KEY."
            );
          }
          const errorText = await response.text().catch(() => "");
          throw new Error(
            `Search API error (status ${response.status}): ${errorText || response.statusText}`
          );
        }

        const data = (await response.json()) as SearchResponse;

        const formatted = data.results
          .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.content}`)
          .join("\n\n");

        return {
          content: [{ type: "text", text: formatted || "No results found." }],
          details: { results: data.results },
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("ECONNREFUSED")
        ) {
          throw new Error(
            `Could not connect to Ollama at ${baseUrl}. Make sure Ollama is running or OLLAMA_HOST is set correctly.`
          );
        }
        throw error;
      }
    },

    renderResult(result, { isPartial, expanded }, theme) {
      const results = (result.details as { results?: Array<{ title: string; url: string; content: string }> })?.results;

      if (isPartial || !results) {
        return new Text(theme.fg("warning", "Searching..."), 0, 0);
      }

      if (results.length === 0) {
        return new Text(theme.fg("dim", "No results found."), 0, 0);
      }

      // Always: numbered title + url
      const headerLines: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        headerLines.push(`${theme.fg("dim", `${i + 1}.`)} ${theme.fg("accent", r.title)}`);
        headerLines.push(`   ${theme.fg("dim", r.url)}`);
      }

      let text = headerLines.join("\n");

      if (expanded) {
        // Body: title + content for each result
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          text += `\n${theme.fg("dim", `${i + 1}.`)} ${theme.fg("accent", r.title)}`;
          for (const line of r.content.split("\n")) {
            if (line.trim()) text += `\n   ${line}`;
          }
          text += "\n";
        }
      } else {
        text += `\n${theme.fg("muted", "ctrl+e to expand content")}`;      }

      return new Text(text, 0, 0);
    },
  });

  // web_fetch tool
  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch",
    description:
      "Fetch and extract text content from a web page URL using Ollama's web_fetch API. Uses the same auth key as the ollama-cloud provider (from auth.json via OLLAMA_API_KEY env var).",
    parameters: Type.Object({
      url: Type.String({ description: "URL to fetch and extract content from" }),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const baseUrl = getOllamaBaseUrl();

      try {
        const response = await fetch(
          `${baseUrl}/api/web_fetch`,
          {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              url: params.url,
            }),
            signal,
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              "Unauthorized. Check that `ollama-cloud` is logged in with /login, or set OLLAMA_API_KEY."
            );
          }
          const errorText = await response.text().catch(() => "");
          throw new Error(
            `Fetch API error (status ${response.status}): ${errorText || response.statusText}`
          );
        }

        const data = (await response.json()) as FetchResponse;

        const formatted = [
          `Title: ${data.title}`,
          "",
          "Content:",
          data.content,
          "",
          `Links found: ${data.links?.length ?? 0}`,
          ...(data.links?.slice(0, 10).map((l) => `  - ${l}`) ?? []),
        ].join("\n");

        return {
          content: [{ type: "text", text: formatted }],
          details: {
            title: data.title,
            content: data.content,
            links: data.links,
          },
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("ECONNREFUSED")
        ) {
          throw new Error(
            `Could not connect to Ollama at ${baseUrl}. Make sure Ollama is running or OLLAMA_HOST is set correctly.`
          );
        }
        throw error;
      }
    },
  });
}
