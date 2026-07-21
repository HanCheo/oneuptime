import axios, { AxiosResponse } from "axios";
import { JSONObject } from "Common/Types/JSON";

const CLOUDFLARE_GRAPHQL_ENDPOINT: string =
  "https://api.cloudflare.com/client/v4/graphql";

const HTTP_REQUESTS_QUERY: string = `query OneUptimeCloudflareHttpMetrics($zoneTag: string, $start: Time, $end: Time) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      httpRequestsAdaptiveGroups(
        limit: 10000
        filter: { datetime_geq: $start, datetime_lt: $end }
        orderBy: [datetimeMinute_ASC]
      ) {
        count
        dimensions {
          datetimeMinute
          clientRequestHTTPHost
          edgeResponseStatus
          cacheStatus
        }
        sum {
          edgeResponseBytes
        }
      }
    }
  }
}`;

export interface CloudflareHttpMetricRow {
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

interface CloudflareGraphQLResponse {
  data?: {
    viewer?: {
      zones?: Array<{
        httpRequestsAdaptiveGroups?: Array<CloudflareHttpMetricRow>;
      }>;
    };
  };
  errors?: Array<{
    message?: string;
  }>;
}

export default class CloudflareGraphQLClient {
  public static async getHttpMetrics(data: {
    apiToken: string;
    zoneId: string;
    start: Date;
    end: Date;
  }): Promise<Array<CloudflareHttpMetricRow>> {
    const response: AxiosResponse<CloudflareGraphQLResponse> = await axios.post(
      CLOUDFLARE_GRAPHQL_ENDPOINT,
      {
        query: HTTP_REQUESTS_QUERY,
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

    const zones:
      | Array<{
          httpRequestsAdaptiveGroups?: Array<CloudflareHttpMetricRow>;
        }>
      | undefined = response.data.data?.viewer?.zones;

    if (!zones || zones.length === 0) {
      return [];
    }

    const rows: Array<CloudflareHttpMetricRow> = [];
    for (const zone of zones) {
      rows.push(...(zone.httpRequestsAdaptiveGroups || []));
    }

    return rows;
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
