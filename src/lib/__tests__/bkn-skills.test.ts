import { describe, expect, it } from "vitest";
import {
  parseBknObjectTypeList,
  parseBknQueryRows,
  pickSkillObjectTypeQueryId,
} from "@/lib/bkn-skills";

describe("parseBknQueryRows", () => {
  it("parses top-level array", () => {
    const rows = parseBknQueryRows(
      JSON.stringify([
        { skill_id: "a", name: "A", description: "d" },
        { skill_id: "b", name: "B" },
      ]),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.skill_id).toBe("a");
  });

  it("unwraps data / items wrappers", () => {
    expect(
      parseBknQueryRows(
        JSON.stringify({ data: [{ skill_id: "x", name: "X" }] }),
      ),
    ).toHaveLength(1);
    expect(
      parseBknQueryRows(
        JSON.stringify({ items: [{ skill_id: "y", name: "Y" }] }),
      ),
    ).toHaveLength(1);
  });

  it("returns empty on invalid JSON or empty", () => {
    expect(parseBknQueryRows("")).toEqual([]);
    expect(parseBknQueryRows("not json")).toEqual([]);
    expect(parseBknQueryRows("{}")).toEqual([]);
  });
});

describe("parseBknObjectTypeList / pickSkillObjectTypeQueryId", () => {
  it("unwraps { entries: [...] } (real kweaver CLI output)", () => {
    const raw = JSON.stringify({
      total_count: 2,
      entries: [
        { id: "abc123", name: "bom" },
        { id: "d76v7m3rc6debr2st0g0", name: "skill" },
      ],
    });
    const list = parseBknObjectTypeList(raw);
    expect(list).toHaveLength(2);
    expect(pickSkillObjectTypeQueryId(list)).toBe("d76v7m3rc6debr2st0g0");
  });

  it("unwraps { object_types: [...] }", () => {
    const list = parseBknObjectTypeList(
      JSON.stringify({
        object_types: [
          { id: "other-ot", name: "bom" },
          { id: "d76v7m3rc6debr2st0g0", name: "skill" },
        ],
      }),
    );
    expect(pickSkillObjectTypeQueryId(list)).toBe("d76v7m3rc6debr2st0g0");
  });

  it("matches tags containing Skill when name differs", () => {
    const list = parseBknObjectTypeList(
      JSON.stringify({
        entries: [
          { id: "x1", name: "foo" },
          { id: "d76v7m3rc6debr2st0g0", name: "agent_skill", tags: ["Agent", "Skill"] },
        ],
      }),
    );
    expect(pickSkillObjectTypeQueryId(list)).toBe("d76v7m3rc6debr2st0g0");
  });

  it("matches by name skill regardless of server-assigned id", () => {
    const list = parseBknObjectTypeList(
      JSON.stringify([{ id: "d773imrrc6debr2st2v0", name: "skill" }]),
    );
    expect(pickSkillObjectTypeQueryId(list)).toBe("d773imrrc6debr2st2v0");
  });
});

describe("parseBknQueryRows (real kweaver CLI output)", () => {
  it("unwraps { datas: [...] }", () => {
    const rows = parseBknQueryRows(
      JSON.stringify({
        datas: [
          { skill_id: "pmc-delivery-risk", name: "PMC 交期与风险推理" },
          { skill_id: "pmc-producibility", name: "PMC 可生产量与日报" },
        ],
        overall_ms: 1313,
      }),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.skill_id).toBe("pmc-delivery-risk");
  });
});
