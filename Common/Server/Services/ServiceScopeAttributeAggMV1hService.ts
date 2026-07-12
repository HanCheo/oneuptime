import AnalyticsDatabaseService, {
  DbJSONResponse,
  Results,
} from "./AnalyticsDatabaseService";
import ClickhouseDatabase from "../Infrastructure/ClickhouseDatabase";
import ServiceScopeAttributeAggMV1h from "../../Models/AnalyticsModels/ServiceScopeAttributeAggMV1h";
import ObjectID from "../../Types/ObjectID";
import { SQL, Statement } from "../Utils/AnalyticsDatabase/Statement";
import TableColumnType from "../../Types/AnalyticsDatabase/TableColumnType";
import AnalyticsTableName from "../../Types/AnalyticsDatabase/AnalyticsTableName";
import { getClickhouseTelemetryDistributedTableName } from "../../Utils/Telemetry/Sharding";
import { JSONObject } from "../../Types/JSON";

export interface ServiceScopeAttributeOptionRow {
  attributeKey: string;
  attributeValue: string;
  sampleCount: number;
  lastSeenBucket: string;
}

export interface ServiceScopeAttributeKeySummaryRow {
  attributeKey: string;
  activeServiceCount: number;
  distinctValueCount: number;
  sampleCount: number;
  lastSeenBucket: string;
}

/**
 * Read-side service for the generic service-scope attribute rollup MV target
 * table. Registration in AnalyticsServices makes boot-time schema sync create
 * both the AggregatingMergeTree target table and its attached materialized view.
 */
export class ServiceScopeAttributeAggMV1hService extends AnalyticsDatabaseService<ServiceScopeAttributeAggMV1h> {
  private static readonly TABLE_NAME: string =
    getClickhouseTelemetryDistributedTableName(
      AnalyticsTableName.ServiceScopeAttributeAggMV1h,
    );

  private formatDateTime(d: Date): string {
    return new Date(d).toISOString().replace("T", " ").substring(0, 19);
  }
  public constructor(clickhouseDatabase?: ClickhouseDatabase | undefined) {
    super({
      modelType: ServiceScopeAttributeAggMV1h,
      database: clickhouseDatabase,
    });
  }

  public async getAttributeOptionsForService(data: {
    projectId: ObjectID;
    serviceId: ObjectID;
    startTime: Date;
    endTime: Date;
    attributeKeys: Array<string>;
    limitPerKey?: number | undefined;
  }): Promise<Array<ServiceScopeAttributeOptionRow>> {
    if (data.attributeKeys.length === 0) {
      return [];
    }

    const statement: Statement = new Statement();
    statement.append(
      SQL`SELECT attributeKey, attributeValue, countMerge(valueCountState) AS sampleCount, max(bucketTime) AS lastSeenBucket`,
    );
    statement.append(
      SQL` FROM ${ServiceScopeAttributeAggMV1hService.TABLE_NAME}`,
    );
    statement.append(
      SQL` WHERE projectId = ${{
        value: data.projectId.toString(),
        type: TableColumnType.Text,
      }}`,
    );
    statement.append(
      SQL` AND primaryEntityId = ${{
        value: data.serviceId.toString(),
        type: TableColumnType.Text,
      }}`,
    );
    statement.append(
      ` AND bucketTime >= toDateTime('${this.formatDateTime(data.startTime)}') AND bucketTime <= toDateTime('${this.formatDateTime(data.endTime)}')`,
    );
    statement.append(` AND attributeKey IN (`);
    data.attributeKeys.forEach((key: string, index: number): void => {
      if (index > 0) {
        statement.append(`, `);
      }

      statement.append(
        SQL`${{
          value: key,
          type: TableColumnType.Text,
        }}`,
      );
    });
    statement.append(`)`);
    statement.append(
      SQL` GROUP BY attributeKey, attributeValue ORDER BY attributeKey ASC, sampleCount DESC, lastSeenBucket DESC`,
    );
    statement.append(
      SQL` LIMIT ${{
        value: data.limitPerKey || 100,
        type: TableColumnType.Number,
      }} BY attributeKey`,
    );

    const dbResult: Results = await this.executeQuery(statement);
    const response: DbJSONResponse = await dbResult.json<{
      data?: Array<JSONObject>;
    }>();

    return (response.data || []).map(
      (row: JSONObject): ServiceScopeAttributeOptionRow => {
        return {
          attributeKey: String(row["attributeKey"] || ""),
          attributeValue: String(row["attributeValue"] || ""),
          sampleCount: Number(row["sampleCount"] || 0),
          lastSeenBucket: String(row["lastSeenBucket"] || ""),
        };
      },
    );
  }

