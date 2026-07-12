import { getServiceBreadcrumbs } from "../../../Utils/Breadcrumbs";
import { RouteUtil } from "../../../Utils/RouteMap";
import PageComponentProps from "../../PageComponentProps";
import SideMenu from "./SideMenu";
import { APP_API_URL } from "Common/UI/Config";
import Service from "Common/Models/DatabaseModels/Service";
import HTTPErrorResponse from "Common/Types/API/HTTPErrorResponse";
import HTTPResponse from "Common/Types/API/HTTPResponse";
import URL from "Common/Types/API/URL";
import { JSONObject } from "Common/Types/JSON";
import ObjectID from "Common/Types/ObjectID";
import API from "Common/UI/Utils/API/API";
import ModelPage from "Common/UI/Components/Page/ModelPage";
import ModelAPI from "Common/UI/Utils/ModelAPI/ModelAPI";
import Navigation from "Common/UI/Utils/Navigation";
import React, {
  FunctionComponent,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Outlet, useParams } from "react-router-dom";
import EnvironmentSelector from "./EnvironmentSelector";
import VersionSelector from "./VersionSelector";
import {
  getValidServiceScopeValue,
  normalizeServiceEnvironment,
  normalizeServiceVersion,
  readServiceTelemetryScopeFromUrl,
  ServiceTelemetryScopeContext,
  writeServiceTelemetryScopeToUrl,
} from "./environmentScope";

const SERVICE_SCOPE_LOOKBACK_HOURS: number = 6;

const ServiceViewLayout: FunctionComponent<
  PageComponentProps
