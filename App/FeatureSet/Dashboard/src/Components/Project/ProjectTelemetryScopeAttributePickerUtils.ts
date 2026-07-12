import OneUptimeDate from "Common/Types/Date";

export interface ServiceScopeAttributeCatalogEntry {
  attributeKey: string;
  activeServiceCount: number | null;
  distinctValueCount: number | null;
  sampleCount: number | null;
  lastSeenBucket: string | null;
}

export interface ServiceScopeAttributeCatalogResponse {
  lookbackHours: number;
  defaultAttributeKeys: Array<string>;
  activeServiceCount: number;
  observedAttributes: Array<ServiceScopeAttributeCatalogEntry>;
}

export interface RecommendedServiceScopeAttributeDefinition {
  attributeKey: string;
  label: string;
  selectorLabel: string;
  shortDescription: string;
  recommendedReasons: Array<string>;
  queryAliases?: Array<string> | undefined;
  isDefault: boolean;
}

export const DEFAULT_SERVICE_SCOPE_ATTRIBUTE_KEYS: Array<string> = [
  "resource.deployment.environment",
  "resource.service.version",
];

export const DEFAULT_SERVICE_SCOPE_ATTRIBUTE_LOOKBACK_HOURS: number = 24;

export const RECOMMENDED_SERVICE_SCOPE_ATTRIBUTE_DEFINITIONS: Array<RecommendedServiceScopeAttributeDefinition> =
  [
    {
      attributeKey: "resource.deployment.environment",
      label: "Environment",
      selectorLabel: "Environment selector",
      shortDescription:
        "Best first cut for separating prod, stg, qa, and dev traffic.",
      recommendedReasons: [
        "Usually low-cardinality, so the dropdown stays small and fast to scan.",
        "The backend folds common environment aliases into one canonical selector.",
        "Helpful for isolating prod-only incidents before drilling into a specific deployment.",
      ],
      queryAliases: [
        "resource.deployment.environment",
        "resource.deployment.environment.name",
        "resource.oneuptime.label.env",
      ],
      isDefault: true,
    },
    {
      attributeKey: "resource.service.version",
      label: "Version",
      selectorLabel: "Version selector",
      shortDescription:
        "Best deployment scope for isolating a specific release, image, or canary.",
      recommendedReasons: [
        'Directly answers "did this break after the deploy?".',
        "Pairs well with Environment to compare the same service across releases.",
        "Worth indexing even when cardinality is higher because operators usually search one concrete build or digest.",
      ],
      isDefault: true,
    },
    {
      attributeKey: "resource.k8s.namespace.name",
      label: "Kubernetes namespace",
      selectorLabel: "Namespace selector",
      shortDescription:
        "Useful when one project spans many namespaces, tenants, or workload slices.",
      recommendedReasons: [
        "Adds a clean infrastructure boundary when multiple teams share a cluster.",
        "Helps explain noisy service behavior caused by namespace-level config drift.",
        "Often stays low enough cardinality to remain comfortable as a dropdown.",
      ],
      isDefault: false,
    },
    {
      attributeKey: "resource.k8s.cluster.name",
      label: "Kubernetes cluster",
      selectorLabel: "Cluster selector",
      shortDescription:
        "Useful when the same service runs in more than one cluster or region.",
      recommendedReasons: [
        "Separates cluster-specific regressions from app-level regressions.",
        "Helpful for migration, failover, and multi-region comparisons.",
        "Usually a compact selector because cluster counts stay small.",
      ],
      isDefault: false,
    },
    {
      attributeKey: "service.namespace",
      label: "Service namespace",
      selectorLabel: "Service namespace selector",
      shortDescription:
        "Useful when service names repeat across business domains or logical namespaces.",
      recommendedReasons: [
        "Prevents similarly named services from collapsing into one broad scope.",
        "Helpful in shared platforms where naming is consistent but ownership differs.",
        "Usually complements existing service naming without exploding value count.",
      ],
      isDefault: false,
    },
  ];

export const selectedAttributeKeysFromFormValue = (
  value: unknown,
): Array<string> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry: unknown): string | undefined => {
      if (typeof entry !== "string") {
        return undefined;
      }

      const key: string = entry.trim();

      return key || undefined;
    })
    .filter((key: string | undefined): key is string => {
      return Boolean(key && key.trim());
    });
};

export const getEffectiveAttributeKeys = (
  selectedAttributeKeys: Array<string>,
  defaultAttributeKeys: Array<string>,
): Array<string> => {
  const normalizedSelectedKeys: Array<string> = selectedAttributeKeys.filter(
    (key: string): boolean => {
      return Boolean(key && key.trim());
    },
  );

  if (normalizedSelectedKeys.length > 0) {
    return Array.from(new Set(normalizedSelectedKeys));
  }

  return Array.from(new Set(defaultAttributeKeys));
};

