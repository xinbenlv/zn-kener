/**
 * Builds the status tree for the /tree page: every GROUP monitor becomes a branch and every
 * other monitor a leaf, nested to any depth. Each node carries the counts of the leaves below it,
 * so a branch shows how many monitors it holds and how many need attention.
 *
 * A viewer who cannot see hidden monitors gets no name or tag for a hidden monitor. Its status
 * still counts toward its parents (the same rule as group monitors), and the parent reports how
 * many private monitors it holds.
 */

export type TreeStatus = "UP" | "DEGRADED" | "DOWN" | "MAINTENANCE" | "NO_DATA";

export interface TreeCounts {
  UP: number;
  DEGRADED: number;
  DOWN: number;
  MAINTENANCE: number;
  NO_DATA: number;
}

export interface StatusTreeNode {
  name: string;
  /** Set for real monitors; absent for the root and the "Ungrouped" branch. */
  tag?: string;
  status: TreeStatus;
  counts: TreeCounts;
  /** Leaves below this node, private ones included. */
  total: number;
  /** Leaves below this node that are DOWN or DEGRADED. */
  attention: number;
  /** Hidden leaves below this node that the viewer cannot see by name. */
  privateCount: number;
  /** Combined status of those private monitors; the group's own status already reflects it. */
  privateStatus?: TreeStatus;
  children?: StatusTreeNode[];
}

export interface TreeMonitorInput {
  tag: string;
  name: string;
  monitor_type: string;
  is_hidden: string;
  /** Member tags for a GROUP monitor. */
  members?: string[];
}

const STATUSES: TreeStatus[] = ["UP", "DEGRADED", "DOWN", "MAINTENANCE", "NO_DATA"];
const emptyCounts = (): TreeCounts => ({ UP: 0, DEGRADED: 0, DOWN: 0, MAINTENANCE: 0, NO_DATA: 0 });

export const RollupStatus = (counts: TreeCounts): TreeStatus => {
  if (counts.DOWN) return "DOWN";
  if (counts.DEGRADED) return "DEGRADED";
  if (counts.UP) return "UP";
  if (counts.MAINTENANCE) return "MAINTENANCE";
  return "NO_DATA";
};

const toStatus = (raw: string | null | undefined): TreeStatus =>
  raw && (STATUSES as string[]).includes(raw) ? (raw as TreeStatus) : "NO_DATA";

export const BuildStatusTree = (
  monitors: TreeMonitorInput[],
  latestStatusByTag: Record<string, string | null | undefined>,
  canSeeHidden: boolean,
  rootName = "All monitors",
): StatusTreeNode => {
  const byTag = new Map(monitors.map((m) => [m.tag, m]));
  const memberOf = new Set(monitors.flatMap((m) => (m.monitor_type === "GROUP" ? (m.members ?? []) : [])));

  // Returns the node, or null when the subtree is hidden from this viewer. Hidden counts are
  // folded into `hiddenInto` so the caller can report them as private monitors.
  const build = (m: TreeMonitorInput, path: Set<string>, hiddenInto: TreeCounts): StatusTreeNode | null => {
    const hidden = !canSeeHidden && m.is_hidden === "YES";
    if (m.monitor_type !== "GROUP") {
      const status = toStatus(latestStatusByTag[m.tag]);
      if (hidden) {
        hiddenInto[status] += 1;
        return null;
      }
      const counts = emptyCounts();
      counts[status] = 1;
      return {
        name: m.name,
        tag: m.tag,
        status,
        counts,
        total: 1,
        attention: status === "DOWN" || status === "DEGRADED" ? 1 : 0,
        privateCount: 0,
      };
    }
    const next = new Set(path).add(m.tag);
    const kids = (m.members ?? [])
      .map((t) => byTag.get(t))
      .filter((k): k is TreeMonitorInput => !!k && !next.has(k.tag));
    const node = branch(m.name, m.tag, kids, next);
    if (hidden) {
      STATUSES.forEach((s) => (hiddenInto[s] += node.counts[s]));
      return null;
    }
    return node;
  };

  const branch = (
    name: string,
    tag: string | undefined,
    kids: TreeMonitorInput[],
    path: Set<string>,
  ): StatusTreeNode => {
    const privateCounts = emptyCounts();
    const children = kids.map((k) => build(k, path, privateCounts)).filter((c): c is StatusTreeNode => !!c);
    const counts = emptyCounts();
    for (const s of STATUSES) counts[s] = privateCounts[s] + children.reduce((a, c) => a + c.counts[s], 0);
    const privateCount = STATUSES.reduce((a, s) => a + privateCounts[s], 0);
    const total = STATUSES.reduce((a, s) => a + counts[s], 0);
    const node: StatusTreeNode = {
      name,
      status: RollupStatus(counts),
      counts,
      total,
      attention: counts.DOWN + counts.DEGRADED,
      privateCount,
      ...(privateCount ? { privateStatus: RollupStatus(privateCounts) } : {}),
      children,
    };
    if (tag) node.tag = tag;
    return node;
  };

  const topGroups = monitors.filter((m) => m.monitor_type === "GROUP" && !memberOf.has(m.tag));
  const loose = monitors.filter((m) => m.monitor_type !== "GROUP" && !memberOf.has(m.tag));
  const root = branch(rootName, undefined, topGroups, new Set());
  if (loose.length) {
    const ungrouped = branch("Ungrouped", undefined, loose, new Set());
    if (ungrouped.children!.length || ungrouped.privateCount) {
      root.children!.push(ungrouped);
      for (const s of STATUSES) root.counts[s] += ungrouped.counts[s];
      root.total += ungrouped.total;
      root.attention += ungrouped.attention;
      root.status = RollupStatus(root.counts);
    }
  }
  return root;
};