> = (): ReactElement => {
  const { id } = useParams();
  const modelId: ObjectID = new ObjectID(id || "");
  const modelIdString: string = modelId.toString();
  const path: string = Navigation.getRoutePath(RouteUtil.getRoutes());
  const initialScope = useMemo(readServiceTelemetryScopeFromUrl, []);

  const [selectedEnvironment, setSelectedEnvironmentState] = useState<string>(
    initialScope.environment,
  );
  const [selectedVersion, setSelectedVersionState] = useState<string>(
    initialScope.version,
  );
  const [availableEnvironments, setAvailableEnvironments] = useState<
    Array<string>
  >([]);
  const [availableVersions, setAvailableVersions] = useState<Array<string>>([]);
  const [hasResolvedScopeOptions, setHasResolvedScopeOptions] =
    useState<boolean>(false);

  const writeScope: (environment: string, version: string) => void = useCallback(
    (environment: string, version: string): void => {
      const nextEnvironment: string = normalizeServiceEnvironment(environment);
      const nextVersion: string = normalizeServiceVersion(version);

      setSelectedEnvironmentState(nextEnvironment);
      setSelectedVersionState(nextVersion);
      writeServiceTelemetryScopeToUrl({
        environment: nextEnvironment,
        version: nextVersion,
      });
    },
    [],
  );

  const setSelectedEnvironment: (environment: string) => void = useCallback(
    (environment: string): void => {
      writeScope(environment, selectedVersion);
    },
    [selectedVersion, writeScope],
  );

  const setSelectedVersion: (version: string) => void = useCallback(
    (version: string): void => {
      writeScope(selectedEnvironment, version);
    },
    [selectedEnvironment, writeScope],
  );

  useEffect(() => {
    setHasResolvedScopeOptions(false);
    setAvailableEnvironments([]);
    setAvailableVersions([]);

    let cancelled: boolean = false;

    const seedMetadataOptions: (item: Service | null) => {
      environments: Array<string>;
      versions: Array<string>;
    } = (item: Service | null) => {
      const environments: Array<string> = [];
      const deploymentEnvironment: string = normalizeServiceEnvironment(
        item?.deploymentEnvironment,
      );

      if (deploymentEnvironment) {
        environments.push(deploymentEnvironment);
      }

      const versions: Array<string> = [];
      const serviceVersion: string = normalizeServiceVersion(item?.serviceVersion);

      if (serviceVersion) {
        versions.push(serviceVersion);
      }

      return { environments, versions };
    };

    const readScopeOptionsResponse: (
      response: HTTPResponse<JSONObject> | HTTPErrorResponse,
      key: string,
    ) => Array<string> = (
      response: HTTPResponse<JSONObject> | HTTPErrorResponse,
      key: string,
    ): Array<string> => {
      if (response instanceof HTTPErrorResponse) {
        return [];
      }

      return ((response.data["attributes"] || {}) as Record<string, Array<string>>)[
        key
      ] || [];
    };

    const normalizeDistinctValues: (
      values: Array<string>,
      normalizer: (value: string | null | undefined) => string,
      sort: (a: string, b: string) => number,
    ) => Array<string> = (
      values: Array<string>,
      normalizer: (value: string | null | undefined) => string,
      sort: (a: string, b: string) => number,
    ): Array<string> => {
      return Array.from(
        new Set(
          values
            .map((value: string): string => {
              return normalizer(value);
            })
            .filter((value: string): boolean => {
              return Boolean(value);
            }),
        ),
      ).sort(sort);
    };

    const loadScopeOptionsFromMvApi: () => Promise<{
      environments: Array<string>;
      versions: Array<string>;
    }> = async (): Promise<{
      environments: Array<string>;
      versions: Array<string>;
    }> => {
      const requestHeaders: Record<string, string> = ModelAPI.getCommonHeaders();
      const now: Date = new Date();
      const lookbackStartTime: Date = new Date(
        now.getTime() - SERVICE_SCOPE_LOOKBACK_HOURS * 60 * 60 * 1000,
      );

      const response: HTTPResponse<JSONObject> | HTTPErrorResponse =
        await API.post({
          url: URL.fromString(APP_API_URL.toString()).addRoute(
            "/telemetry/traces/service-scope-options",
          ),
          data: {
            serviceId: modelId.toString(),
            startTime: lookbackStartTime,
            endTime: now,
          },
          headers: requestHeaders,
        });

      return {
        environments: readScopeOptionsResponse(
          response,
          "resource.deployment.environment",
        ),
        versions: readScopeOptionsResponse(response, "resource.service.version"),
      };
    };

    const loadScopeOptionsFromRawAnalytics: () => Promise<{
      environments: Array<string>;
      versions: Array<string>;
    }> = async (): Promise<{
      environments: Array<string>;
      versions: Array<string>;
    }> => {
      const requestHeaders: Record<string, string> = ModelAPI.getCommonHeaders();
      const now: Date = new Date();
      const lookbackStartTime: Date = new Date(
        now.getTime() - SERVICE_SCOPE_LOOKBACK_HOURS * 60 * 60 * 1000,
      );
      const scopeRequestBase: JSONObject = {
        chartType: "toplist",
        metric: "count",
        startTime: lookbackStartTime,
        endTime: now,
        serviceIds: [modelId.toString()],
        limit: 100,
      };

      const [
        canonicalEnvironmentResponse,
        namedEnvironmentResponse,
        labeledEnvironmentResponse,
        versionResponse,
      ]: [
        HTTPResponse<JSONObject> | HTTPErrorResponse,
        HTTPResponse<JSONObject> | HTTPErrorResponse,
        HTTPResponse<JSONObject> | HTTPErrorResponse,
        HTTPResponse<JSONObject> | HTTPErrorResponse,
      ] = await Promise.all([
        API.post({
          url: URL.fromString(APP_API_URL.toString()).addRoute(
            "/telemetry/traces/analytics",
          ),
          data: {
            ...scopeRequestBase,
            groupBy: ["resource.deployment.environment"],
          },
          headers: requestHeaders,
        }),
        API.post({
          url: URL.fromString(APP_API_URL.toString()).addRoute(
            "/telemetry/traces/analytics",
          ),
          data: {
            ...scopeRequestBase,
            groupBy: ["resource.deployment.environment.name"],
          },
          headers: requestHeaders,
        }),
        API.post({
          url: URL.fromString(APP_API_URL.toString()).addRoute(
            "/telemetry/traces/analytics",
          ),
          data: {
            ...scopeRequestBase,
            groupBy: ["resource.oneuptime.label.env"],
          },
          headers: requestHeaders,
        }),
        API.post({
          url: URL.fromString(APP_API_URL.toString()).addRoute(
            "/telemetry/traces/analytics",
          ),
          data: {
            ...scopeRequestBase,
            groupBy: ["resource.service.version"],
          },
          headers: requestHeaders,
        }),
      ]);

      return {
        environments: [
          ...readTopListValues(canonicalEnvironmentResponse),
          ...readTopListValues(namedEnvironmentResponse),
          ...readTopListValues(labeledEnvironmentResponse),
        ],
        versions: readTopListValues(versionResponse),
      };
    };

    const loadScopeMetadata: () => Promise<void> = async (): Promise<void> => {
      let seededOptions: { environments: Array<string>; versions: Array<string> } =
        {
          environments: [],
          versions: [],
        };

      try {
        const metadataItem: Service | null = await ModelAPI.getItem({
          modelType: Service,
          id: modelId,
          select: {
            deploymentEnvironment: true,
            serviceVersion: true,
          },
        });

        if (cancelled) {
          return;
        }

        seededOptions = seedMetadataOptions(metadataItem);
      } catch {
        if (cancelled) {
          return;
        }
      }

      try {
        let scopeOptions: {
          environments: Array<string>;
          versions: Array<string>;
        } = await loadScopeOptionsFromMvApi();

        if (
          scopeOptions.environments.length === 0 &&
          scopeOptions.versions.length === 0
        ) {
          scopeOptions = await loadScopeOptionsFromRawAnalytics();
        }

        if (cancelled) {
          return;
        }

        setAvailableEnvironments(
          normalizeDistinctValues(
            [...seededOptions.environments, ...scopeOptions.environments],
            normalizeServiceEnvironment,
            (a: string, b: string): number => {
              return a.localeCompare(b);
            },
          ),
        );

        setAvailableVersions(
          normalizeDistinctValues(
            [...seededOptions.versions, ...scopeOptions.versions],
            normalizeServiceVersion,
            (a: string, b: string): number => {
              return a.localeCompare(b, undefined, { numeric: true });
            },
          ),
        );
        setHasResolvedScopeOptions(true);
      } catch {
        if (!cancelled) {
          setAvailableEnvironments(seededOptions.environments);
          setAvailableVersions(seededOptions.versions);
          setHasResolvedScopeOptions(true);
        }
      }
    };

    void loadScopeMetadata();

    return () => {
      cancelled = true;
    };
  }, [modelIdString]);

  useEffect(() => {
    if (!hasResolvedScopeOptions) {
      return;
    }

    const nextSelectedEnvironment: string = getValidServiceScopeValue(
      selectedEnvironment,
      availableEnvironments,
    );
    const nextSelectedVersion: string = getValidServiceScopeValue(
      selectedVersion,
      availableVersions,
    );

    if (
      nextSelectedEnvironment !== normalizeServiceEnvironment(selectedEnvironment) ||
      nextSelectedVersion !== normalizeServiceVersion(selectedVersion)
    ) {
      writeScope(nextSelectedEnvironment, nextSelectedVersion);
    }
  }, [
    availableEnvironments,
    availableVersions,
    hasResolvedScopeOptions,
    selectedEnvironment,
    selectedVersion,
    writeScope,
  ]);

  const telemetryScope: ServiceTelemetryScopeContext = {
    selectedEnvironment,
    setSelectedEnvironment,
    selectedVersion,
    setSelectedVersion,
  };

  const showScopeToolbar: boolean = true;

  return (
    <ModelPage
      title="Service"
      modelType={Service}
      modelId={modelId}
      modelNameField="name"
      breadcrumbLinks={getServiceBreadcrumbs(path)}
      sideMenu={
        <SideMenu
          modelId={modelId}
          selectedEnvironment={selectedEnvironment}
          selectedVersion={selectedVersion}
        />
      }
    >
      {showScopeToolbar && (
        <div className="rounded-lg border border-gray-200 bg-white/80 px-3 py-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Telemetry Scope
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:justify-end">
              <EnvironmentSelector
                availableEnvironments={availableEnvironments}
                selectedEnvironment={selectedEnvironment}
                onChange={setSelectedEnvironment}
              />
              <VersionSelector
                availableVersions={availableVersions}
                selectedVersion={selectedVersion}
                onChange={setSelectedVersion}
              />
            </div>
          </div>
        </div>
      )}
      <Outlet context={telemetryScope} />
    </ModelPage>
  );
};

export default ServiceViewLayout;
