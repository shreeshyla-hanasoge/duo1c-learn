import { motion } from "motion/react";
import { ArrowUpRight, Binary, Building2, FolderGit2, GitCompare, Layers, Sigma } from "lucide-react";
import type {
  LearnDeep as LearnDeepData,
  RealWorldCase,
} from "../../data/curriculum";
import type { AlgorithmRef } from "../../data/types";
import { getSubject } from "../../data/subjects";
import { href } from "../../lib/router";
import { Card, SectionTitle } from "../../components/ui";
import { Prose } from "../../components/Prose";
import { itemVariants, spring } from "../../lib/ui";
import { useSubject } from "../../components/SubjectContext";

/**
 * The long-form explainer, rendered only when a topic has been upgraded.
 * Topics still on the old shape fall back to the `insights` list, so this can
 * land topic by topic without a flag day.
 */

export function DeepSections({ learn }: { learn: LearnDeepData }) {
  const { copy } = useSubject();
  return (
    <>
      <motion.section variants={itemVariants}>
        <SectionTitle>The idea</SectionTitle>
        <Card
          className="border-l-2 p-5"
          style={{ borderLeftColor: "var(--color-viz-cursor)" }}
        >
          <Prose className="text-sm leading-relaxed text-ink-2">
            {learn.intuition}
          </Prose>
        </Card>
      </motion.section>

      <motion.section variants={itemVariants}>
        <SectionTitle hint={`${learn.mechanics.length} stages`}>
          How it works
        </SectionTitle>
        <ol className="flex flex-col gap-3">
          {learn.mechanics.map((m, i) => (
            <motion.li
              key={m.heading}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              transition={{ ...spring, delay: 0.04 * i }}
            >
              <Card className="flex gap-3.5 p-4">
                <span
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[11px]"
                  style={{
                    background:
                      "color-mix(in oklab, var(--color-viz-cursor) 18%, transparent)",
                    color: "var(--color-viz-cursor)",
                  }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium">{m.heading}</h3>
                  <Prose className="mt-1 text-sm leading-relaxed text-ink-2">
                    {m.body}
                  </Prose>
                </div>
              </Card>
            </motion.li>
          ))}
        </ol>
      </motion.section>

      <motion.section variants={itemVariants}>
        <SectionTitle hint={copy.derivationHint}>
          {copy.derivationTitle}
        </SectionTitle>
        <Card className="flex gap-3.5 p-4">
          <Sigma
            size={16}
            className="mt-0.5 shrink-0"
            style={{ color: "var(--color-viz-cursor)" }}
          />
          <div className="min-w-0">
            <Prose className="text-sm leading-relaxed text-ink-2">
              {learn.complexityDerivation}
            </Prose>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={itemVariants}>
        <SectionTitle hint="same shape, different job">Variants</SectionTitle>
        <div className="grid grid-cols-1 gap-2">
          {learn.variants.map((v) => (
            <Card key={v.name} className="p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <Layers size={13} className="shrink-0 text-ink-3" />
                <h3 className="text-sm font-medium">{v.name}</h3>
                <span className="text-xs text-ink-3">— {v.when}</span>
              </div>
              <Prose className="mt-1.5 text-sm text-ink-2">{v.delta}</Prose>
            </Card>
          ))}
        </div>
      </motion.section>

      <motion.section variants={itemVariants}>
        <SectionTitle hint="what you give up either way">
          Trade-offs
        </SectionTitle>
        <div className="grid grid-cols-1 gap-2">
          {learn.tradeoffs.map((t) => (
            <Card key={t.vs} className="p-4">
              <div className="flex items-start gap-2.5">
                <GitCompare size={14} className="mt-0.5 shrink-0 text-ink-3" />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="text-ink-3">vs </span>
                    <span className="text-ink">{t.vs}</span>
                  </p>
                  <p className="mt-1 text-sm font-medium">→ {t.pick}</p>
                  <Prose className="mt-1 text-sm leading-relaxed text-ink-2">
                    {t.because}
                  </Prose>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </motion.section>
    </>
  );
}

export function RealWorld({ cases }: { cases: RealWorldCase[] }) {
  const { copy } = useSubject();
  const yours = cases.filter((c) => c.kind === "yours").length;
  return (
    <motion.section variants={itemVariants}>
      <SectionTitle
        hint={yours ? copy.yoursHint(yours) : "where it earns its keep"}
      >
        In the wild
      </SectionTitle>
      <div className="grid grid-cols-1 gap-2">
        {cases.map((c) => {
          const mine = c.kind === "yours";
          const Icon = mine ? FolderGit2 : Building2;
          return (
            <Card
              key={c.system}
              className="p-4"
              style={
                mine ? { borderColor: "var(--color-viz-scan)" } : undefined
              }
            >
              <div className="flex items-start gap-2.5">
                <Icon
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{
                    color: mine
                      ? "var(--color-viz-scan)"
                      : "var(--color-ink-3)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-sm font-medium">{c.system}</h3>
                    {mine && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px]"
                        style={{
                          background:
                            "color-mix(in oklab, var(--color-viz-scan) 20%, transparent)",
                          color: "var(--color-ink-2)",
                        }}
                      >
                        your code
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] tracking-wide text-ink-3 uppercase">
                    The problem
                  </p>
                  <Prose className="text-sm text-ink-2">{c.problem}</Prose>
                  <p className="mt-2 text-[11px] tracking-wide text-ink-3 uppercase">
                    What they do
                  </p>
                  <Prose className="text-sm text-ink-2">{c.applied}</Prose>
                  {c.evidence && (
                    <p className="mt-1.5 font-mono text-[11px] break-all text-ink-3">
                      {c.evidence}
                    </p>
                  )}
                  {c.impact && (
                    <p
                      className="mt-1.5 font-mono text-[11px]"
                      style={{ color: "var(--color-viz-match)" }}
                    >
                      {c.impact}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.section>
  );
}

/**
 * The algorithms a design leans on, each linked to the DSA lesson that
 * teaches it. A reference whose `dsa` id no longer exists renders without a
 * link rather than a dead one.
 */
export function Algorithms({ items }: { items: AlgorithmRef[] }) {
  const dsa = getSubject("dsa");
  return (
    <motion.section variants={itemVariants}>
      <SectionTitle hint="the data structures doing the work">
        Algorithms inside
      </SectionTitle>
      <div className="grid grid-cols-1 gap-2">
        {items.map((a) => {
          const lesson = a.dsa ? dsa.topicById.get(a.dsa) : undefined;
          return (
            <Card key={a.name} className="flex items-start gap-3 p-4">
              <Binary size={15} className="mt-0.5 shrink-0 text-ink-3" />
              <div className="min-w-0">
                <h3 className="text-sm font-medium">{a.name}</h3>
                <Prose
                  linkTerms={false}
                  className="mt-1 text-sm leading-relaxed text-ink-2"
                >
                  {a.role}
                </Prose>
                {lesson && (
                  <a
                    href={href({ name: "topic", id: lesson.id, mode: "learn" }, dsa.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs"
                    style={{ color: "var(--color-viz-cursor)" }}
                  >
                    Learn it in DSA: {lesson.title}
                    <ArrowUpRight size={12} />
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </motion.section>
  );
}
