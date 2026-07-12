import { APP_API_URL } from "Common/UI/Config";
import Dropdown, {
  DropdownOption,
  DropdownOptionGroup,
  DropdownValue,
} from "Common/UI/Components/Dropdown/Dropdown";
import API from "Common/UI/Utils/API/API";
import ModelAPI from "Common/UI/Utils/ModelAPI/ModelAPI";
import URL from "Common/Types/API/URL";
import HTTPErrorResponse from "Common/Types/API/HTTPErrorResponse";
import HTTPResponse from "Common/Types/API/HTTPResponse";
import { JSONObject } from "Common/Types/JSON";
import React, {
  FunctionComponent,
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_SERVICE_SCOPE_ATTRIBUTE_KEYS,
  DEFAULT_SERVICE_SCOPE_ATTRIBUTE_LOOKBACK_HOURS,
  getAttributeDisplayLabel,
  getAttributeDynamicReasons,
  getAttributeImpactSummary,
  getAttributeOptionDescription,
  getEffectiveAttributeKeys,
  getRecommendedAttributeDefinition,
  getSelectorFitLabel,
  RECOMMENDED_SERVICE_SCOPE_ATTRIBUTE_DEFINITIONS,
  selectedAttributeKeysFromFormValue,
  ServiceScopeAttributeCatalogEntry,
  ServiceScopeAttributeCatalogResponse,
} from "./ProjectTelemetryScopeAttributePickerUtils";

export { selectedAttributeKeysFromFormValue };

export interface ComponentProps {
  selectedAttributeKeys: Array<string>;
  onChange: (keys: Array<string>) => void;
}

