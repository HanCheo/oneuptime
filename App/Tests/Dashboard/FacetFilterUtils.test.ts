import type { JSONObject } from "Common/Types/JSON";
import Includes from "Common/Types/BaseDatabase/Includes";
import Query from "Common/Types/BaseDatabase/Query";
import Log from "Common/Models/AnalyticsModels/Log";
import {
  applyFacetFiltersToLogQuery,
  applyFacetFiltersToLogsAggregationRequest,
} from "../../FeatureSet/Dashboard/src/Components/Logs/FacetFilterUtils";

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

  test("applies severity and resource facets to log list queries", () => {
    const baseQuery: Query<Log> = {
      body: "ingester",
    };

    const appliedFacetFilters: Map<string, Set<string>> = new Map([
      ["severityText", new Set(["Debug"])],
      ["hostId", new Set(["host-1"])],
      ["primaryEntityId", new Set(["service-a"])],
    ]);

    const result: Query<Log> = applyFacetFiltersToLogQuery(
      baseQuery,
      appliedFacetFilters,
    );

    expect(result.body).toBe("ingester");
    expect(result.severityText).toBe("Debug");
    expect(result.primaryEntityId).toBeInstanceOf(Includes);
    expect((result.primaryEntityId as Includes).values).toEqual([
      "host-1",
      "service-a",
    ]);
  });
});
