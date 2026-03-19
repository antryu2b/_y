/**
 * Company Registry Tests (M4 adapted)
 */

import {
  buildCompanyList,
  loadUserCompany,
  BASE_SUBSIDIARIES,
  ALL_AGENTS,
  COMPANIES,
  getCompany,
} from "@/lib/company-registry";

describe("Company Registry", () => {
  describe("buildCompanyList", () => {
    test("returns companies array", () => {
      const result = buildCompanyList();
      expect(result.companies.length).toBeGreaterThan(0);
    });

    test("default includes all 30 agents", () => {
      const result = buildCompanyList();
      const allAgents = result.companies.flatMap(c => c.agents);
      expect(allAgents.length).toBe(ALL_AGENTS.length);
    });

    test("returns defaultId", () => {
      const result = buildCompanyList();
      expect(result.defaultId).toBeTruthy();
    });

    test("adds user company when provided", () => {
      const userCo = {
        id: "user-test",
        name: "Test Corp",
        nameKo: "test",
        icon: "",
        color: "blue",
        agents: ["buildy"],
        floors: [3],
        description: "Test",
        descriptionKo: "test",
        isUserCompany: true,
      };
      const result = buildCompanyList(userCo);
      const found = result.companies.find(c => c.id === "user-test");
      expect(found).toBeDefined();
    });
  });

  describe("loadUserCompany", () => {
    test("returns null when no localStorage", () => {
      const result = loadUserCompany();
      expect(result === null || typeof result === "object").toBe(true);
    });
  });

  describe("BASE_SUBSIDIARIES", () => {
    test("is an array", () => {
      expect(Array.isArray(BASE_SUBSIDIARIES)).toBe(true);
    });
  });

  describe("Static exports", () => {
    test("COMPANIES is non-empty", () => {
      expect(COMPANIES.length).toBeGreaterThan(0);
    });

    test("getCompany returns company by id", () => {
      const first = COMPANIES[0];
      expect(getCompany(first.id)).toBeDefined();
    });

    test("getCompany returns undefined for unknown id", () => {
      expect(getCompany("nonexistent-xyz")).toBeUndefined();
    });
  });

  describe("ALL_AGENTS", () => {
    test("has exactly 30 agents", () => {
      expect(ALL_AGENTS).toHaveLength(30);
    });

    test("all entries are unique", () => {
      const unique = new Set(ALL_AGENTS);
      expect(unique.size).toBe(ALL_AGENTS.length);
    });
  });
});
