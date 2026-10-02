import { useMemo, useState, type ElementType } from "react";
import { motion } from "motion/react";
import { glossaryForms, type Glossary } from "../data/glossary";
import { useSubject } from "./SubjectContext";
import { cn, spring } from "../lib/ui";

/**
 * Renders curriculum prose with two affordances the plain strings cannot carry
 * on their own:
 *
 *  1. `backticks` become real code spans.
 *  2. The first mention of a glossary term becomes tappable, and reveals a
 *     plain-English meaning underneath the paragraph.
 *
 * Why underneath rather than a floating tooltip: a popover has to be
 * positioned, can be clipped by any scroll container it lands in, and on a
 * phone it covers the sentence the reader is trying to understand. An inline
 * block below the paragraph has none of those failure modes and reflows the
 * page honestly.
 *
 * Only the FIRST occurrence of each term links, and only inside one Prose
 * block. A paragraph that underlines the same word five times reads like a
 * ransom note and stops meaning anything.
 */

interface Matcher {
  re: RegExp;
  /** form (lowercased) → canonical glossary key. */
  formToKey: Map<string, string>;
}

/**
 * One compiled matcher per glossary object. Glossaries are module-level
 * constants, so this fills once per subject and never grows after that.
 */
const MATCHERS = new WeakMap<Glossary, Matcher>();

function matcherFor(g: Glossary): Matcher {
  let m = MATCHERS.get(g);
  if (!m) {
    const forms = glossaryForms(g);
    m = {
      re: new RegExp(
        `\\b(${forms
          .map((f) => f.form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")})\\b`,
        "gi",
      ),
      formToKey: new Map(forms.map((f) => [f.form.toLowerCase(), f.key])),
    };
    MATCHERS.set(g, m);
  }
  return m;
}

type Piece =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string }
  | { kind: "term"; value: string; termKey: string };

/** Splits on backticks first, so a term inside `code` is never linked. */
function tokenize(
  text: string,
  linkTerms: boolean,
  { re: TERM_RE, formToKey: FORM_TO_KEY }: Matcher,
): Piece[] {
  const pieces: Piece[] = [];
  const seen = new Set<string>();

  text.split(/`([^`]+)`/g).forEach((chunk, i) => {
    if (!chunk) return;
    // Odd indices are the captured code spans.
    if (i % 2 === 1) {
      pieces.push({ kind: "code", value: chunk });
      return;
    }
    if (!linkTerms) {
      pieces.push({ kind: "text", value: chunk });
      return;
    }

    let last = 0;
    TERM_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TERM_RE.exec(chunk)) !== null) {
      const key = FORM_TO_KEY.get(m[1].toLowerCase());
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (m.index > last) {
        pieces.push({ kind: "text", value: chunk.slice(last, m.index) });
      }
      pieces.push({ kind: "term", value: m[1], termKey: key });
      last = m.index + m[1].length;
    }
    if (last < chunk.length) {
      pieces.push({ kind: "text", value: chunk.slice(last) });
    }
  });

  return pieces;
}

export function Prose({
  children,
  className,
  as: Tag = "p",
  linkTerms = true,
}: {
  children: string;
  className?: string;
  as?: ElementType;
  linkTerms?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  // The glossary belongs to the subject being read: the same word can mean
  // different things in two subjects.
  const glossary = useSubject().glossary;
  const pieces = useMemo(
    () => tokenize(children, linkTerms, matcherFor(glossary)),
    [children, linkTerms, glossary],
  );

  const entry = open ? glossary[open] : null;

  return (
    <>
      <Tag className={className}>
        {pieces.map((p, i) => {
          if (p.kind === "code") {
            return (
              <code
                key={i}
                className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.9em] text-ink"
              >
                {p.value}
              </code>
            );
          }
          if (p.kind === "term") {
            const isOpen = open === p.termKey;
            return (
              <button
                key={i}
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : p.termKey)}
                className={cn(
                  "cursor-help underline decoration-dotted underline-offset-[3px] transition-colors",
                  isOpen ? "text-ink" : "text-ink hover:text-ink",
                )}
                style={{
                  textDecorationColor: "var(--color-viz-scan)",
                }}
              >
                {p.value}
              </button>
            );
          }
          return <span key={i}>{p.value}</span>;
        })}
      </Tag>

      {entry && (
        <motion.div
          // Position-only entrance: a stuck opacity would hide the very
          // explanation the reader just asked for.
          initial={{ y: -4 }}
          animate={{ y: 0 }}
          transition={spring}
          className="mt-2 rounded-lg border-l-2 px-3 py-2"
          style={{
            borderLeftColor: "var(--color-viz-scan)",
            background:
              "color-mix(in oklab, var(--color-viz-scan) 8%, transparent)",
          }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] tracking-wide text-ink-3 uppercase">
              {open}
            </span>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="shrink-0 text-[11px] text-ink-3 hover:text-ink"
            >
              close
            </button>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            {entry.plain}
          </p>
        </motion.div>
      )}
    </>
  );
}
