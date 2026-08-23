export type AtelierId = "yarn" | "screen";

export const ATELIERS = {
  yarn: {
    id: "yarn" as const,
    label: "Yarn",
    kicker: "Arras",
    title: "Modern interpretation of medieval tapestry",
    blurb: "Drop a photo. It gets woven into the cloth — no account.",
  },
  screen: {
    id: "screen" as const,
    kicker: "Arras",
    label: "Screen",
    title: "Coromandel lacquer and gongbi wash",
    blurb: "Drop a photo. It is inlaid onto a folding screen — no account.",
  },
} as const;
