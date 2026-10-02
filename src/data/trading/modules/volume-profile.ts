import type { Tier } from "../../types.ts";
import { vpAuction } from "../topics/vp-auction.ts";
import { vpTpoVsVolume } from "../topics/vp-tpo-vs-volume.ts";
import { vpBuilding } from "../topics/vp-building.ts";
import { vpPoc } from "../topics/vp-poc.ts";
import { vpValueArea } from "../topics/vp-value-area.ts";
import { vpAnatomy } from "../topics/vp-anatomy.ts";
import { vpShapes } from "../topics/vp-shapes.ts";
import { vpDayTypes } from "../topics/vp-day-types.ts";
import { vpOpen } from "../topics/vp-open.ts";
import { vpValueRelationships } from "../topics/vp-value-relationships.ts";
import { vpEightyRule } from "../topics/vp-80-rule.ts";
import { vpReferences } from "../topics/vp-references.ts";
import { vpDeveloping } from "../topics/vp-developing.ts";
import { vpWindows } from "../topics/vp-windows.ts";
import { vpOtherTools } from "../topics/vp-other-tools.ts";
import { vpIndia } from "../topics/vp-india.ts";
import { vpRules } from "../topics/vp-rules.ts";
import { vpHonestEdge } from "../topics/vp-honest-edge.ts";

/**
 * Module 1 — Volume Profile. Ordered so that each lesson needs only the ones
 * before it: what a profile measures (1–2), computing one exactly (3–5),
 * reading one (6–10), using yesterday's against today (11–14), tools and
 * Indian data realities (15–16), and turning it into honest, testable rules
 * (17–18).
 */
export const volumeProfile: Tier = {
  id: 1,
  name: "Volume Profile",
  tagline: "Read it, compute it, test it — and know which claims are folklore.",
  topics: [
    vpAuction,
    vpTpoVsVolume,
    vpBuilding,
    vpPoc,
    vpValueArea,
    vpAnatomy,
    vpShapes,
    vpDayTypes,
    vpOpen,
    vpValueRelationships,
    vpEightyRule,
    vpReferences,
    vpDeveloping,
    vpWindows,
    vpOtherTools,
    vpIndia,
    vpRules,
    vpHonestEdge,
  ],
};
