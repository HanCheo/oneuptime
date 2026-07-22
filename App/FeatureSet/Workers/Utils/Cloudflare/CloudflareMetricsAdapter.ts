import CloudflareIntegration from "Common/Models/DatabaseModels/CloudflareIntegration";
import { JSONArray, JSONObject } from "Common/Types/JSON";
import {
  CloudflareDashboardBandwidthMetricRow,
  CloudflareDnsMetricRow,
  CloudflareLoadBalancerMetricRow,
  CloudflareMetricsResult,
  CloudflareRealtimeWebMetricRow,
  CloudflareWebMetricRow,
  CloudflareWorkerMetricRow,
} from "./CloudflareGraphQLClient";

const OTEL_DELTA_TEMPORALITY: string = "AGGREGATION_TEMPORALITY_DELTA";
const NANOS_PER_MILLISECOND: bigint = BigInt(1000000);

export interface CloudflareAdapterResult {
  deduplicationKey: string;
  otlpMetricsPayload: JSONObject;
  syncedUntil: Date;
}

interface MetricPoint {
  name: string;
  unit: string;
  value: number | string | undefined;
  timeUnixNano: string;
  attributes: JSONArray;
}

export default class CloudflareMetricsAdapter {
  public static buildOtlpMetrics(data: {
    integration: CloudflareIntegration;
    metricsResult: CloudflareMetricsResult;
    start: Date;
    end: Date;
  }): CloudflareAdapterResult {
    const metrics: JSONArray = [];

    this.addWebMetrics(metrics, data.metricsResult.webRows, data.end);
    this.addDashboardBandwidthMetrics(
      metrics,
      data.metricsResult.dashboardBandwidthRows,
      data.end,
    );
    this.addDnsMetrics(metrics, data.metricsResult.dnsRows, data.end);
    this.addLoadBalancerMetrics(
      metrics,
      data.metricsResult.loadBalancerRows,
      data.end,
    );
    this.addWorkerMetrics(metrics, data.metricsResult.workerRows, data.end);
    this.addRealtimeWebMetrics(
      metrics,
      data.metricsResult.realtimeWebRows,
      data.end,
    );

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

  private static addWebMetrics(
    metrics: JSONArray,
    rows: Array<CloudflareWebMetricRow>,
    fallbackEnd: Date,
  ): void {
    for (const row of rows) {
      const timeUnixNano: string = this.toUnixNanoString(
        this.metricTime(row.dimensions?.datetimeMinute, fallbackEnd),
      );
      const attributes: JSONArray = [
        this.stringAttribute("cloudflare.metric_source", "web"),
      ];

      this.pushSum(metrics, {
        name: "cloudflare.requests",
        unit: "1",
        value: row.sum?.requests,
        timeUnixNano,
        attributes,
      });
      this.pushSum(metrics, {
        name: "cloudflare.cached_requests",
        unit: "1",
        value: row.sum?.cachedRequests,
        timeUnixNano,
        attributes,
      });
      this.pushSum(metrics, {
        name: "cloudflare.cached_bandwidth.bytes",
        unit: "By",
        value: row.sum?.cachedBytes,
        timeUnixNano,
        attributes,
      });
    }
  }

  private static addDashboardBandwidthMetrics(
    metrics: JSONArray,
    rows: Array<CloudflareDashboardBandwidthMetricRow>,
    fallbackEnd: Date,
  ): void {
    for (const row of rows) {
      const timeUnixNano: string = this.toUnixNanoString(
        this.metricTime(row.dimensions?.datetimeMinute, fallbackEnd),
      );
      const attributes: JSONArray = [
        this.stringAttribute("cloudflare.metric_source", "web"),
        this.stringAttribute("cloudflare.request_source", "all"),
      ];

      this.pushSum(metrics, {
        name: "cloudflare.bandwidth.bytes",
        unit: "By",
        value: row.sum?.edgeResponseBytes,
        timeUnixNano,
        attributes,
      });
    }
  }

  private static addDnsMetrics(
    metrics: JSONArray,
    rows: Array<CloudflareDnsMetricRow>,
    fallbackEnd: Date,
  ): void {
    for (const row of rows) {
      const timeUnixNano: string = this.toUnixNanoString(
        this.metricTime(row.dimensions?.datetimeMinute, fallbackEnd),
      );
      const attributes: JSONArray = [
        this.stringAttribute("cloudflare.metric_source", "dns"),
      ];

      this.addOptionalStringAttribute(
        attributes,
        "dns.question.type",
        row.dimensions?.queryType,
      );
      this.addOptionalStringAttribute(
        attributes,
        "cloudflare.dns.response_code",
        row.dimensions?.responseCode,
      );
      this.addOptionalNumberAttribute(
        attributes,
        "cloudflare.dns.response_cached",
        row.dimensions?.responseCached,
      );

      this.pushSum(metrics, {
        name: "cloudflare.dns.queries",
        unit: "1",
        value: row.count,
        timeUnixNano,
        attributes,
      });
      this.pushSum(metrics, {
        name: "cloudflare.dns.queries.not_cached",
        unit: "1",
        value: row.sum?.countNotCachedAndNotStale,
        timeUnixNano,
        attributes,
      });
      this.pushSum(metrics, {
        name: "cloudflare.dns.queries.stale",
        unit: "1",
        value: row.sum?.countStale,
        timeUnixNano,
        attributes,
      });
    }
  }

  private static addLoadBalancerMetrics(
    metrics: JSONArray,
    rows: Array<CloudflareLoadBalancerMetricRow>,
    fallbackEnd: Date,
  ): void {
    for (const row of rows) {
      const timeUnixNano: string = this.toUnixNanoString(
        this.metricTime(row.dimensions?.datetimeMinute, fallbackEnd),
      );
      const attributes: JSONArray = [
        this.stringAttribute("cloudflare.metric_source", "load_balancer"),
      ];

      this.addOptionalStringAttribute(
        attributes,
        "cloudflare.load_balancer.name",
        row.dimensions?.lbName,
      );
      this.addOptionalStringAttribute(
        attributes,
        "cloudflare.load_balancer.pool.name",
        row.dimensions?.selectedPoolName,
      );
      this.addOptionalStringAttribute(
        attributes,
        "cloudflare.load_balancer.origin.name",
        row.dimensions?.selectedOriginName,
      );
      this.addOptionalStringAttribute(
        attributes,
        "cloudflare.load_balancer.error_type",
        row.dimensions?.errorType,
      );

      this.pushSum(metrics, {
        name: "cloudflare.load_balancer.requests",
        unit: "1",
        value: row.count,
        timeUnixNano,
        attributes,
      });
      this.pushSum(metrics, {
        name: "cloudflare.load_balancer.rule_matches",
        unit: "1",
        value: row.sum?.ruleMatches,
        timeUnixNano,
        attributes,
      });
      this.pushSum(metrics, {
        name: "cloudflare.load_balancer.requests_with_rule",
        unit: "1",
        value: row.sum?.totalRequestsWithRule,
        timeUnixNano,
        attributes,
      });
    }
  }

  private static addWorkerMetrics(
    metrics: JSONArray,
    rows: Array<CloudflareWorkerMetricRow>,
    fallbackEnd: Date,
  ): void {
    for (const row of rows) {
      const timeUnixNano: string = this.toUnixNanoString(
        this.metricTime(row.dimensions?.datetimeMinute, fallbackEnd),
      );
      const attributes: JSONArray = [
        this.stringAttribute("cloudflare.metric_source", "worker"),
      ];

      this.addOptionalStringAttribute(
        attributes,
        "cloudflare.worker.script_id",
        row.dimensions?.constantScriptId,
      );
      this.addOptionalStringAttribute(
        attributes,
        "cloudflare.worker.status",
        row.dimensions?.status,
      );
      this.addOptionalNumberAttribute(
        attributes,
        "http.response.status_code",
        row.dimensions?.httpResponseStatus,
      );

      this.pushSum(metrics, {
        name: "cloudflare.workers.requests",
        unit: "1",
        value: row.sum?.requests,
        timeUnixNano,
        attributes,
      });
      this.pushSum(metrics, {
        name: "cloudflare.workers.subrequests",
        unit: "1",
        value: row.sum?.subrequests,
        timeUnixNano,
        attributes,
      });
      this.pushSum(metrics, {
        name: "cloudflare.workers.response_body.bytes",
        unit: "By",
        value: row.sum?.responseBodySize,
        timeUnixNano,
        attributes,
      });
      this.pushSum(metrics, {
        name: "cloudflare.workers.cpu_time",
        unit: "us",
        value: row.sum?.totalCpuTime,
        timeUnixNano,
        attributes,
      });
    }
  }

  private static addRealtimeWebMetrics(
    metrics: JSONArray,
    rows: Array<CloudflareRealtimeWebMetricRow>,
    fallbackEnd: Date,
  ): void {
    for (const row of rows) {
      const timeUnixNano: string = this.toUnixNanoString(
        this.metricTime(row.dimensions?.datetimeMinute, fallbackEnd),
      );
      const attributes: JSONArray = [
        this.stringAttribute("cloudflare.metric_source", "realtime_web"),
      ];

      this.addOptionalStringAttribute(
        attributes,
        "cloudflare.host",
        row.dimensions?.clientRequestHTTPHost,
      );
      this.addOptionalStringAttribute(
        attributes,
        "cloudflare.cache_status",
        row.dimensions?.cacheStatus,
      );
      this.addOptionalNumberAttribute(
        attributes,
        "http.response.status_code",
        row.dimensions?.edgeResponseStatus,
      );

      this.pushSum(metrics, {
        name: "cloudflare.realtime.requests",
        unit: "1",
        value: row.count,
        timeUnixNano,
        attributes,
      });
      this.pushSum(metrics, {
        name: "cloudflare.realtime.bandwidth.bytes",
        unit: "By",
        value: row.sum?.edgeResponseBytes,
        timeUnixNano,
        attributes,
      });
    }
  }

  private static pushSum(metrics: JSONArray, data: MetricPoint): void {
    const value: number | null = this.toFiniteNumber(data.value);

    if (value === null) {
      return;
    }

    metrics.push(
      this.buildSumMetric({
        name: data.name,
        unit: data.unit,
        value,
        timeUnixNano: data.timeUnixNano,
        attributes: data.attributes,
      }),
    );
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

  private static metricTime(
    value: string | undefined,
    fallbackEnd: Date,
  ): Date {
    return value ? new Date(value) : fallbackEnd;
  }

  private static addOptionalStringAttribute(
    attributes: JSONArray,
    key: string,
    value: string | undefined,
  ): void {
    if (!value) {
      return;
    }

    attributes.push(this.stringAttribute(key, value));
  }

  private static addOptionalNumberAttribute(
    attributes: JSONArray,
    key: string,
    value: number | string | undefined,
  ): void {
    const numberValue: number | null = this.toFiniteNumber(value);

    if (numberValue === null) {
      return;
    }

    attributes.push({
      key,
      value: { intValue: Math.trunc(numberValue) },
    });
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