  private static buildProjectAttributeKeySummariesStatement(data: {
    projectId: ObjectID;
    startTime: Date;
    endTime: Date;
    attributeKeys?: Array<string> | undefined;
    limit?: number | undefined;
  }): Statement {
    const service: ServiceScopeAttributeAggMV1hService =
      new ServiceScopeAttributeAggMV1hService();
    const statement: Statement = new Statement();

    statement.append(
      SQL`SELECT attributeKey, uniqExact(primaryEntityId) AS activeServiceCount, uniqExact(attributeValue) AS distinctValueCount, countMerge(valueCountState) AS sampleCount, max(bucketTime) AS lastSeenBucket`,
    );
    statement.append(
      SQL` FROM ${ServiceScopeAttributeAggMV1hService.TABLE_NAME}`,
    );
    statement.append(
      SQL` WHERE projectId = ${{
        value: data.projectId.toString(),
        type: TableColumnType.Text,
      }}`,
    );
    statement.append(
      ` AND bucketTime >= toDateTime('${service.formatDateTime(data.startTime)}') AND bucketTime <= toDateTime('${service.formatDateTime(data.endTime)}')`,
    );

    const attributeKeys: Array<string> = Array.from(
      new Set(
        (data.attributeKeys || []).map((key: string): string => {
          return key.trim();
        }),
      ),
    ).filter((key: string): boolean => {
      return Boolean(key);
    });

    if (attributeKeys.length > 0) {
      statement.append(` AND attributeKey IN (`);
      attributeKeys.forEach((key: string, index: number): void => {
        if (index > 0) {
          statement.append(`, `);
        }

        statement.append(
          SQL`${{
            value: key,
            type: TableColumnType.Text,
          }}`,
        );
      });
      statement.append(`)`);
    }

    statement.append(
      SQL` GROUP BY attributeKey ORDER BY sampleCount DESC, activeServiceCount DESC, distinctValueCount ASC, attributeKey ASC`,
    );

    if (data.limit && data.limit > 0) {
      statement.append(
        SQL` LIMIT ${{
          value: data.limit,
          type: TableColumnType.Number,
        }}`,
      );
    }

    return statement;
  }

  public async getProjectAttributeKeySummaries(data: {
    projectId: ObjectID;
    startTime: Date;
    endTime: Date;
    attributeKeys?: Array<string> | undefined;
    limit?: number | undefined;
  }): Promise<Array<ServiceScopeAttributeKeySummaryRow>> {
    const dbResult: Results = await this.executeQuery(
      ServiceScopeAttributeAggMV1hService.buildProjectAttributeKeySummariesStatement(
        data,
      ),
    );
    const response: DbJSONResponse = await dbResult.json<{
      data?: Array<JSONObject>;
    }>();

    return (response.data || []).map(
      (row: JSONObject): ServiceScopeAttributeKeySummaryRow => {
        return {
          attributeKey: String(row["attributeKey"] || ""),
          activeServiceCount: Number(row["activeServiceCount"] || 0),
          distinctValueCount: Number(row["distinctValueCount"] || 0),
          sampleCount: Number(row["sampleCount"] || 0),
          lastSeenBucket: String(row["lastSeenBucket"] || ""),
        };
      },
    );
  }

  private static buildProjectActiveServiceCountStatement(data: {
    projectId: ObjectID;
    startTime: Date;
    endTime: Date;
  }): Statement {
    const service: ServiceScopeAttributeAggMV1hService =
      new ServiceScopeAttributeAggMV1hService();

    return SQL`SELECT uniqExact(primaryEntityId) AS activeServiceCount
      FROM ${ServiceScopeAttributeAggMV1hService.TABLE_NAME}
      WHERE projectId = ${{
        value: data.projectId.toString(),
        type: TableColumnType.Text,
      }}
      AND bucketTime >= toDateTime('${service.formatDateTime(data.startTime)}')
      AND bucketTime <= toDateTime('${service.formatDateTime(data.endTime)}')`;
  }

  public async getProjectActiveServiceCount(data: {
    projectId: ObjectID;
    startTime: Date;
    endTime: Date;
  }): Promise<number> {
    const dbResult: Results = await this.executeQuery(
      ServiceScopeAttributeAggMV1hService.buildProjectActiveServiceCountStatement(
        data,
      ),
    );
    const response: DbJSONResponse = await dbResult.json<{
      data?: Array<JSONObject>;
    }>();
    const row: JSONObject | undefined = (response.data || [])[0];

    return Number(row?.["activeServiceCount"] || 0);
  }
}

export default new ServiceScopeAttributeAggMV1hService();
