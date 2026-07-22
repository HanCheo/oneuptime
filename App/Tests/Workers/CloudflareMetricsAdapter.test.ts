import CloudflareIntegration from "Common/Models/DatabaseModels/CloudflareIntegration";
import { CloudflareMetricsResult } from "../../FeatureSet/Workers/Utils/Cloudflare/CloudflareGraphQLClient";
import CloudflareMetricsAdapter, {
  CloudflareAdapterResult,
} from "../../FeatureSet/Workers/Utils/Cloudflare/CloudflareMetricsAdapter";
import { describe, expect, test } from "@jest/globals";

type AdapterPayload = {
  resourceMetrics: Array<{
    scopeMetrics: Array<{
      metrics: Array<{
        name: string;
        sum: {
          dataPoints: Array<{
            asDouble: number;
            attributes: Array<{
              key: string;
              value: { stringValue?: string | undefined };
            }>;
          }>;
        };
      }>;
    }>;
  }>;
};

type AdapterMetric =
  AdapterPayload["resourceMetrics"][number]["scopeMetrics"][number]["metrics"][number];

describe("CloudflareMetricsAdapter", () => {
  test("uses Cloudflare overview bytes for dashboard bandwidth", () => {
    const integration: CloudflareIntegration = {
      cloudflareZoneId: "zone-a",
      cloudflareZoneName: "example.com",
      cloudflareAccountId: "account-a",
    } as CloudflareIntegration;
    const metricsResult: CloudflareMetricsResult = {
      webRows: [
        {
          dimensions: { datetimeMinute: "2026-07-01T00:00:00Z" },
          sum: {
            requests: 10,
            bytes: 1,
            cachedRequests: 2,
            cachedBytes: 3,
          },
        },
      ],
      dashboardBandwidthRows: [
        {
          dimensions: { datetimeMinute: "2026-07-01T00:00:00Z" },
          sum: { bytes: 123 },
        },
      ],
      dnsRows: [],
      loadBalancerRows: [],
      workerRows: [],
      realtimeWebRows: [],
    };

    const result: CloudflareAdapterResult =
      CloudflareMetricsAdapter.buildOtlpMetrics({
        integration,
        metricsResult,
        start: new Date("2026-07-01T00:00:00Z"),
        end: new Date("2026-07-01T00:01:00Z"),
      });
    // adapter output shape is fixed by buildOtlpMetrics above.
    const payload: AdapterPayload = result.otlpMetricsPayload as AdapterPayload;
    const metrics: Array<AdapterMetric> =
      payload.resourceMetrics[0]?.scopeMetrics[0]?.metrics || [];
    const bandwidthMetrics: Array<AdapterMetric> = metrics.filter(
      (metric: AdapterMetric) => {
        return metric.name === "cloudflare.bandwidth.bytes";
      },
    );

    expect(bandwidthMetrics).toHaveLength(1);
    expect(bandwidthMetrics[0]?.sum.dataPoints[0]?.asDouble).toBe(123);
    expect(bandwidthMetrics[0]?.sum.dataPoints[0]?.attributes).toContainEqual({
      key: "cloudflare.request_source",
      value: { stringValue: "all" },
    });
  });
});