export const getRecommendedAttributeDefinition = (
  attributeKey: string,
): RecommendedServiceScopeAttributeDefinition | undefined => {
  return RECOMMENDED_SERVICE_SCOPE_ATTRIBUTE_DEFINITIONS.find(
    (definition: RecommendedServiceScopeAttributeDefinition): boolean => {
      return definition.attributeKey === attributeKey;
    },
  );
};

export const getAttributeDisplayLabel = (attributeKey: string): string => {
  return getRecommendedAttributeDefinition(attributeKey)?.label || attributeKey;
};

export const formatCompactNumber = (
  value: number | null | undefined,
): string => {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
};

export const getAttributeCoveragePercent = (
  entry: ServiceScopeAttributeCatalogEntry,
  activeServiceCount: number,
): number | null => {
  if (
    !activeServiceCount ||
    entry.activeServiceCount === null ||
    entry.activeServiceCount <= 0
  ) {
    return null;
  }

  return Math.round((entry.activeServiceCount / activeServiceCount) * 100);
};

export const getSelectorFitLabel = (
  entry: ServiceScopeAttributeCatalogEntry,
): string => {
  if (entry.distinctValueCount === null) {
    return "Metrics pending";
  }

  if (entry.distinctValueCount <= 1) {
    return "Single-value scope";
  }

  if (entry.distinctValueCount <= 8) {
    return "Tight selector";
  }

  if (entry.distinctValueCount <= 25) {
    return "Healthy selector";
  }

  if (entry.distinctValueCount <= 100) {
    return "Wide selector";
  }

  return "High-cardinality selector";
};

export const getSelectorFitExplanation = (
  entry: ServiceScopeAttributeCatalogEntry,
): string => {
  if (entry.distinctValueCount === null) {
    return "This key was observed in traces, but impact metrics are not available from the deployed backend yet.";
  }

  if (entry.distinctValueCount <= 1) {
    return "This key currently exposes a single recent value, so it behaves more like metadata than a drilldown selector.";
  }

  if (entry.distinctValueCount <= 8) {
    return "This key stays compact enough to scan quickly and usually makes an excellent first-level scope selector.";
  }

  if (entry.distinctValueCount <= 25) {
    return "This key still fits comfortably in a dropdown while adding meaningful segmentation.";
  }

  if (entry.distinctValueCount <= 100) {
    return "This key is useful, but the selector will feel denser and may work better when operators already know what value they want.";
  }

  return "This key is highly variable. Keep it only if the operational benefit outweighs the extra selector density.";
};

export const getAttributeOptionDescription = (
  entry: ServiceScopeAttributeCatalogEntry,
  activeServiceCount: number,
  lookbackHours: number,
): string => {
  const coveragePercent: number | null = getAttributeCoveragePercent(
    entry,
    activeServiceCount,
  );
  const coverageText: string =
    coveragePercent !== null && entry.activeServiceCount !== null
      ? `${entry.activeServiceCount}/${activeServiceCount} services · ${coveragePercent}% coverage`
      : "Observed in recent traces";
  const valuesText: string =
    entry.distinctValueCount !== null
      ? `${entry.distinctValueCount} recent value${
          entry.distinctValueCount === 1 ? "" : "s"
        }`
      : `Impact metrics pending`;
  const lookbackText: string = `${lookbackHours}h window`;

  return `${coverageText} · ${valuesText} · ${lookbackText}`;
};

export const getAttributeImpactSummary = (
  entry: ServiceScopeAttributeCatalogEntry,
  activeServiceCount: number,
): string => {
  if (entry.distinctValueCount === null || entry.activeServiceCount === null) {
    return "Detailed impact metrics appear after the catalog endpoint is available.";
  }

  const coveragePercent: number | null = getAttributeCoveragePercent(
    entry,
    activeServiceCount,
  );

  if (coveragePercent === null) {
    return `Adds ${entry.distinctValueCount} recent value${
      entry.distinctValueCount === 1 ? "" : "s"
    } in the current lookback window.`;
  }

  return `Adds ${entry.distinctValueCount} recent value${
    entry.distinctValueCount === 1 ? "" : "s"
  } across ${entry.activeServiceCount}/${activeServiceCount} active services (${coveragePercent}% coverage).`;
};

export const getAttributeDynamicReasons = (
  entry: ServiceScopeAttributeCatalogEntry,
  activeServiceCount: number,
  lookbackHours: number,
): Array<string> => {
  const dynamicReasons: Array<string> = [
    getAttributeImpactSummary(entry, activeServiceCount),
    getSelectorFitExplanation(entry),
  ];

  if (entry.lastSeenBucket) {
    dynamicReasons.push(
      `Last seen ${OneUptimeDate.fromNow(
        OneUptimeDate.fromString(entry.lastSeenBucket),
      )} from the latest ${lookbackHours}h of aggregated trace data.`,
    );
  }

  if (entry.sampleCount !== null && entry.sampleCount > 0) {
    dynamicReasons.push(
      `${formatCompactNumber(entry.sampleCount)} aggregated span sample${
        entry.sampleCount === 1 ? "" : "s"
      } contributed to this key in the lookback window.`,
    );
  }

  return dynamicReasons;
};
