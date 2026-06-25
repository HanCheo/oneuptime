import Log from "../../../Models/AnalyticsModels/Log";
import { ActiveFilter } from "./types";
import { JSONObject } from "../../../Types/JSON";

function getLogFieldValue(log: Log, facetKey: string): unknown {
  if (facetKey.startsWith("attributes.")) {
    const attributeKey: string = facetKey.substring("attributes.".length);
    const attributes: JSONObject = ((log as unknown as JSONObject)[
      "attributes"
    ] || {}) as JSONObject;

    return attributes[attributeKey];
  }

  return (log as unknown as JSONObject)[facetKey];
}

function doesLogMatchFacetValues(
  log: Log,
  facetKey: string,
  values: Set<string>,
): boolean {
  const logValue: unknown = getLogFieldValue(log, facetKey);

  if (logValue === undefined || logValue === null) {
    return false;
  }

  const normalizedLogValue: string = String(logValue).trim().toLowerCase();

  for (const value of values) {
    if (normalizedLogValue === value.trim().toLowerCase()) {
      return true;
    }
  }

  return false;
}

export default function filterLogsByActiveFilters(
  logs: Array<Log>,
  activeFilters: Array<ActiveFilter> | undefined,
): Array<Log> {
  if (!activeFilters || activeFilters.length === 0) {
    return logs;
  }

  const filtersByFacetKey: Map<string, Set<string>> = new Map();

  for (const filter of activeFilters) {
    const values: Set<string> =
      filtersByFacetKey.get(filter.facetKey) || new Set<string>();
    values.add(filter.value);
    filtersByFacetKey.set(filter.facetKey, values);
  }

  if (filtersByFacetKey.size === 0) {
    return logs;
  }

  return logs.filter((log: Log): boolean => {
    for (const [facetKey, values] of filtersByFacetKey.entries()) {
      if (!doesLogMatchFacetValues(log, facetKey, values)) {
        return false;
      }
    }

    return true;
  });
}
