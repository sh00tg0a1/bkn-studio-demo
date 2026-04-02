import { workspaceHttpPath } from "@/lib/workspace-http";

const ARTIFACT_EXT = /\.(html|htm|md|markdown|json|txt|csv)$/i;

function artifactBasename(raw: string): string {
  const t = raw.trim().replace(/^\.\//, "").replace(/\\/g, "/");
  const i = t.lastIndexOf("/");
  return i >= 0 ? t.slice(i + 1) : t;
}

/**
 * Map markdown link targets to workspace artifact GET URLs so users can open
 * HTML/Markdown 成果 in a new tab. Supports `artifact:file.html`, bare
 * `file.html`, and legacy `/api/workspace/.../artifacts/...` paths.
 */
export function resolveArtifactDownloadHref(
  workspaceName: string,
  rawHref: string,
): { href: string; filename: string; openInNewTab: true } | null {
  const href = rawHref.trim();
  if (!href || href.startsWith("#")) return null;

  const scheme = /^artifact:(.+)$/i.exec(href);
  if (scheme) {
    const name = artifactBasename(scheme[1]);
    if (!name || name.includes("..") || !ARTIFACT_EXT.test(name)) return null;
    return {
      href: `${workspaceHttpPath(workspaceName, "/artifacts")}/${encodeURIComponent(name)}`,
      filename: name,
      openInNewTab: true,
    };
  }

  const apiRel = /^\/api\/workspace\/[^/]+\/artifacts\/(.+)$/.exec(href);
  if (apiRel) {
    try {
      const decoded = decodeURIComponent(apiRel[1]);
      const name = artifactBasename(decoded);
      if (!name || name.includes("..") || !ARTIFACT_EXT.test(name)) return null;
      return {
        href: `${workspaceHttpPath(workspaceName, "/artifacts")}/${encodeURIComponent(name)}`,
        filename: name,
        openInNewTab: true,
      };
    } catch {
      return null;
    }
  }

  const hasProtocol = /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
  const bare = href.replace(/^\.\//, "");
  if (
    hasProtocol ||
    bare.startsWith("/") ||
    bare.includes(" ") ||
    !ARTIFACT_EXT.test(bare)
  ) {
    return null;
  }
  const name = artifactBasename(bare);
  if (!name || name.includes("..")) return null;
  return {
    href: `${workspaceHttpPath(workspaceName, "/artifacts")}/${encodeURIComponent(name)}`,
    filename: name,
    openInNewTab: true,
  };
}