const ProjectTelemetryScopeAttributePicker: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  const [catalog, setCatalog] =
    useState<ServiceScopeAttributeCatalogResponse | null>(null);
  const [isFallbackCatalog, setIsFallbackCatalog] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled: boolean = false;

    const buildFallbackCatalog = (
      attributeKeys: Array<string>,
    ): ServiceScopeAttributeCatalogResponse => {
      return {
        lookbackHours: DEFAULT_SERVICE_SCOPE_ATTRIBUTE_LOOKBACK_HOURS,
        defaultAttributeKeys: DEFAULT_SERVICE_SCOPE_ATTRIBUTE_KEYS,
        activeServiceCount: 0,
        observedAttributes: attributeKeys.map(
          (attributeKey: string): ServiceScopeAttributeCatalogEntry => {
            return {
              attributeKey,
              activeServiceCount: null,
              distinctValueCount: null,
              sampleCount: null,
              lastSeenBucket: null,
            };
          },
        ),
      };
    };

    const loadCatalog = async (): Promise<void> => {
      setIsLoading(true);
      setError("");
      setIsFallbackCatalog(false);

      try {
        const catalogResponse: HTTPResponse<JSONObject> | HTTPErrorResponse =
          await API.post({
            url: URL.fromString(APP_API_URL.toString()).addRoute(
              "/telemetry/traces/service-scope-attribute-catalog",
            ),
            data: {},
            headers: { ...ModelAPI.getCommonHeaders() },
          });

        if (catalogResponse instanceof HTTPErrorResponse) {
          throw catalogResponse;
        }

        if (cancelled) {
          return;
        }

        const observedAttributes: Array<ServiceScopeAttributeCatalogEntry> = (
          (catalogResponse.data["observedAttributes"] as Array<JSONObject>) || []
        ).map((entry: JSONObject): ServiceScopeAttributeCatalogEntry => {
          return {
            attributeKey: String(entry["attributeKey"] || ""),
            activeServiceCount:
              typeof entry["activeServiceCount"] === "number"
                ? Number(entry["activeServiceCount"])
                : null,
            distinctValueCount:
              typeof entry["distinctValueCount"] === "number"
                ? Number(entry["distinctValueCount"])
                : null,
            sampleCount:
              typeof entry["sampleCount"] === "number"
                ? Number(entry["sampleCount"])
                : null,
            lastSeenBucket:
              typeof entry["lastSeenBucket"] === "string"
                ? entry["lastSeenBucket"]
                : null,
          };
        });

        setCatalog({
          lookbackHours:
            typeof catalogResponse.data["lookbackHours"] === "number"
              ? Number(catalogResponse.data["lookbackHours"])
              : DEFAULT_SERVICE_SCOPE_ATTRIBUTE_LOOKBACK_HOURS,
          defaultAttributeKeys: Array.isArray(
            catalogResponse.data["defaultAttributeKeys"],
          )
            ? (catalogResponse.data["defaultAttributeKeys"] as Array<unknown>)
                .filter((key: unknown): key is string => {
                  return typeof key === "string" && Boolean(key.trim());
                })
                .map((key: string): string => {
                  return key.trim();
                })
            : DEFAULT_SERVICE_SCOPE_ATTRIBUTE_KEYS,
          activeServiceCount:
            typeof catalogResponse.data["activeServiceCount"] === "number"
              ? Number(catalogResponse.data["activeServiceCount"])
              : 0,
          observedAttributes,
        });
      } catch {
        try {
          const fallbackResponse: HTTPResponse<JSONObject> | HTTPErrorResponse =
            await API.post({
              url: URL.fromString(APP_API_URL.toString()).addRoute(
                "/telemetry/traces/get-attributes",
              ),
              data: {},
              headers: { ...ModelAPI.getCommonHeaders() },
            });

          if (fallbackResponse instanceof HTTPErrorResponse) {
            throw fallbackResponse;
          }

          if (cancelled) {
            return;
          }

          setCatalog(
            buildFallbackCatalog(
              ((fallbackResponse.data["attributes"] || []) as Array<string>).filter(
                (key: string): boolean => {
                  return Boolean(key && key.trim());
                },
              ),
            ),
          );
          setIsFallbackCatalog(true);
        } catch (fallbackError: unknown) {
          if (!cancelled) {
            setError(API.getFriendlyMessage(fallbackError as Error));
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const defaultAttributeKeys: Array<string> = useMemo(() => {
    if (catalog?.defaultAttributeKeys.length) {
      return catalog.defaultAttributeKeys;
    }

    return DEFAULT_SERVICE_SCOPE_ATTRIBUTE_KEYS;
  }, [catalog?.defaultAttributeKeys]);

  const effectiveAttributeKeys: Array<string> = useMemo(() => {
    return getEffectiveAttributeKeys(
      props.selectedAttributeKeys,
      defaultAttributeKeys,
    );
  }, [defaultAttributeKeys, props.selectedAttributeKeys]);

  const observedAttributeMap: Map<string, ServiceScopeAttributeCatalogEntry> =
    useMemo(() => {
      return new Map(
        (catalog?.observedAttributes || []).map(
          (
            entry: ServiceScopeAttributeCatalogEntry,
          ): [string, ServiceScopeAttributeCatalogEntry] => {
            return [entry.attributeKey, entry];
          },
        ),
      );
    }, [catalog?.observedAttributes]);

  const options: Array<DropdownOption | DropdownOptionGroup> = useMemo(() => {
    const activeServiceCount: number = catalog?.activeServiceCount || 0;
    const lookbackHours: number =
      catalog?.lookbackHours || DEFAULT_SERVICE_SCOPE_ATTRIBUTE_LOOKBACK_HOURS;
    const observedEntries: Array<ServiceScopeAttributeCatalogEntry> =
      catalog?.observedAttributes || [];

    const selectedButUnlistedOptions: Array<DropdownOption> = Array.from(
      new Set(props.selectedAttributeKeys),
    )
      .filter((key: string): boolean => {
        return !observedAttributeMap.has(key) && !getRecommendedAttributeDefinition(key);
      })
      .sort((a: string, b: string): number => {
        return a.localeCompare(b);
      })
      .map((key: string): DropdownOption => {
        return {
          label: key,
          value: key,
          description: "Currently selected custom key",
        };
      });

    const recommendedOptions: Array<DropdownOption> =
      RECOMMENDED_SERVICE_SCOPE_ATTRIBUTE_DEFINITIONS.map(
        (definition): DropdownOption => {
          const entry: ServiceScopeAttributeCatalogEntry | undefined =
            observedAttributeMap.get(definition.attributeKey);
          const description: string = entry
            ? `${definition.shortDescription} • ${getAttributeOptionDescription(
                entry,
                activeServiceCount,
                lookbackHours,
              )}`
            : definition.shortDescription;

          return {
            label: definition.label,
            value: definition.attributeKey,
            description,
          };
        },
      );

    const recommendedSet: Set<string> = new Set(
      RECOMMENDED_SERVICE_SCOPE_ATTRIBUTE_DEFINITIONS.map((definition) => {
        return definition.attributeKey;
      }),
    );
    const observedOptions: Array<DropdownOption> = observedEntries
      .filter((entry: ServiceScopeAttributeCatalogEntry): boolean => {
        return !recommendedSet.has(entry.attributeKey);
      })
      .sort(
        (
          a: ServiceScopeAttributeCatalogEntry,
          b: ServiceScopeAttributeCatalogEntry,
        ): number => {
          const sampleDiff: number = (b.sampleCount || 0) - (a.sampleCount || 0);

          if (sampleDiff !== 0) {
            return sampleDiff;
          }

          return a.attributeKey.localeCompare(b.attributeKey);
        },
      )
      .map((entry: ServiceScopeAttributeCatalogEntry): DropdownOption => {
        return {
          label: entry.attributeKey,
          value: entry.attributeKey,
          description: getAttributeOptionDescription(
            entry,
            activeServiceCount,
            lookbackHours,
          ),
        };
      });

    const groups: Array<DropdownOption | DropdownOptionGroup> = [];

    if (selectedButUnlistedOptions.length > 0) {
      groups.push({
        label: "Selected custom keys",
        options: selectedButUnlistedOptions,
      });
    }

    groups.push({
      label: "Recommended selectors",
      options: recommendedOptions,
    });

    if (observedOptions.length > 0) {
      groups.push({
        label: "Observed in project traces",
        options: observedOptions,
      });
    }

    return groups;
  }, [
    catalog?.activeServiceCount,
    catalog?.lookbackHours,
    catalog?.observedAttributes,
    observedAttributeMap,
    props.selectedAttributeKeys,
  ]);

  const flatOptions: Array<DropdownOption> = options.flatMap(
    (option: DropdownOption | DropdownOptionGroup): Array<DropdownOption> => {
      return "options" in option ? option.options : [option];
    },
  );

  const selectedOptions: Array<DropdownOption> = flatOptions.filter(
    (option: DropdownOption): boolean => {
      return props.selectedAttributeKeys.includes(option.value.toString());
    },
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
        Loading service scope recommendations and recent trace attribute metrics...
      </div>
    );
  }

  const lookbackHours: number =
    catalog?.lookbackHours || DEFAULT_SERVICE_SCOPE_ATTRIBUTE_LOOKBACK_HOURS;
  const observedAttributeCount: number = catalog?.observedAttributes.length || 0;
  const activeServiceCount: number = catalog?.activeServiceCount || 0;
  const selectedModeLabel: string =
    props.selectedAttributeKeys.length > 0 ? "Custom" : "Defaults";

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {isFallbackCatalog && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Using the legacy trace attribute catalog. Detailed coverage and value-count
          metrics will appear here after the new catalog endpoint is deployed.
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 px-4 py-4 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-200 pb-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Scope selector plan
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {props.selectedAttributeKeys.length > 0
                ? "Custom selections override the default fast selectors. Keep Environment and Version selected if you still want them in Service View."
                : `Empty selection keeps the default fast selectors: ${defaultAttributeKeys
                    .map((key: string): string => {
                      return getAttributeDisplayLabel(key);
                    })
                    .join(", ")}. Add more keys only when operators need another drilldown.`}
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
            {selectedModeLabel} mode
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Active selectors
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {effectiveAttributeKeys.length}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {effectiveAttributeKeys
                .map((key: string): string => {
                  return getAttributeDisplayLabel(key);
                })
                .join(" · ")}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Active services
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {activeServiceCount || "—"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Services seen in the last {lookbackHours}h of aggregated trace data.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Observed keys
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {observedAttributeCount}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Project-wide trace attributes available for consideration.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Lookback window
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {lookbackHours}h
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Recent enough for active keys, small enough to stay responsive.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Current plan</h3>
              <p className="mt-1 text-sm text-gray-600">
                These keys are currently powering the fast service scope selectors.
              </p>
            </div>
            <span className="text-xs text-gray-500">
              {props.selectedAttributeKeys.length > 0 ? "Custom selection" : "Default fallback"}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {effectiveAttributeKeys.map((attributeKey: string): ReactElement => {
              const definition = getRecommendedAttributeDefinition(attributeKey);
              const entry: ServiceScopeAttributeCatalogEntry | undefined =
                observedAttributeMap.get(attributeKey);
              const reasons: Array<string> = [
                ...(definition?.recommendedReasons || [
                  "Custom keys are best when operators already think in this dimension during incident triage.",
                ]),
                ...getAttributeDynamicReasons(
                  entry || {
                    attributeKey,
                    activeServiceCount: null,
                    distinctValueCount: null,
                    sampleCount: null,
                    lastSeenBucket: null,
                  },
                  activeServiceCount,
                  lookbackHours,
                ),
              ];

              if (definition?.queryAliases?.length) {
                reasons.splice(
                  1,
                  0,
                  `Normalizes ${definition.queryAliases.length} common attribute aliases into one selector key.`,
                );
              }

              return (
                <div
                  key={attributeKey}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {definition?.label || getAttributeDisplayLabel(attributeKey)}
                        </h4>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          Active
                        </span>
                        {definition?.isDefault && props.selectedAttributeKeys.length === 0 && (
                          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            Default
                          </span>
                        )}
                        <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {getSelectorFitLabel(
                            entry || {
                              attributeKey,
                              activeServiceCount: null,
                              distinctValueCount: null,
                              sampleCount: null,
                              lastSeenBucket: null,
                            },
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {definition?.shortDescription ||
                          "Custom selector for service scope drilldowns."}
                      </p>
                      <p className="mt-1 font-mono text-xs text-gray-500">
                        {attributeKey}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 md:max-w-xs">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Expected impact
                      </p>
                      <p className="mt-1 font-medium text-gray-900">
                        {getAttributeImpactSummary(
                          entry || {
                            attributeKey,
                            activeServiceCount: null,
                            distinctValueCount: null,
                            sampleCount: null,
                            lastSeenBucket: null,
                          },
                          activeServiceCount,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Selector role
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {definition?.selectorLabel || "Custom selector"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Recent values
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {entry?.distinctValueCount ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Services covered
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {entry?.activeServiceCount !== null &&
                        entry?.activeServiceCount !== undefined &&
                        activeServiceCount > 0
                          ? `${entry.activeServiceCount}/${activeServiceCount}`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-gray-700">
                    {reasons.slice(0, 5).map((reason: string): ReactElement => {
                      return (
                        <li key={reason} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                          <span>{reason}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-semibold text-gray-900">Recommended next</h3>
            <p className="mt-1 text-sm text-gray-600">
              These keys are usually the highest-leverage additions when operators
              need another fast service scope.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {RECOMMENDED_SERVICE_SCOPE_ATTRIBUTE_DEFINITIONS.filter(
              (definition) => {
                return !effectiveAttributeKeys.includes(definition.attributeKey);
              },
            ).map((definition): ReactElement => {
              const entry: ServiceScopeAttributeCatalogEntry | undefined =
                observedAttributeMap.get(definition.attributeKey);
              const reasons: Array<string> = [
                ...definition.recommendedReasons,
                ...getAttributeDynamicReasons(
                  entry || {
                    attributeKey: definition.attributeKey,
                    activeServiceCount: null,
                    distinctValueCount: null,
                    sampleCount: null,
                    lastSeenBucket: null,
                  },
                  activeServiceCount,
                  lookbackHours,
                ),
              ];

              if (definition.queryAliases?.length) {
                reasons.splice(
                  1,
                  0,
                  `Canonicalizes ${definition.queryAliases.length} different trace keys into the same selector.`,
                );
              }

              return (
                <div
                  key={definition.attributeKey}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {definition.label}
                        </h4>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Recommended
                        </span>
                        {definition.isDefault && (
                          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            Default when empty
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {definition.shortDescription}
                      </p>
                      <p className="mt-1 font-mono text-xs text-gray-500">
                        {definition.attributeKey}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 md:max-w-xs">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        If you add this key
                      </p>
                      <p className="mt-1 font-medium text-gray-900">
                        {getAttributeImpactSummary(
                          entry || {
                            attributeKey: definition.attributeKey,
                            activeServiceCount: null,
                            distinctValueCount: null,
                            sampleCount: null,
                            lastSeenBucket: null,
                          },
                          activeServiceCount,
                        )}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-gray-700">
                    {reasons.slice(0, 5).map((reason: string): ReactElement => {
                      return (
                        <li key={reason} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          <span>{reason}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Browse the project trace catalog
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Search across recommended keys and every trace attribute observed in the
            project. Option descriptions summarize recent service coverage and value
            count so you can judge whether a key will stay usable as a selector.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Dropdown
            isMultiSelect={true}
            options={options}
            value={selectedOptions}
            placeholder="Select service scope attributes"
            onChange={(value: DropdownValue | Array<DropdownValue> | null) => {
              const keys: Array<string> = Array.isArray(value)
                ? value.map((entry: DropdownValue): string => {
                    return entry.toString();
                  })
                : value !== null && value !== undefined
                  ? [value.toString()]
                  : [];

              props.onChange(keys);
            }}
          />

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-xs text-gray-600">
            <p className="font-medium text-gray-700">
              Empty selection uses the default fast selectors.
            </p>
            <p className="mt-1">
              Defaults currently resolve to {defaultAttributeKeys.length} key
              {defaultAttributeKeys.length === 1 ? "" : "s"}: {defaultAttributeKeys
                .map((key: string): string => {
                  return getAttributeDisplayLabel(key);
                })
                .join(", ")}. Add extra keys only when their drilldown value is worth
              the additional selector surface area.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProjectTelemetryScopeAttributePicker;
