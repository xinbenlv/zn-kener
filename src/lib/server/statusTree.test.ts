import { describe, expect, it } from "vitest";
import { BuildStatusTree, type TreeMonitorInput } from "./statusTree";

const leaf = (tag: string, is_hidden = "NO"): TreeMonitorInput => ({
  tag,
  name: tag.toUpperCase(),
  monitor_type: "API",
  is_hidden,
});
const group = (tag: string, members: string[], is_hidden = "NO"): TreeMonitorInput => ({
  tag,
  name: tag.toUpperCase(),
  monitor_type: "GROUP",
  is_hidden,
  members,
});

describe("BuildStatusTree", () => {
  it("nests groups to any depth and rolls counts up to the root", () => {
    const monitors = [
      group("home", ["floor"]),
      group("floor", ["room"]),
      group("room", ["smoke", "lock"]),
      leaf("smoke"),
      leaf("lock"),
    ];
    const root = BuildStatusTree(monitors, { smoke: "DOWN", lock: "UP" }, true);
    expect(root.children!.map((c) => c.tag)).toEqual(["home"]);
    const room = root.children![0].children![0].children![0];
    expect(room.tag).toBe("room");
    expect(room.children!.map((c) => c.tag)).toEqual(["smoke", "lock"]);
    expect(root).toMatchObject({ total: 2, attention: 1, status: "DOWN", counts: { DOWN: 1, UP: 1 } });
  });

  it("puts monitors that belong to no group under Ungrouped", () => {
    const root = BuildStatusTree([group("g", ["a"]), leaf("a"), leaf("b")], { a: "UP", b: "DEGRADED" }, true);
    expect(root.children!.map((c) => c.name)).toEqual(["G", "Ungrouped"]);
    expect(root.status).toBe("DEGRADED");
    expect(root.total).toBe(2);
  });

  it("never sends a hidden monitor's name or tag to a viewer who cannot see it, but still counts it", () => {
    const monitors = [group("g", ["pub", "secret-a"]), leaf("pub"), leaf("secret-a", "YES"), leaf("secret-b", "YES")];
    const root = BuildStatusTree(monitors, { pub: "UP", "secret-a": "DOWN", "secret-b": "UP" }, false);
    const text = JSON.stringify(root);
    expect(text).not.toContain("secret");
    expect(text).not.toContain("SECRET");
    expect(root.children![0]).toMatchObject({
      tag: "g",
      status: "DOWN",
      total: 2,
      privateCount: 1,
      privateStatus: "DOWN",
      attention: 1,
    });
    expect(root.children![1]).toMatchObject({ name: "Ungrouped", privateCount: 1, children: [] });
  });

  it("shows hidden monitors to a viewer who can see them", () => {
    const root = BuildStatusTree([group("g", ["secret"]), leaf("secret", "YES")], { secret: "UP" }, true);
    expect(root.children![0].children![0]).toMatchObject({ tag: "secret", privateCount: 0 });
  });

  it("folds a hidden group into its parent's private count", () => {
    const monitors = [group("top", ["inner"]), group("inner", ["x", "y"], "YES"), leaf("x"), leaf("y")];
    const root = BuildStatusTree(monitors, { x: "UP", y: "DOWN" }, false);
    expect(root.children![0]).toMatchObject({ tag: "top", children: [], privateCount: 2, status: "DOWN" });
    expect(JSON.stringify(root)).not.toContain('"inner"');
  });

  it("stops at a group cycle and treats a missing status as NO_DATA", () => {
    const monitors = [group("a", ["b", "gone"]), group("b", ["a", "c"]), leaf("c")];
    const root = BuildStatusTree(monitors, {}, true);
    expect(root.children!.length).toBe(0);
    const solo = BuildStatusTree([group("a", ["b"]), group("b", ["a", "c"]), leaf("c"), group("top", ["a"])], {}, true);
    const b = solo.children![0].children![0].children![0];
    expect(b.tag).toBe("b");
    expect(b.children!.map((c) => c.tag)).toEqual(["c"]);
    expect(b.status).toBe("NO_DATA");
  });
});
