import type { JSONObject } from "Common/Types/JSON";

export const LOG_RESOURCE_FACET_KEYS: Array<string> = [
  "primaryEntityId",
  "hostId",
  "dockerHostId",
  "podmanHostId",
  "kubernetesClusterId",
];

function mergeValues(
  requestData: JSONObject,
  requestKey: string,
  facetValues: Set<string> | undefined,
): void {
  if (!facetValues || facetValues.size === 0) {
    return;
  }

  const existing: Array<string> = Array.isArray(requestData[requestKey])
    ? ((requestData[requestKey] as Array<unknown>).filter(
        (value: unknown): value is string => {
          return typeof value === "string" && value.length > 0;
        },
      ) as Array<string>)
    : [];

  const merged: Set<string> = new Set(existing);
  for (const value of facetValues) {
    if (value) {
      merged.add(value);
    }
  }

  if (merged.size > 0) {
    requestData[requestKey] = Array.from(merged);
  }
}

export function applyFacetFiltersToLogsAggregationRequest(
  requestData: JSONObject,
  appliedFacetFilters: Map<string, Set<string>>,
): JSONObject {
  const nextRequestData: JSONObject = {
    ...requestData,
  };

  mergeValues(
    nextRequestData,
    "severityTexts",
    appliedFacetFilters.get("severityText"),
  );

  const mergedServiceIds: Set<string> = new Set(
    Array.isArray(nextRequestData["serviceIds"])
      ? ((nextRequestData["serviceIds"] as Array<unknown>).filter(
          (value: unknown): value is string => {
            return typeof value === "string" && value.length > 0;
          },
        ) as Array<string>)
      : [],
  );

  for (const facetKey of LOG_RESOURCE_FACET_KEYS) {
    const values: Set<string> | undefined = appliedFacetFilters.get(facetKey);
    if (!values) {
      continue;
    }

    for (const value of values) {
      if (value) {
        mergedServiceIds.add(value);
      }
    }
  }

  if (mergedServiceIds.size > 0) {
    nextRequestData["serviceIds"] = Array.from(mergedServiceIds);
  }

  mergeValues(nextRequestData, "traceIds", appliedFacetFilters.get("traceId"));
  mergeValues(nextRequestData, "spanIds", appliedFacetFilters.get("spanId"));

  return nextRequestData;
}
