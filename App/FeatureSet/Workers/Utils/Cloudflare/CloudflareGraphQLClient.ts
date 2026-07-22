import axios, { AxiosResponse } from "axios";
import { JSONObject } from "Common/Types/JSON";

const CLOUDFLARE_GRAPHQL_ENDPOINT: string =
  "https://api.cloudflare.com/client/v4/graphql";

const CLOUDFLARE_REST_ENDPOINT: string = "https://api.cloudflare.com/client/v4";

export interface CloudflareMetricSelection {
  collectWebAnalyticsMetrics?: boolean | undefined;
  collectDnsMetrics?: boolean | undefined;
  collectLoadBalancerMetrics?: boolean | undefined;
  collectWorkerScriptMetrics?: boolean | undefined;
  collectRealtimeWebAnalyticsMetrics?: boolean | undefined;
}

export interface CloudflareWebMetricRow {
  dimensions?: {
    datetimeMinute?: string | undefined;
  };
  sum?: {
    requests?: number | string | undefined;
    bytes?: number | string | undefined;
    cachedRequests?: number | string | undefined;
    cachedBytes?: number | string | undefined;
  };
}

export interface CloudflareDashboardBandwidthMetricRow {
  dimensions?: {
    datetimeMinute?: string | undefined;
  };
  sum?: {
    bytes?: number | string | undefined;
  };
}

export interface CloudflareRealtimeWebMetricRow {
  count?: number | string | undefined;
  dimensions?: {
    datetimeMinute?: string | undefined;
    clientRequestHTTPHost?: string | undefined;
    edgeResponseStatus?: number | string | undefined;
    cacheStatus?: string | undefined;
  };
  sum?: {
    edgeResponseBytes?: number | string | undefined;
  };
}

export interface CloudflareDnsMetricRow {
  count?: number | string | undefined;
  dimensions?: {
    datetimeMinute?: string | undefined;
    queryType?: string | undefined;
    responseCode?: string | undefined;
    responseCached?: number | string | undefined;
  };
  sum?: {
    countNotCachedAndNotStale?: number | string | undefined;
    countStale?: number | string | undefined;
  };
}

export interface CloudflareLoadBalancerMetricRow {
  count?: number | string | undefined;
  dimensions?: {
    datetimeMinute?: string | undefined;
    lbName?: string | undefined;
    selectedPoolName?: string | undefined;
    selectedOriginName?: string | undefined;
    errorType?: string | undefined;
  };
  sum?: {
    ruleMatches?: number | string | undefined;
    totalRequestsWithRule?: number | string | undefined;
  };
}

export interface CloudflareWorkerMetricRow {
  dimensions?: {
    datetimeMinute?: string | undefined;
    constantScriptId?: string | undefined;
    status?: string | undefined;
    httpResponseStatus?: number | string | undefined;
  };
  sum?: {
    requests?: number | string | undefined;
    responseBodySize?: number | string | undefined;
    subrequests?: number | string | undefined;
    totalCpuTime?: number | string | undefined;
  };
}

export interface CloudflareMetricsResult {
  webRows: Array<CloudflareWebMetricRow>;
  dashboardBandwidthRows: Array<CloudflareDashboardBandwidthMetricRow>;
  dnsRows: Array<CloudflareDnsMetricRow>;
  loadBalancerRows: Array<CloudflareLoadBalancerMetricRow>;
  workerRows: Array<CloudflareWorkerMetricRow>;
  realtimeWebRows: Array<CloudflareRealtimeWebMetricRow>;
}

export interface CloudflareZone {
  id: string;
  name: string;
  accountId: string;
}

interface CloudflareZoneResponse {
  result?: Array<{
    id?: string | undefined;
    name?: string | undefined;
    account?: {
      id?: string | undefined;
    };
  }>;
  result_info?: {
    page?: number | undefined;
    total_pages?: number | undefined;
  };
  errors?: Array<{
    message?: string;
  }>;
}

interface CloudflareGraphQLZone {
  httpRequests1mGroups?: Array<CloudflareWebMetricRow> | undefined;
  dashboardBandwidthGroups?:
    | Array<CloudflareDashboardBandwidthMetricRow>
    | undefined;
  dnsAnalyticsAdaptiveGroups?: Array<CloudflareDnsMetricRow> | undefined;
  loadBalancingRequestsAdaptiveGroups?:
    | Array<CloudflareLoadBalancerMetricRow>
    | undefined;
  workersZoneInvocationsAdaptiveGroups?:
    | Array<CloudflareWorkerMetricRow>
    | undefined;
  httpRequestsAdaptiveGroups?:
    | Array<CloudflareRealtimeWebMetricRow>
    | undefined;
}

interface CloudflareGraphQLResponse {
  data?: {
    viewer?: {
      zones?: Array<CloudflareGraphQLZone>;
    };
  };
  errors?: Array<{
    message?: string;
  }>;
}

export default class CloudflareGraphQLClient {
  public static async getZones(
    apiToken: string,
  ): Promise<Array<CloudflareZone>> {
    const zones: Array<CloudflareZone> = [];
    let page: number = 1;
    let totalPages: number = 1;

    do {
      const response: AxiosResponse<CloudflareZoneResponse> = await axios.get(
        `${CLOUDFLARE_REST_ENDPOINT}/zones`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          params: {
            page: page,
            per_page: 50,
          },
          timeout: 30_000,
        },
      );

      if (response.data.errors && response.data.errors.length > 0) {
        throw new Error(
          response.data.errors
            .map((error: { message?: string }) => {
              return error.message || "Unknown Cloudflare API error";
            })
            .join("; "),
        );
      }

      for (const zone of response.data.result || []) {
        if (zone.id && zone.name && zone.account?.id) {
          zones.push({
            id: zone.id,
            name: zone.name,
            accountId: zone.account.id,
          });
        }
      }

      totalPages = response.data.result_info?.total_pages || page;
      page = page + 1;
    } while (page <= totalPages);

