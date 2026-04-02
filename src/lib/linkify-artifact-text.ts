/**
 * Turn bare artifact-like filenames in assistant markdown into markdown links
 * so they render as preview cards (same as explicit [x](artifact:y)).
 * Skips fenced ``` code ``` and `inline code`, and skips existing [text](url) / ![alt](url).
 */

const ARTIFACT_FILE =
  /^([a-zA-Z0-9][\w.-]*\.(?:html|htm|md|markdown|json|txt|csv))\b/i;

function skipFencedCode(source: string, start: number): number {
  if (!source.startsWith("```", start)) return start;
  let i = start + 3;
  while (i < source.length && source[i] !== "\n") {
    i++;
  }
  if (i < source.length && source[i] === "\n") i++;
  const close = source.indexOf("```", i);
  if (close < 0) return source.length;
  return close + 3;
}

function linkifyPlainSegment(segment: string): string {
  let out = "";
  let j = 0;
  while (j < segment.length) {
    if (segment[j] === "!" && segment[j + 1] === "[") {
      const m = /^\!\[([^\]]*)\]\(([^)]+)\)/.exec(segment.slice(j));
      if (m) {
        out += m[0];
        j += m[0].length;
        continue;
      }
    }
    if (segment[j] === "[") {
      const m = /^\[([^\]]*)\]\(([^)]+)\)/.exec(segment.slice(j));
      if (m) {
        out += m[0];
        j += m[0].length;
        continue;
      }
    }

    const before = j > 0 ? segment[j - 1]! : "";
    /** Avoid matching inside URL slugs (e.g. …/pmc-delivery-risk-explainer.html). */
    const canStart = before === "" || !/[\/\w-]/.test(before);

    const rest = segment.slice(j);
    const m = canStart ? ARTIFACT_FILE.exec(rest) : null;
    if (m && m.index === 0) {
      const fn = m[1]!;
      if (!fn.includes("..")) {
        out += `[${fn}](artifact:${fn})`;
        j += m[0].length;
        continue;
      }
    }

    out += segment[j]!;
    j++;
  }
  return out;
}

export function linkifyBareArtifactFilenames(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    if (source.startsWith("```", i)) {
      const end = skipFencedCode(source, i);
      out += source.slice(i, end);
      i = end;
      continue;
    }
    if (source[i] === "`") {
      const end = source.indexOf("`", i + 1);
      if (end < 0) {
        out += source.slice(i);
        break;
      }
      out += source.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    const nextTick = source.indexOf("`", i);
    const nextFence = source.indexOf("```", i);
    let end = source.length;
    if (nextTick >= 0) end = Math.min(end, nextTick);
    if (nextFence >= 0) end = Math.min(end, nextFence);
    out += linkifyPlainSegment(source.slice(i, end));
    i = end;
  }
  return out;
}
