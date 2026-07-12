import AnalyticsTableName from "../../Types/AnalyticsDatabase/AnalyticsTableName";


const shardedTelemetryTableMap: Record<string, true> = {
  [AnalyticsTableName.Log]: true,
  [AnalyticsTableName.Metric]: true,
  [AnalyticsTableName.ExceptionInstance]: true,
  [AnalyticsTableName.Span]: true,
  [AnalyticsTableName.MonitorLog]: true,
  [AnalyticsTableName.Profile]: true,
  [AnalyticsTableName.ProfileSample]: true,
  [AnalyticsTableName.MetricItemAggMV1m]: true,
  [AnalyticsTableName.MetricItemAggMV1mByHostV2]: true,
  [AnalyticsTableName.MetricBaselineHourly]: true,
};

export const isClickhouseTelemetryShardingEnabled: () => boolean = (): boolean => {
  return process.env["CLICKHOUSE_TELEMETRY_SHARDING_ENABLED"] === "true";
};

export const getClickhouseClusterName: () => string | undefined = (): string | undefined => {
  if (!isClickhouseTelemetryShardingEnabled()) {
    return undefined;
  }

  return process.env["CLICKHOUSE_CLUSTER_NAME"] || undefined;
};

export const isClickhouseTelemetryTableSharded: (
  tableName: string,
) => boolean = (tableName: string): boolean => {
  return (
    isClickhouseTelemetryShardingEnabled() &&
    Boolean(getClickhouseClusterName()) &&
    Boolean(shardedTelemetryTableMap[tableName])
  );
};

/*
 * Returns the app-facing telemetry table name. In the sharded schema the model's
 * own `tableName` is already the Distributed wrapper over `<tableName>Local`;
 * the historical outer `*Distributed` hop is intentionally not used for reads
 * or writes because it double-queues inserts and adds avoidable latency.
 */
export const getClickhouseTelemetryDistributedTableName: (
  tableName: string,
) => string = (tableName: string): string => {
  return tableName;
};

export const getClickhouseTelemetryShardingKey: () => string = (): string => {
  return "cityHash64(projectId)";
};
