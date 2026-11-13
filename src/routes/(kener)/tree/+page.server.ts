import type { PageServerLoad } from "./$types";
import { GetMonitorsParsed, GetLatestMonitoringDataAllActive } from "$lib/server/controllers/monitorsController";
import { BuildStatusTree, type TreeMonitorInput } from "$lib/server/statusTree";
import type { GroupMonitorTypeData } from "$lib/server/types/monitor";

export const load: PageServerLoad = async ({ parent }) => {
  const { canSeeHiddenMonitors } = await parent();
  const monitors = await GetMonitorsParsed({ status: "ACTIVE" });
  const inputs: TreeMonitorInput[] = monitors.map((m) => ({
    tag: m.tag,
    name: m.name,
    monitor_type: m.monitor_type,
    is_hidden: m.is_hidden,
    members:
      m.monitor_type === "GROUP"
        ? ((m.type_data as GroupMonitorTypeData)?.monitors ?? []).map((member) => member.tag)
        : undefined,
  }));
  const leafTags = inputs.filter((m) => m.monitor_type !== "GROUP").map((m) => m.tag);
  const latest = await GetLatestMonitoringDataAllActive(leafTags);
  const latestStatusByTag = Object.fromEntries(latest.map((row) => [row.monitor_tag, row.status]));
  return {
    tree: BuildStatusTree(inputs, latestStatusByTag, canSeeHiddenMonitors),
    canSeeHiddenMonitors,
  };
};
