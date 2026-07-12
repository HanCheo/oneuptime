import Route from "Common/Types/API/Route";
import Navigation from "Common/UI/Utils/Navigation";

export const SERVICE_ENVIRONMENT_QUERY_PARAM: string = "env";
export const SERVICE_VERSION_QUERY_PARAM: string = "version";

export const SERVICE_ENVIRONMENT_ATTRIBUTE_KEY: string =
  "resource.deployment.environment";
export const SERVICE_VERSION_ATTRIBUTE_KEY: string = "resource.service.version";

export interface ServiceTelemetryScopeContext {
  selectedEnvironment: string;
  setSelectedEnvironment: (environment: string) => void;
  selectedVersion: string;
  setSelectedVersion: (version: string) => void;
}

export interface ServiceTelemetryScope {
  environment: string;
  version: string;
}

const normalizeServiceScopeValue: (
  value: string | null | undefined,
) => string = (value: string | null | undefined): string => {
  return (value || "").trim();
};

export const normalizeServiceEnvironment: (
  value: string | null | undefined,
) => string = normalizeServiceScopeValue;

export const normalizeServiceVersion: (
  value: string | null | undefined,
) => string = normalizeServiceScopeValue;

export const getValidServiceScopeValue: (
  value: string | null | undefined,
  availableValues: Array<string>,
) => string = (
  value: string | null | undefined,
  availableValues: Array<string>,
): string => {
  const normalizedValue: string = normalizeServiceScopeValue(value);

  if (!normalizedValue) {
    return "";
  }

  return availableValues.includes(normalizedValue) ? normalizedValue : "";
};

export const readServiceTelemetryScopeFromUrl: () => ServiceTelemetryScope =
  (): ServiceTelemetryScope => {
    return {
      environment: normalizeServiceEnvironment(
        Navigation.getQueryStringByName(SERVICE_ENVIRONMENT_QUERY_PARAM),
      ),
      version: normalizeServiceVersion(
        Navigation.getQueryStringByName(SERVICE_VERSION_QUERY_PARAM),
      ),
    };
  };

export const writeServiceTelemetryScopeToUrl: (
  scope: ServiceTelemetryScope,
) => void = (scope: ServiceTelemetryScope): void => {
  Navigation.setQueryString({
    [SERVICE_ENVIRONMENT_QUERY_PARAM]:
      normalizeServiceEnvironment(scope.environment) || null,
    [SERVICE_VERSION_QUERY_PARAM]: normalizeServiceVersion(scope.version) || null,
  });
};

export const withServiceTelemetryScopeRoute: (
  route: Route,
  scope: ServiceTelemetryScope,
) => Route = (route: Route, scope: ServiceTelemetryScope): Route => {
  const environment: string = normalizeServiceEnvironment(scope.environment);
  const version: string = normalizeServiceVersion(scope.version);

  if (!environment && !version) {
    return route;
  }

  const queryParts: Array<string> = [];

  if (environment) {
    queryParts.push(
      `${SERVICE_ENVIRONMENT_QUERY_PARAM}=${encodeURIComponent(environment)}`,
    );
  }

  if (version) {
    queryParts.push(
      `${SERVICE_VERSION_QUERY_PARAM}=${encodeURIComponent(version)}`,
    );
  }

  const routeString: string = route.toString();
  const separator: string = routeString.includes("?") ? "&" : "?";

  return new Route(`${routeString}${separator}${queryParts.join("&")}`);
};

export const getServiceTelemetryAttributeFilters: (
  scope: ServiceTelemetryScope,
) => Record<string, string> | undefined = (
  scope: ServiceTelemetryScope,
): Record<string, string> | undefined => {
  const attributes: Record<string, string> = {};
  const environment: string = normalizeServiceEnvironment(scope.environment);
  const version: string = normalizeServiceVersion(scope.version);

  if (environment) {
    attributes[SERVICE_ENVIRONMENT_ATTRIBUTE_KEY] = environment;
  }

  if (version) {
    attributes[SERVICE_VERSION_ATTRIBUTE_KEY] = version;
  }

  return Object.keys(attributes).length > 0 ? attributes : undefined;
};

export const getServiceTelemetryAttributeFilterDisplayKeys: (
  scope: ServiceTelemetryScope,
) => Record<string, string> | undefined = (
  scope: ServiceTelemetryScope,
): Record<string, string> | undefined => {
  const displayKeys: Record<string, string> = {};

  if (normalizeServiceEnvironment(scope.environment)) {
    displayKeys[SERVICE_ENVIRONMENT_ATTRIBUTE_KEY] = "Environment";
  }

  if (normalizeServiceVersion(scope.version)) {
    displayKeys[SERVICE_VERSION_ATTRIBUTE_KEY] = "Version";
  }

  return Object.keys(displayKeys).length > 0 ? displayKeys : undefined;
};
