import { EVERY_MINUTE } from "Common/Utils/CronTime";
import CloudflareIntegration from "Common/Models/DatabaseModels/CloudflareIntegration";
import CloudflareIntegrationService from "Common/Server/Services/CloudflareIntegrationService";
import OneUptimeDate from "Common/Types/Date";
import ProductType from "Common/Types/MeteredPlan/ProductType";
import QueryHelper from "Common/Server/Types/Database/QueryHelper";
import { TelemetryRequest } from "Common/Server/Middleware/TelemetryIngest";
import QueryDeepPartialEntity from "Common/Types/Database/PartialEntity";
import MetricsQueueService from "../../../Telemetry/Services/Queue/TelemetryQueueService";
import CloudflareGraphQLClient, {
  CloudflareMetricsResult,
  cloudflareErrorMessage,
} from "../../Utils/Cloudflare/CloudflareGraphQLClient";
import CloudflareMetricsAdapter, {
  CloudflareAdapterResult,
} from "../../Utils/Cloudflare/CloudflareMetricsAdapter";
import RunCron from "../../Utils/Cron";
import logger from "Common/Server/Utils/Logger";

const CLOUDFLARE_POLL_BATCH_SIZE: number = 50;
const CLOUDFLARE_ANALYTICS_LAG_MINUTES: number = 10;
const DEFAULT_POLL_INTERVAL_MINUTES: number = 5;

RunCron(
  "Cloudflare:PullMetrics",
  { schedule: EVERY_MINUTE, runOnStartup: false },
  async () => {
    const now: Date = OneUptimeDate.getCurrentDate();
    const integrations: Array<CloudflareIntegration> =
      await CloudflareIntegrationService.findBy({
        query: {
          isEnabled: true,
          nextSyncAt: QueryHelper.lessThanEqualToOrNull(now),
        },
        select: {
          _id: true,
          projectId: true,
          name: true,
          cloudflareApiToken: true,
          cloudflareAccountId: true,
          cloudflareZoneId: true,
          cloudflareZoneName: true,
          pollIntervalInMinutes: true,
          collectWebAnalyticsMetrics: true,
          collectDnsMetrics: true,
          collectLoadBalancerMetrics: true,
          collectWorkerScriptMetrics: true,
          collectRealtimeWebAnalyticsMetrics: true,
          lastSyncedAt: true,
        },
        limit: CLOUDFLARE_POLL_BATCH_SIZE,
        skip: 0,
        props: {
          isRoot: true,
        },
      });

    for (const integration of integrations) {
      await pullIntegrationMetrics({ integration, now });
    }
  },
);

async function pullIntegrationMetrics(data: {
  integration: CloudflareIntegration;
  now: Date;
}): Promise<void> {
  const { integration, now } = data;
  const nextSyncAt: Date = getNextSyncAt({ integration, now });

  try {
    if (
      !integration.projectId ||
      !integration.cloudflareApiToken ||
      !integration.cloudflareZoneId
    ) {
      throw new Error(
        "Cloudflare integration is missing required credentials.",
      );
    }

    const end: Date = startOfMinute(
      OneUptimeDate.addRemoveMinutes(now, -CLOUDFLARE_ANALYTICS_LAG_MINUTES),
    );
    const start: Date = getStartTime({ integration, end });

    if (!OneUptimeDate.isBefore(start, end)) {
      await updateSyncStatus({
        integration,
        status: "pending",
        nextSyncAt,
      });
      return;
    }

    const metricsResult: CloudflareMetricsResult =
      await CloudflareGraphQLClient.getMetrics({
        apiToken: integration.cloudflareApiToken,
        zoneId: integration.cloudflareZoneId,
        start,
        end,
        selection: {
          collectWebAnalyticsMetrics: integration.collectWebAnalyticsMetrics,
          collectDnsMetrics: integration.collectDnsMetrics,
          collectLoadBalancerMetrics: integration.collectLoadBalancerMetrics,
          collectWorkerScriptMetrics: integration.collectWorkerScriptMetrics,
          collectRealtimeWebAnalyticsMetrics:
            integration.collectRealtimeWebAnalyticsMetrics,
        },
      });

    const adapterResult: CloudflareAdapterResult =
      CloudflareMetricsAdapter.buildOtlpMetrics({
        integration,
        metricsResult,
        start,
        end,
      });

    await MetricsQueueService.addMetricIngestJob({
      projectId: integration.projectId,
      productType: ProductType.Metrics,
      body: adapterResult.otlpMetricsPayload,
      headers: {},
      deduplicationKey: adapterResult.deduplicationKey,
    } as unknown as TelemetryRequest & { deduplicationKey: string });

    await updateSyncStatus({
      integration,
      status: "success",
      lastSyncedAt: adapterResult.syncedUntil,
      lastSuccessfulSyncAt: now,
      nextSyncAt,
    });
  } catch (error) {
    const message: string = cloudflareErrorMessage(error);
    logger.error(
      `Cloudflare metrics sync failed for integration ${integration.id?.toString() ?? "unknown"}: ${message}`,
    );
    await updateSyncStatus({
      integration,
      status: "error",
      lastError: message,
      lastErrorAt: now,
      nextSyncAt,
    });
  }
}

function getStartTime(data: {
  integration: CloudflareIntegration;
  end: Date;
}): Date {
  const { integration, end } = data;

  if (integration.lastSyncedAt) {
    return integration.lastSyncedAt;
  }

  return OneUptimeDate.addRemoveMinutes(
    end,
    -getPollIntervalInMinutes(integration),
  );
}

function getNextSyncAt(data: {
  integration: CloudflareIntegration;
  now: Date;
}): Date {
  return OneUptimeDate.addRemoveMinutes(
    data.now,
    getPollIntervalInMinutes(data.integration),
  );
}

function getPollIntervalInMinutes(integration: CloudflareIntegration): number {
  if (
    !integration.pollIntervalInMinutes ||
    !Number.isFinite(integration.pollIntervalInMinutes)
  ) {
    return DEFAULT_POLL_INTERVAL_MINUTES;
  }

  return Math.max(
    1,
    Math.min(60, Math.trunc(integration.pollIntervalInMinutes)),
  );
}

function startOfMinute(date: Date): Date {
  return OneUptimeDate.resetSecondsAndMilliseconds(new Date(date));
}

async function updateSyncStatus(data: {
  integration: CloudflareIntegration;
  status: "pending" | "success" | "error";
  lastSyncedAt?: Date;
  lastSuccessfulSyncAt?: Date;
  lastError?: string;
  lastErrorAt?: Date;
  nextSyncAt: Date;
}): Promise<void> {
  const updateData: {
    syncStatus: "pending" | "success" | "error";
    lastSyncedAt?: Date;
    lastSuccessfulSyncAt?: Date;
    lastError: string | null;
    lastErrorAt: Date | null;
    nextSyncAt: Date;
  } = {
    syncStatus: data.status,
    lastError:
      data.status === "error" ? data.lastError || "Unknown error" : null,
    lastErrorAt:
      data.status === "error" ? data.lastErrorAt || data.nextSyncAt : null,
    nextSyncAt: data.nextSyncAt,
  };

  if (data.lastSyncedAt) {
    updateData.lastSyncedAt = data.lastSyncedAt;
  }

  if (data.lastSuccessfulSyncAt) {
    updateData.lastSuccessfulSyncAt = data.lastSuccessfulSyncAt;
  }

  await CloudflareIntegrationService.updateOneById({
    id: data.integration.id!,
    data: updateData as unknown as QueryDeepPartialEntity<CloudflareIntegration>,
    props: {
      isRoot: true,
    },
  });
}
