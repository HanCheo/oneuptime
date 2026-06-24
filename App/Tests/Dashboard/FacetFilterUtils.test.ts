import type { JSONObject } from "Common/Types/JSON";
import { applyFacetFiltersToLogsAggregationRequest } from "../../FeatureSet/Dashboard/src/Components/Logs/FacetFilterUtils";

describe("FacetFilterUtils", () => {
  test("applies active log facet filters to aggregation requests", () => {
    const requestData: JSONObject = {
      serviceIds: ["base-service"],
      traceIds: ["base-trace"],
      spanIds: ["base-span"],
    };

    const appliedFacetFilters: Map<string, Set<string>> = new Map([
      ["severityText", new Set(["ERROR", "WARNING"])],
      ["primaryEntityId", new Set(["service-a"])],
      ["hostId", new Set(["host-1"])],
      ["traceId", new Set(["trace-1"])],
      ["spanId", new Set(["span-1"])],
    ]);

    expect(
      applyFacetFiltersToLogsAggregationRequest(
        requestData,
        appliedFacetFilters,
      ),
    ).toEqual({
      serviceIds: ["base-service", "service-a", "host-1"],
      severityTexts: ["ERROR", "WARNING"],
      traceIds: ["base-trace", "trace-1"],
      spanIds: ["base-span", "span-1"],
    });
  });

  test("returns a cloned request when there are no active facet filters", () => {
    const requestData: JSONObject = {
      serviceIds: ["base-service"],
    };

    const result: JSONObject = applyFacetFiltersToLogsAggregationRequest(
      requestData,
      new Map(),
    );

    expect(result).toEqual(requestData);
    expect(result).not.toBe(requestData);
  });
});
