import { describe, expect, test } from "@jest/globals";
import Route from "Common/Types/API/Route";
import {
  getServiceTelemetryAttributeFilterDisplayKeys,
  getServiceTelemetryAttributeFilters,
  getValidServiceScopeValue,
  normalizeServiceEnvironment,
  normalizeServiceVersion,
  SERVICE_ENVIRONMENT_ATTRIBUTE_KEY,
  SERVICE_VERSION_ATTRIBUTE_KEY,
  withServiceTelemetryScopeRoute,
} from "../../FeatureSet/Dashboard/src/Pages/Service/View/environmentScope";

describe("Service telemetry scope helpers", () => {
  test("normalizes whitespace and blank values", () => {
    expect(normalizeServiceEnvironment("  production  ")).toBe("production");
    expect(normalizeServiceEnvironment("   ")).toBe("");
    expect(normalizeServiceEnvironment(undefined)).toBe("");
    expect(normalizeServiceVersion("  1.2.3  ")).toBe("1.2.3");
    expect(normalizeServiceVersion(null)).toBe("");
  });

  test("builds canonical attribute filters only for present scope values", () => {
    expect(
      getServiceTelemetryAttributeFilters({
        environment: "production",
        version: "1.2.3",
      }),
    ).toEqual({
      [SERVICE_ENVIRONMENT_ATTRIBUTE_KEY]: "production",
      [SERVICE_VERSION_ATTRIBUTE_KEY]: "1.2.3",
    });
    expect(
      getServiceTelemetryAttributeFilters({
        environment: "   ",
        version: "",
      }),
    ).toBeUndefined();
  });

  test("provides friendly display labels for scope chips", () => {
    expect(
      getServiceTelemetryAttributeFilterDisplayKeys({
        environment: "production",
        version: "1.2.3",
      }),
    ).toEqual({
      [SERVICE_ENVIRONMENT_ATTRIBUTE_KEY]: "Environment",
      [SERVICE_VERSION_ATTRIBUTE_KEY]: "Version",
    });
  });

  test("clears scope values that are not present in available options", () => {
    expect(
      getValidServiceScopeValue("production", ["staging", "production"]),
    ).toBe("production");
    expect(getValidServiceScopeValue("production", ["staging"])).toBe("");
    expect(getValidServiceScopeValue("   ", ["staging"])).toBe("");
  });

  test("preserves existing query params when appending env and version", () => {
    expect(
      withServiceTelemetryScopeRoute(
        new Route("/dashboard/service/123/logs?foo=bar"),
        {
          environment: "production",
          version: "1.2.3",
        },
      ).toString(),
    ).toBe("/dashboard/service/123/logs?foo=bar&env=production&version=1.2.3");
    expect(
      withServiceTelemetryScopeRoute(new Route("/dashboard/service/123/logs"), {
        environment: "staging us",
        version: "build 42",
      }).toString(),
    ).toBe("/dashboard/service/123/logs?env=staging%20us&version=build%2042");
  });
});
