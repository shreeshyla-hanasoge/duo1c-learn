import { createContext, useContext } from "react";
import { SUBJECTS, type Subject } from "../data/subjects";

/**
 * The subject being read, for leaf components that render subject-specific
 * things — the glossary behind `Prose`, the unit prefix on `TierBadge` — and
 * would otherwise need the subject threaded through every caller. Views still
 * take `subject` as a prop; this is only for the leaves.
 */
export const SubjectContext = createContext<Subject>(SUBJECTS[0]);

export function useSubject(): Subject {
  return useContext(SubjectContext);
}
