import CloudflareIntegration from "Common/Models/DatabaseModels/CloudflareIntegration";
import { JSONArray, JSONObject } from "Common/Types/JSON";
import { CloudflareHttpMetricRow } from "./CloudflareGraphQLClient";

const OTEL_DELTA_TEMPORALITY: string = "AGGREGATION_TEMPORALITY_DELTA";
const NANOS_PER_MILLISECOND: bigint = BigInt(1000000);

export interface CloudflareAdapterResult {
  deduplicationKey: string;
  otlpMetricsPayload: JSONObject;
  syncedUntil: Date;
}

export default class CloudflareMetricsAdapter {
  public static buildOtlpMetrics(data: {
    integration: CloudflareIntegration;
    rows: Array<CloudflareHttpMetricRow>;
    start: Date;
    end: Date;
  }): CloudflareAdapterResult {
    const metrics: JSONArray = [];

    for (const row of data.rows) {
      const metricTime: Date = row.dimensions?.datetimeMinute
        ? new Date(row.dimensions.datetimeMinute)
        : data.end;
      const timeUnixNano: string = this.toUnixNanoString(metricTime);
      const attributes: JSONArray = this.buildDatapointAttributes(row);

      const requestCount: number | null = this.toFiniteNumber(row.count);
      if (requestCount !== null) {
        metrics.push(
          this.buildSumMetric({
            name: "cloudflare.requests",
            unit: "1",
            value: requestCount,
            timeUnixNano,
            attributes,
          }),
        );
      }

      const bandwidthBytes: number | null = this.toFiniteNumber(
        row.sum?.edgeResponseBytes,
      );
      if (bandwidthBytes !== null) {
        metrics.push(
          this.buildSumMetric({
            name: "cloudflare.bandwidth.bytes",
            unit: "By",
            value: bandwidthBytes,
            timeUnixNano,
            attributes,
          }),
        );
      }
    }

    return {
      deduplicationKey: `cloudflare:${data.integration.id?.toString()}:${data.integration.cloudflareZoneId}:${data.start.toISOString()}:${data.end.toISOString()}`,
      syncedUntil: data.end,
      otlpMetricsPayload: {
        resourceMetrics: [
          {
            resource: {
              attributes: [
                this.stringAttribute(
                  "service.name",
                  `cloudflare/${data.integration.cloudflareZoneName || data.integration.cloudflareZoneId}`,
                ),
                this.stringAttribute("cloud.provider", "cloudflare"),
                this.stringAttribute(
                  "cloudflare.account.id",
                  data.integration.cloudflareAccountId || "",
                ),
                this.stringAttribute(
                  "cloudflare.zone.id",
                  data.integration.cloudflareZoneId || "",
                ),
                this.stringAttribute(
                  "cloudflare.zone.name",
                  data.integration.cloudflareZoneName || "",
                ),
              ],
            },
            scopeMetrics: [
              {
                scope: {
                  name: "oneuptime-cloudflare-integration",
                },
                metrics,
              },
            ],
          },
        ],
      },
    };
  }

  private static buildSumMetric(data: {
    name: string;
    unit: string;
    value: number;
    timeUnixNano: string;
    attributes: JSONArray;
  }): JSONObject {
    return {
      name: data.name,
      unit: data.unit,
      sum: {
        aggregationTemporality: OTEL_DELTA_TEMPORALITY,
        isMonotonic: true,
        dataPoints: [
          {
            timeUnixNano: data.timeUnixNano,
            asDouble: data.value,
            attributes: data.attributes,
          },
        ],
      },
    };
  }

  private static buildDatapointAttributes(
    row: CloudflareHttpMetricRow,
  ): JSONArray {
    const attributes: JSONArray = [];

    if (row.dimensions?.clientRequestHTTPHost) {
      attributes.push(
        this.stringAttribute(
          "cloudflare.host",
          row.dimensions.clientRequestHTTPHost,
        ),
      );
    }

    if (row.dimensions?.cacheStatus) {
      attributes.push(
        this.stringAttribute(
          "cloudflare.cache_status",
          row.dimensions.cacheStatus,
        ),
      );
    }

    const statusCode: number | null = this.toFiniteNumber(
      row.dimensions?.edgeResponseStatus,
    );
    if (statusCode !== null) {
      attributes.push({
        key: "http.response.status_code",
        value: { intValue: Math.trunc(statusCode) },
      });
    }

    return attributes;
  }

  private static stringAttribute(key: string, value: string): JSONObject {
    return {
      key,
      value: { stringValue: value },
    };
  }

  private static toUnixNanoString(date: Date): string {
    return (BigInt(date.getTime()) * NANOS_PER_MILLISECOND).toString();
  }

  private static toFiniteNumber(
    value: number | string | undefined,
  ): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    const parsed: number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
