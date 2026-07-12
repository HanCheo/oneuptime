import AnalyticsBaseModel from "./AnalyticsBaseModel/AnalyticsBaseModel";
import AnalyticsTableEngine from "../../Types/AnalyticsDatabase/AnalyticsTableEngine";
import AnalyticsTableName from "../../Types/AnalyticsDatabase/AnalyticsTableName";
import AnalyticsTableColumn from "../../Types/AnalyticsDatabase/TableColumn";
import TableColumnType from "../../Types/AnalyticsDatabase/TableColumnType";
import {
  getClickhouseColdTierStoragePolicy,
  getTelemetryColdTierTtlExpression,
} from "../../Utils/Telemetry/ColdTier";

/**
 * Generic per-service, per-attribute, per-hour rollup of span resource/span
 * attributes. This is intentionally a read model for fast selector-style
 * queries (environment, version, namespace, cluster, etc.) keyed by the
 * project's configured service-scope attribute list.
 */
export default class ServiceScopeAttributeAggMV1h extends AnalyticsBaseModel {
  public constructor() {
    const projectIdColumn: AnalyticsTableColumn = new AnalyticsTableColumn({
      key: "projectId",
      title: "Project ID",
      description: "ID of project (tenant key, replicated from SpanItemV3)",
      required: true,
      type: TableColumnType.Text,
      isTenantId: true,
    });

    const primaryEntityIdColumn: AnalyticsTableColumn =
      new AnalyticsTableColumn({
        key: "primaryEntityId",
        title: "Service ID",
        description: "Primary entity ID (replicated from SpanItemV3).",
        required: true,
        type: TableColumnType.Text,
      });

    const attributeKeyColumn: AnalyticsTableColumn = new AnalyticsTableColumn({
      key: "attributeKey",
      title: "Attribute Key",
      description: "Telemetry attribute key used as a service scope dimension.",
      required: true,
      type: TableColumnType.Text,
    });

    const attributeValueColumn: AnalyticsTableColumn = new AnalyticsTableColumn(
      {
        key: "attributeValue",
        title: "Attribute Value",
        description: "Value for the selected telemetry attribute key.",
        required: true,
        type: TableColumnType.Text,
      },
    );

    const bucketTimeColumn: AnalyticsTableColumn = new AnalyticsTableColumn({
      key: "bucketTime",
      title: "Bucket Time",
      description:
        "Start of the 1-hour bucket this row aggregates. Computed by the MV as toStartOfHour(startTime).",
      required: true,
      type: TableColumnType.Date,
    });

    const valueCountStateColumn: AnalyticsTableColumn =
      new AnalyticsTableColumn({
        key: "valueCountState",
        title: "Count (state)",
        description:
          "AggregateFunction(count, Float64) state. Read via countMerge(valueCountState).",
        required: true,
        type: TableColumnType.AggregateFunction,
        aggregateFunctionDefinition: "count, Float64",
      });

    const retentionDateColumn: AnalyticsTableColumn = new AnalyticsTableColumn({
      key: "retentionDate",
      title: "Retention Date",
      description:
        "Date after which this row is eligible for TTL deletion. Computed by the MV as max(retentionDate) per bucket.",
      required: true,
      type: TableColumnType.Date,
    });

    super({
      tableName: AnalyticsTableName.ServiceScopeAttributeAggMV1h,
      tableEngine: AnalyticsTableEngine.AggregatingMergeTree,
      singularName: "Service Scope Attribute 1-Hour Aggregate",
      pluralName: "Service Scope Attribute 1-Hour Aggregates",
      tableColumns: [
        projectIdColumn,
        primaryEntityIdColumn,
        attributeKeyColumn,
        attributeValueColumn,
        bucketTimeColumn,
        valueCountStateColumn,
        retentionDateColumn,
      ],
      projections: [],
      materializedViews: [
        {
          name: "ServiceScopeAttributeAggMV1h_mv",
          query: `CREATE MATERIALIZED VIEW IF NOT EXISTS ServiceScopeAttributeAggMV1h_mv
TO ServiceScopeAttributeAggMV1h
AS
SELECT
  projectId,
  primaryEntityId,
  attributeKey,
  attributes[attributeKey] AS attributeValue,
  toStartOfHour(startTime) AS bucketTime,
  countState(toFloat64(1)) AS valueCountState,
  max(retentionDate) AS retentionDate
FROM SpanItemV3
ARRAY JOIN arrayFilter(
  key -> attributes[key] != '',
  attributeKeys
) AS attributeKey
GROUP BY projectId, primaryEntityId, attributeKey, attributeValue, bucketTime`,
        },
      ],
      sortKeys: [
        "projectId",
        "primaryEntityId",
        "attributeKey",
        "attributeValue",
        "bucketTime",
      ],
      primaryKeys: [
        "projectId",
        "primaryEntityId",
        "attributeKey",
        "attributeValue",
        "bucketTime",
      ],
      partitionKey: "toYYYYMM(bucketTime)",
      shardingKey: "cityHash64(projectId, primaryEntityId, attributeKey)",
      storagePolicy: getClickhouseColdTierStoragePolicy(),
      tableSettings:
        "ttl_only_drop_parts = 1, non_replicated_deduplication_window = 10000",
      ttlExpression: getTelemetryColdTierTtlExpression({
        signal: "traces",
        moveAfterExpression: "bucketTime",
      }),
    });
  }
}