    return zones;
  }

  public static async getMetrics(data: {
    apiToken: string;
    zoneId: string;
    start: Date;
    end: Date;
    selection: CloudflareMetricSelection;
  }): Promise<CloudflareMetricsResult> {
    const queryBody: string = this.buildQuery(data.selection);

    if (!queryBody) {
      return this.emptyResult();
    }

    const response: AxiosResponse<CloudflareGraphQLResponse> = await axios.post(
      CLOUDFLARE_GRAPHQL_ENDPOINT,
      {
        query: `query OneUptimeCloudflareMetrics($zoneTag: string, $start: Time, $end: Time) {
          viewer {
            zones(filter: { zoneTag: $zoneTag }) {
              ${queryBody}
            }
          }
        }`,
        variables: {
          zoneTag: data.zoneId,
          start: data.start.toISOString(),
          end: data.end.toISOString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${data.apiToken}`,
          "Content-Type": "application/json",
        },
        timeout: 30_000,
      },
    );

    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(
        response.data.errors
          .map((error: { message?: string }) => {
            return error.message || "Unknown Cloudflare GraphQL error";
          })
          .join("; "),
      );
    }

    const zones: Array<CloudflareGraphQLZone> | undefined =
      response.data.data?.viewer?.zones;

    if (!zones || zones.length === 0) {
      return this.emptyResult();
    }

    const result: CloudflareMetricsResult = this.emptyResult();

    for (const zone of zones) {
      result.webRows.push(...(zone.httpRequests1mGroups || []));
      result.dashboardBandwidthRows.push(
        ...(zone.dashboardBandwidthGroups || []),
      );
      result.dnsRows.push(...(zone.dnsAnalyticsAdaptiveGroups || []));
      result.loadBalancerRows.push(
        ...(zone.loadBalancingRequestsAdaptiveGroups || []),
      );
      result.workerRows.push(
        ...(zone.workersZoneInvocationsAdaptiveGroups || []),
      );
      result.realtimeWebRows.push(...(zone.httpRequestsAdaptiveGroups || []));
    }

    return result;
  }

  private static buildQuery(selection: CloudflareMetricSelection): string {
    const queryParts: Array<string> = [];

    if (selection.collectWebAnalyticsMetrics !== false) {
      queryParts.push(`httpRequests1mGroups(
        limit: 10000
        filter: { datetime_geq: $start, datetime_lt: $end }
        orderBy: [datetimeMinute_ASC]
      ) {
        dimensions { datetimeMinute }
        sum { requests bytes cachedRequests cachedBytes }
      }`);
      queryParts.push(`dashboardBandwidthGroups: httpRequestsOverviewAdaptiveGroups(
        limit: 10000
        filter: { datetime_geq: $start, datetime_lt: $end }
      ) {
        dimensions { datetimeMinute }
        sum { bytes }
      }`);
    }

    if (selection.collectDnsMetrics) {
      queryParts.push(`dnsAnalyticsAdaptiveGroups(
        limit: 10000
        filter: { datetime_geq: $start, datetime_lt: $end }
        orderBy: [datetimeMinute_ASC]
      ) {
        count
        dimensions { datetimeMinute queryType responseCode responseCached }
        sum { countNotCachedAndNotStale countStale }
      }`);
    }

    if (selection.collectLoadBalancerMetrics) {
      queryParts.push(`loadBalancingRequestsAdaptiveGroups(
        limit: 10000
        filter: { datetime_geq: $start, datetime_lt: $end }
        orderBy: [datetimeMinute_ASC]
      ) {
        count
        dimensions { datetimeMinute lbName selectedPoolName selectedOriginName errorType }
        sum { ruleMatches totalRequestsWithRule }
      }`);
    }

    if (selection.collectWorkerScriptMetrics) {
      queryParts.push(`workersZoneInvocationsAdaptiveGroups(
        limit: 10000
        filter: { datetime_geq: $start, datetime_lt: $end }
        orderBy: [datetimeMinute_ASC]
      ) {
        dimensions { datetimeMinute constantScriptId status httpResponseStatus }
        sum { requests responseBodySize subrequests totalCpuTime }
      }`);
    }

    if (selection.collectRealtimeWebAnalyticsMetrics) {
      queryParts.push(`httpRequestsAdaptiveGroups(
        limit: 10000
        filter: { datetime_geq: $start, datetime_lt: $end }
        orderBy: [datetimeMinute_ASC]
      ) {
        count
        dimensions { datetimeMinute clientRequestHTTPHost edgeResponseStatus cacheStatus }
        sum { edgeResponseBytes }
      }`);
    }

    return queryParts.join("\n");
  }

  private static emptyResult(): CloudflareMetricsResult {
    return {
      webRows: [],
      dashboardBandwidthRows: [],
      dnsRows: [],
      loadBalancerRows: [],
      workerRows: [],
      realtimeWebRows: [],
    };
  }
}

export function cloudflareErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData: JSONObject | undefined = error.response?.data as
      | JSONObject
      | undefined;
    return responseData
      ? JSON.stringify(responseData)
      : error.message || "Cloudflare request failed";
  }

  return error instanceof Error ? error.message : String(error);
}
