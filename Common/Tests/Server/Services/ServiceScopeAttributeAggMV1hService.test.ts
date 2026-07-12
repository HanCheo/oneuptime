import { describe, expect, test } from "@jest/globals";
import {
  ServiceScopeAttributeAggMV1hService,
} from "../../../Server/Services/ServiceScopeAttributeAggMV1hService";
import { Statement } from "../../../Server/Utils/AnalyticsDatabase/Statement";
import ObjectID from "../../../Types/ObjectID";

describe("ServiceScopeAttributeAggMV1hService statements", () => {
  test("builds a project attribute summary query with optional key filter and limit", () => {
    const statement: Statement = (
      ServiceScopeAttributeAggMV1hService as unknown as {
        buildProjectAttributeKeySummariesStatement: (data: {
          projectId: ObjectID;
          startTime: Date;
          endTime: Date;
          attributeKeys?: Array<string>;
          limit?: number;
        }) => Statement;
      }
    ).buildProjectAttributeKeySummariesStatement({
      projectId: ObjectID.generate(),
      startTime: new Date("2026-07-01T00:00:00.000Z"),
      endTime: new Date("2026-07-02T00:00:00.000Z"),
      attributeKeys: [
        "resource.deployment.environment",
        " resource.service.version ",
      ],
      limit: 25,
    });

    expect(statement.query).toContain("uniqExact(primaryEntityId) AS activeServiceCount");
    expect(statement.query).toContain("uniqExact(attributeValue) AS distinctValueCount");
    expect(statement.query).toContain("countMerge(valueCountState) AS sampleCount");
    expect(statement.query).toContain("GROUP BY attributeKey");
    expect(statement.query).toContain("attributeKey IN (");
    expect(statement.query).toContain("LIMIT");
    expect(Object.values(statement.query_params)).toContain(
      "resource.deployment.environment",
    );
    expect(Object.values(statement.query_params)).toContain(
      "resource.service.version",
    );
  });

  test("builds an active service count query scoped by project and time window", () => {
    const projectId: ObjectID = ObjectID.generate();
    const statement: Statement = (
      ServiceScopeAttributeAggMV1hService as unknown as {
        buildProjectActiveServiceCountStatement: (data: {
          projectId: ObjectID;
          startTime: Date;
          endTime: Date;
        }) => Statement;
      }
    ).buildProjectActiveServiceCountStatement({
      projectId,
      startTime: new Date("2026-07-01T00:00:00.000Z"),
      endTime: new Date("2026-07-02T00:00:00.000Z"),
    });

    expect(statement.query).toContain(
      "SELECT uniqExact(primaryEntityId) AS activeServiceCount",
    );
    expect(statement.query).toContain("WHERE projectId =");
    expect(statement.query).toContain("bucketTime >= toDateTime('");
    expect(Object.values(statement.query_params)).toContain(projectId.toString());
  });
});
