<script lang="ts">
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { t } from "$lib/stores/i18n";
  import type { StatusTreeNode, TreeStatus } from "$lib/server/statusTree";
  import { Inset, Squarify } from "$lib/client/treemap";

  let { data } = $props();

  const COLOR: Record<TreeStatus, string> = {
    UP: "var(--up)",
    DEGRADED: "var(--degraded)",
    DOWN: "var(--down)",
    MAINTENANCE: "var(--maintenance)",
    NO_DATA: "var(--muted-foreground)"
  };
  const ORDER: TreeStatus[] = ["DOWN", "DEGRADED", "MAINTENANCE", "UP", "NO_DATA"];

  interface Keyed {
    key: string;
    node: StatusTreeNode;
    path: string[];
  }

  // Give every node a stable key (its index path) and the names of its ancestors.
  const index = (node: StatusTreeNode, key: string, path: string[], out: Map<string, Keyed>) => {
    out.set(key, { key, node, path });
    node.children?.forEach((child, i) => index(child, `${key}.${i}`, [...path, node.name], out));
    return out;
  };
  let nodes = $derived(index(data.tree, "0", [], new Map()));

  let view = $state<"treemap" | "tree" | "attention">("treemap");
  let onlyProblems = $state(true);
  let toggled = $state<Record<string, boolean>>({});

  const isBranch = (n: StatusTreeNode) => !!n.children;
  // Open by default: the root and every branch with something that needs attention.
  const isOpen = (k: Keyed) => toggled[k.key] ?? (k.key === "0" || k.node.attention > 0);
  // A chain of branches with exactly one child branch is drawn as one row.
  const chainOf = (k: Keyed): Keyed[] => {
    const chain = [k];
    let last = k;
    while (last.node.children?.length === 1 && isBranch(last.node.children[0]) && !last.node.privateCount) {
      last = nodes.get(`${last.key}.0`)!;
      chain.push(last);
    }
    return chain;
  };
  const depthBelow = (n: StatusTreeNode): number =>
    n.children?.length ? 1 + Math.max(...n.children.map(depthBelow)) : 0;

  interface Row {
    kind: "branch" | "leaf" | "folded" | "private";
    indent: number;
    chain: Keyed[];
    folded?: { branches: number; monitors: number };
    privateCount?: number;
  }

  let rows = $derived.by(() => {
    const out: Row[] = [];
    const walk = (k: Keyed, indent: number) => {
      const chain = chainOf(k);
      const last = chain[chain.length - 1];
      if (!isBranch(last.node)) {
        out.push({ kind: "leaf", indent, chain });
        return;
      }
      out.push({ kind: "branch", indent, chain });
      if (!isOpen(last)) return;
      const kids = (last.node.children ?? []).map((_, i) => nodes.get(`${last.key}.${i}`)!);
      const shown = onlyProblems ? kids.filter((c) => c.node.attention > 0) : kids;
      shown.forEach((c) => walk(c, indent + 1));
      const hidden = kids.filter((c) => !shown.includes(c));
      if (hidden.length) {
        out.push({
          kind: "folded",
          indent: indent + 1,
          chain: [],
          folded: { branches: hidden.length, monitors: hidden.reduce((a, c) => a + c.node.total, 0) }
        });
      }
      if (last.node.privateCount)
        out.push({ kind: "private", indent: indent + 1, chain: [], privateCount: last.node.privateCount });
    };
    walk(nodes.get("0")!, 0);
    return out;
  });

  // Needs attention: visible leaves that are down or degraded, grouped by their parent path.
  let attention = $derived.by(() => {
    const groups = new Map<string, Keyed[]>();
    for (const k of nodes.values()) {
      if (isBranch(k.node) || k.node.attention === 0) continue;
      const where = k.path.slice(1).join(" › ") || k.path[0];
      if (!groups.has(where)) groups.set(where, []);
      groups.get(where)!.push(k);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  });
  let privateAttention = $derived(
    [...nodes.values()].some((k) => isBranch(k.node) && k.node.privateCount > 0) &&
      data.tree.attention > [...attention.values()].reduce((a, [, list]) => a + list.length, 0)
  );

  // ---- Treemap: the focused node's children, two levels at a time; area = number of monitors ----
  interface Cell {
    kind: "branch" | "leaf" | "private";
    key?: string;
    node?: StatusTreeNode;
    count?: number;
    status?: TreeStatus;
  }
  let focusKey = $state("0");
  let tmWidth = $state(0);
  let tmHeight = $derived(Math.round(Math.min(640, Math.max(320, tmWidth * 0.62))));
  let focus = $derived(nodes.get(focusKey) ?? nodes.get("0")!);
  const cellsOf = (k: Keyed): Cell[] => {
    const kids: Cell[] = (k.node.children ?? []).map((c, i) => ({
      kind: isBranch(c) ? "branch" : "leaf",
      key: `${k.key}.${i}`,
      node: c
    }));
    kids.sort((a, b) => b.node!.attention - a.node!.attention || b.node!.total - a.node!.total);
    if (k.node.privateCount) kids.push({ kind: "private", count: k.node.privateCount, status: k.node.privateStatus });
    return kids;
  };
  const cellValue = (c: Cell) => (c.kind === "private" ? c.count! : Math.max(1, c.node!.total));
  let layout = $derived.by(() => {
    if (!tmWidth) return [];
    return Squarify(cellsOf(focus), cellValue, { x: 0, y: 0, w: tmWidth, h: tmHeight }).map((o) => ({
      ...o,
      inner: o.item.kind === "branch" ? Squarify(cellsOf(nodes.get(o.item.key!)!), cellValue, Inset(o, 4, 20)) : []
    }));
  });
  let crumbs = $derived(
    focusKey
      .split(".")
      .map((_, i, parts) => nodes.get(parts.slice(0, i + 1).join("."))!)
      .filter(Boolean)
  );
  // Rough text fit: CJK glyphs are about twice as wide as Latin ones at 11-12px.
  const fit = (text: string, px: number) => {
    let width = 0;
    let out = "";
    for (const ch of text) {
      width += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 12 : 7;
      if (width > px) return out.length > 1 ? out.slice(0, -1) + "…" : "";
      out += ch;
    }
    return out;
  };
  const branchFill = (n: StatusTreeNode) =>
    `color-mix(in srgb, ${COLOR[n.status]} ${n.attention ? 70 : 35}%, transparent)`;

  // Private cells show the combined status of the hidden monitors, never their names.
  const privateFill = (s?: TreeStatus) => `color-mix(in srgb, ${COLOR[s ?? "NO_DATA"]} 45%, var(--muted))`;

  const statusLabel = (s: TreeStatus) =>
    ({ UP: "Up", DEGRADED: "Degraded", DOWN: "Down", MAINTENANCE: "Maintenance", NO_DATA: "No data" })[s];
  const shortPath = (path: string[]) =>
    (path.length > 4 ? [path[0], path[1], "…", ...path.slice(-2)] : path).join(" › ");
</script>

<svelte:head>
  <title>{$t("Status tree")} - {data.siteName}</title>
</svelte:head>

<div class="flex flex-col gap-4 pt-12 pb-4">
  <div class="flex flex-col gap-1 px-2">
    <h1 class="text-2xl font-medium sm:text-3xl">{$t("Status tree")}</h1>
    <p class="text-muted-foreground text-sm">
      {data.tree.total}
      {$t("monitors")} ·
      {#if data.tree.attention}
        <span style="color: {COLOR[data.tree.status]}">{data.tree.attention} {$t("need attention")}</span>
      {:else}
        <span style="color: var(--up)">{$t("all up")}</span>
      {/if}
    </p>
  </div>

  <div class="flex flex-wrap items-center gap-2 px-2" role="tablist">
    <button
      role="tab"
      aria-selected={view === "treemap"}
      class="rounded-full px-4 py-2 text-sm font-semibold {view === 'treemap'
        ? 'bg-foreground text-background'
        : 'bg-secondary'}"
      onclick={() => (view = "treemap")}>{$t("Treemap")}</button
    >
    <button
      role="tab"
      aria-selected={view === "tree"}
      class="rounded-full px-4 py-2 text-sm font-semibold {view === 'tree'
        ? 'bg-foreground text-background'
        : 'bg-secondary'}"
      onclick={() => (view = "tree")}>{$t("Tree")}</button
    >
    <button
      role="tab"
      aria-selected={view === "attention"}
      class="rounded-full px-4 py-2 text-sm font-semibold {view === 'attention'
        ? 'bg-foreground text-background'
        : 'bg-secondary'}"
      onclick={() => (view = "attention")}>{$t("Needs attention")} ({data.tree.attention})</button
    >
    {#if view === "tree"}
      <label class="text-muted-foreground ml-auto flex cursor-pointer items-center gap-2 text-xs">
        <input type="checkbox" bind:checked={onlyProblems} />
        {$t("Only open branches with problems")}
      </label>
    {/if}
  </div>

  <div class="bg-card rounded-3xl border p-3 sm:p-5">
    {#if view === "treemap"}
      <div data-testid="status-treemap">
        <div class="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          {#each crumbs as c, i (c.key)}
            {#if i > 0}<span class="text-muted-foreground">›</span>{/if}
            <button
              type="button"
              class="rounded-full px-3 py-1 {c.key === focusKey ? 'bg-foreground text-background' : 'bg-secondary'}"
              onclick={() => (focusKey = c.key)}>{c.node.name}</button
            >
          {/each}
          <span class="text-muted-foreground ml-auto"
            >{$t("Area is the number of monitors. Click a group to zoom in.")}</span
          >
        </div>
        <div bind:clientWidth={tmWidth} class="w-full">
          {#if tmWidth}
            <svg width={tmWidth} height={tmHeight} role="img" aria-label={$t("Treemap of monitors by group")}>
              {#each layout as o, i (o.item.key ?? `private-${i}`)}
                {#if o.item.kind === "branch"}
                  {@const n = o.item.node!}
                  <g
                    role="button"
                    tabindex="0"
                    class="cursor-pointer"
                    onclick={() => (focusKey = o.item.key!)}
                    onkeydown={(e) => e.key === "Enter" && (focusKey = o.item.key!)}
                  >
                    <rect
                      x={o.x + 1}
                      y={o.y + 1}
                      width={Math.max(0, o.w - 2)}
                      height={Math.max(0, o.h - 2)}
                      rx="14"
                      fill="color-mix(in srgb, var(--foreground) 6%, transparent)"
                    ></rect>
                    <text
                      x={o.x + 10}
                      y={o.y + 16}
                      fill={n.attention ? COLOR[n.status] : "currentColor"}
                      font-size="12"
                      font-weight="600"
                      >{fit(n.name + (n.attention ? ` · ${n.attention} ⚠` : ` · ✓ ${n.total}`), o.w - 18)}</text
                    >
                    <title>{n.name} · {n.total} {$t("monitors")} · {n.attention} {$t("need attention")}</title>
                  </g>
                  {#each o.inner as c, j (c.item.key ?? `ip-${j}`)}
                    {#if c.item.kind === "private"}
                      <a href={clientResolver(resolve, "/account/signin")}>
                        <rect
                          x={c.x + 1}
                          y={c.y + 1}
                          width={Math.max(0, c.w - 2)}
                          height={Math.max(0, c.h - 2)}
                          rx="6"
                          fill={privateFill(c.item.status)}
                        ></rect>
                        {#if c.w > 34 && c.h > 18}
                          <text x={c.x + 6} y={c.y + 15} fill="var(--muted-foreground)" font-size="11"
                            >{fit(`🔒 ${c.item.count}`, c.w - 10)}</text
                          >
                        {/if}
                        <title>{c.item.count} {$t("private monitors.")} {$t("Sign in to see them.")}</title>
                      </a>
                    {:else if c.item.kind === "branch"}
                      <g
                        role="button"
                        tabindex="0"
                        class="cursor-pointer"
                        onclick={() => (focusKey = c.item.key!)}
                        onkeydown={(e) => e.key === "Enter" && (focusKey = c.item.key!)}
                      >
                        <rect
                          x={c.x + 1}
                          y={c.y + 1}
                          width={Math.max(0, c.w - 2)}
                          height={Math.max(0, c.h - 2)}
                          rx="6"
                          fill={branchFill(c.item.node!)}
                        ></rect>
                        {#if c.w > 40 && c.h > 18}
                          <text x={c.x + 6} y={c.y + 15} fill="currentColor" font-size="11"
                            >{fit(c.item.node!.name, c.w - 10)}</text
                          >
                        {/if}
                        <title>{c.item.node!.name} · {c.item.node!.total} {$t("monitors")}</title>
                      </g>
                    {:else}
                      <a href={clientResolver(resolve, `/monitors/${c.item.node!.tag}`)}>
                        <rect
                          x={c.x + 1}
                          y={c.y + 1}
                          width={Math.max(0, c.w - 2)}
                          height={Math.max(0, c.h - 2)}
                          rx="6"
                          fill={COLOR[c.item.node!.status]}
                          fill-opacity="0.85"
                        ></rect>
                        {#if c.w > 40 && c.h > 18}
                          <text x={c.x + 6} y={c.y + 15} fill="#000" font-size="11" font-weight="600"
                            >{fit(c.item.node!.name, c.w - 10)}</text
                          >
                        {/if}
                        <title>{c.item.node!.name} · {statusLabel(c.item.node!.status)}</title>
                      </a>
                    {/if}
                  {/each}
                {:else if o.item.kind === "private"}
                  <a href={clientResolver(resolve, "/account/signin")}>
                    <rect
                      x={o.x + 1}
                      y={o.y + 1}
                      width={Math.max(0, o.w - 2)}
                      height={Math.max(0, o.h - 2)}
                      rx="14"
                      fill={privateFill(o.item.status)}
                    ></rect>
                    <text x={o.x + 10} y={o.y + 18} fill="var(--muted-foreground)" font-size="12"
                      >{fit(`🔒 ${o.item.count} ${$t("private monitors.")}`, o.w - 18)}</text
                    >
                  </a>
                {:else}
                  <a href={clientResolver(resolve, `/monitors/${o.item.node!.tag}`)}>
                    <rect
                      x={o.x + 1}
                      y={o.y + 1}
                      width={Math.max(0, o.w - 2)}
                      height={Math.max(0, o.h - 2)}
                      rx="14"
                      fill={COLOR[o.item.node!.status]}
                      fill-opacity="0.85"
                    ></rect>
                    <text x={o.x + 10} y={o.y + 18} fill="#000" font-size="12" font-weight="600"
                      >{fit(o.item.node!.name, o.w - 18)}</text
                    >
                    <title>{o.item.node!.name} · {statusLabel(o.item.node!.status)}</title>
                  </a>
                {/if}
              {/each}
            </svg>
          {/if}
        </div>
        <div class="text-muted-foreground mt-3 flex flex-wrap gap-3 text-xs">
          {#each ORDER as s (s)}
            <span class="inline-flex items-center gap-1.5"
              ><i class="inline-block size-2 rounded-full" style="background: {COLOR[s]}"></i>{statusLabel(s)}</span
            >
          {/each}
          <span class="inline-flex items-center gap-1.5"
            ><i class="inline-block size-2 rounded-full" style="background: var(--muted)"></i>{$t("Private")}</span
          >
        </div>
      </div>
    {:else if view === "tree"}
      <div class="flex flex-col text-sm" data-testid="status-tree">
        {#each rows as row, i (i)}
          {#if row.kind === "folded"}
            <div class="text-muted-foreground py-1 text-xs" style="padding-left: {row.indent * 18 + 28}px">
              ✓ {row.folded!.branches}
              {$t("more up")} · {row.folded!.monitors}
              {$t("monitors")}
            </div>
          {:else if row.kind === "private"}
            <div class="text-muted-foreground py-1 text-xs" style="padding-left: {row.indent * 18 + 28}px">
              🔒 {row.privateCount}
              {$t("private monitors.")}
              <a class="underline underline-offset-2" href={clientResolver(resolve, "/account/signin")}
                >{$t("Sign in to see them.")}</a
              >
            </div>
          {:else}
            {@const last = row.chain[row.chain.length - 1]}
            {@const branch = row.kind === "branch"}
            {@const open = branch && isOpen(last)}
            <button
              type="button"
              class="hover:bg-secondary grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl py-1.5 pr-2 text-left"
              style="padding-left: {row.indent * 18 + 6}px"
              disabled={!branch}
              aria-expanded={branch ? open : undefined}
              onclick={() => branch && (toggled = { ...toggled, [last.key]: !open })}
            >
              <span class="inline-block w-3 text-center transition-transform {open ? 'rotate-90' : ''}"
                >{branch ? "›" : ""}</span
              >
              <span class="truncate">
                <span class="mr-2 inline-block size-2 rounded-full" style="background: {COLOR[last.node.status]}"
                ></span>
                {#each row.chain as part, j (part.key)}
                  {#if j > 0}<span class="text-muted-foreground mx-1">›</span>{/if}
                  {#if !branch && part.node.tag}
                    <a class="hover:underline" href={clientResolver(resolve, `/monitors/${part.node.tag}`)}
                      >{part.node.name}</a
                    >
                  {:else}
                    <span class={branch ? "font-semibold" : ""}>{part.node.name}</span>
                  {/if}
                {/each}
                {#if branch}
                  <span class="text-muted-foreground ml-1 text-xs">{last.node.total}</span>
                  {#if !open && depthBelow(last.node) > 1}
                    <span
                      class="ml-1 rounded-full px-2 text-[10px]"
                      style="background: color-mix(in srgb, var(--maintenance) 20%, transparent)"
                      >{depthBelow(last.node)} {$t("levels deeper")}</span
                    >
                  {/if}
                {/if}
              </span>
              <span class="flex items-center gap-2 text-xs font-semibold tabular-nums">
                {#if branch}
                  {#if last.node.attention}
                    <span style="color: {COLOR[last.node.status]}">{last.node.attention} {$t("need attention")}</span>
                  {:else}
                    <span class="text-muted-foreground">{$t("all up")}</span>
                  {/if}
                  <span class="hidden h-1.5 w-20 gap-0.5 sm:flex">
                    {#each ORDER.filter((s) => last.node.counts[s]) as s (s)}
                      <i class="rounded-full" style="flex: {last.node.counts[s]}; background: {COLOR[s]}"></i>
                    {/each}
                  </span>
                {:else}
                  <span style="color: {COLOR[last.node.status]}">{statusLabel(last.node.status)}</span>
                {/if}
              </span>
            </button>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="flex flex-col gap-4" data-testid="status-attention">
        {#if attention.length === 0 && !privateAttention}
          <p class="text-lg font-semibold" style="color: var(--up)">{$t("All clear")}</p>
          <p class="text-muted-foreground text-sm">{$t("No monitor is down or degraded right now.")}</p>
        {/if}
        {#each attention as [where, list] (where)}
          <div>
            <p class="text-muted-foreground mb-1 text-xs">{where} · {list.length}</p>
            {#each list as k (k.key)}
              <div class="flex items-center gap-3 border-t py-2 text-sm">
                <span class="inline-block size-2 shrink-0 rounded-full" style="background: {COLOR[k.node.status]}"
                ></span>
                <div class="min-w-0 flex-1">
                  <a class="font-semibold hover:underline" href={clientResolver(resolve, `/monitors/${k.node.tag}`)}
                    >{k.node.name}</a
                  >
                  <p class="text-muted-foreground truncate text-xs">{shortPath(k.path)}</p>
                </div>
                <span class="text-xs font-semibold" style="color: {COLOR[k.node.status]}"
                  >{statusLabel(k.node.status)}</span
                >
              </div>
            {/each}
          </div>
        {/each}
        {#if privateAttention}
          <p class="text-muted-foreground text-xs">
            🔒 {$t("Some private monitors need attention.")}
            <a class="underline underline-offset-2" href={clientResolver(resolve, "/account/signin")}
              >{$t("Sign in to see them.")}</a
            >
          </p>
        {/if}
      </div>
    {/if}
  </div>
</div>
