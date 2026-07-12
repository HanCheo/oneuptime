import { describe, expect, test } from "@jest/globals";
import {
  DEFAULT_SERVICE_SCOPE_ATTRIBUTE_KEYS,
  getAttributeImpactSummary,
  getAttributeOptionDescription,
  getEffectiveAttributeKeys,
  getSelectorFitLabel,
  selectedAttributeKeysFromFormValue,
  ServiceScopeAttributeCatalogEntry,
} from "../../FeatureSet/Dashboard/src/Components/Project/ProjectTelemetryScopeAttributePickerUtils";

describe("ProjectTelemetryScopeAttributePickerUtils", () => {
  test("normalizes selected keys from mixed form values", () => {
    expect(
      selectedAttributeKeysFromFormValue([
        " resource.deployment.environment ",
        "",
        123,
        "resource.service.version",
      ]),
    ).toEqual(["resource.deployment.environment", "resource.service.version"]);
  });

  test("falls back to default keys when no custom keys are selected", () => {
    expect(
      getEffectiveAttributeKeys([], DEFAULT_SERVICE_SCOPE_ATTRIBUTE_KEYS),
    ).toEqual(DEFAULT_SERVICE_SCOPE_ATTRIBUTE_KEYS);
    expect(
      getEffectiveAttributeKeys(
        ["resource.service.version", "resource.service.version"],
        DEFAULT_SERVICE_SCOPE_ATTRIBUTE_KEYS,
      ),
    ).toEqual(["resource.service.version"]);
  });

  test("summarizes selector impact from recent service coverage and value count", () => {
    const entry: ServiceScopeAttributeCatalogEntry = {
      attributeKey: "resource.deployment.environment",
      activeServiceCount: 4,
      distinctValueCount: 4,
      sampleCount: 1820,
      lastSeenBucket: "2026-07-02T12:00:00.000Z",
    };

    expect(getAttributeImpactSummary(entry, 5)).toBe(
      "Adds 4 recent values across 4/5 active services (80% coverage).",
    );
    expect(getSelectorFitLabel(entry)).toBe("Tight selector");
    expect(getAttributeOptionDescription(entry, 5, 24)).toBe(
      "4/5 services · 80% coverage · 4 recent values · 24h window",
    );
  });

  test("explains when detailed metrics are still pending", () => {
    const entry: ServiceScopeAttributeCatalogEntry = {
      attributeKey: "custom.attribute",
      activeServiceCount: null,
      distinctValueCount: null,
      sampleCount: null,
      lastSeenBucket: null,
    };

    expect(getAttributeImpactSummary(entry, 0)).toBe(
      "Detailed impact metrics appear after the catalog endpoint is available.",
    );
    expect(getSelectorFitLabel(entry)).toBe("Metrics pending");
  });
});
