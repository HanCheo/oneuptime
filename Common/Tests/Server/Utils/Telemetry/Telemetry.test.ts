import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import MetricType from "../../../../Models/DatabaseModels/MetricType";
import Service from "../../../../Models/DatabaseModels/Service";
import MetricTypeService from "../../../../Server/Services/MetricTypeService";
import TelemetryUtil from "../../../../Server/Utils/Telemetry/Telemetry";
import Dictionary from "../../../../Types/Dictionary";
import ObjectID from "../../../../Types/ObjectID";

const PROJECT_ID: ObjectID = ObjectID.generate();

type QueryCall = [string, Array<unknown>];

function serviceWithId(id: ObjectID): Service {
  const service: Service = new Service();
  service.id = id;
  return service;
}

function metricTypeWith(data: {
  name: string;
  description: string;
  unit: string;
  services: Array<Service>;
}): MetricType {
  const metricType: MetricType = new MetricType();
  metricType.name = data.name;
  metricType.description = data.description;
  metricType.unit = data.unit;
  metricType.services = data.services;
  return metricType;
}

describe("TelemetryUtil.indexMetricNameServiceNameMap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("does nothing when the batch carries no metric types", async () => {
    const query: jest.Mock = jest.fn();
    const create: jest.SpyInstance = jest
      .spyOn(MetricTypeService, "create")
      .mockResolvedValue(new MetricType());
    const update: jest.SpyInstance = jest
      .spyOn(MetricTypeService, "updateColumnsByIdWithoutHooks")
      .mockResolvedValue(undefined);
    jest.spyOn(MetricTypeService, "getRepository").mockReturnValue({
      manager: { query },
    } as any);

    await TelemetryUtil.indexMetricNameServiceNameMap({
      projectId: PROJECT_ID,
      metricNameServiceNameMap: {},
    });

    expect(query).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  test("bulk loads existing metric types, updates changed metadata, and batches only missing links", async () => {
    const existingMetricTypeId: ObjectID = ObjectID.generate();
    const createdMetricTypeId: ObjectID = ObjectID.generate();
    const serviceA: ObjectID = ObjectID.generate();
    const serviceB: ObjectID = ObjectID.generate();

    const query: jest.Mock = jest
      .fn()
      .mockResolvedValueOnce([
        {
          metricTypeId: existingMetricTypeId.toString(),
          name: "cpu.usage",
          description: "old description",
          unit: "old-unit",
          serviceId: serviceA.toString(),
        },
      ])
      .mockResolvedValueOnce([]);

    const createdMetricType: MetricType = new MetricType();
    createdMetricType.id = createdMetricTypeId;

    const create: jest.SpyInstance = jest
      .spyOn(MetricTypeService, "create")
      .mockResolvedValue(createdMetricType);
    const update: jest.SpyInstance = jest
      .spyOn(MetricTypeService, "updateColumnsByIdWithoutHooks")
      .mockResolvedValue(undefined);
    jest.spyOn(MetricTypeService, "getRepository").mockReturnValue({
      manager: { query },
    } as any);

    const metricNameServiceNameMap: Dictionary<MetricType> = {
      "cpu.usage": metricTypeWith({
        name: "cpu.usage",
        description: "new description",
        unit: "percent",
        services: [serviceWithId(serviceA), serviceWithId(serviceB)],
      }),
      "memory.usage": metricTypeWith({
        name: "memory.usage",
        description: "memory description",
        unit: "By",
        services: [serviceWithId(serviceA)],
      }),
    };

    await TelemetryUtil.indexMetricNameServiceNameMap({
      projectId: PROJECT_ID,
      metricNameServiceNameMap,
    });

    expect(query).toHaveBeenCalledTimes(2);

    const [selectSql, selectParams] = query.mock.calls[0] as QueryCall;
    expect(selectSql).toContain('FROM "MetricType" mt');
    expect(selectSql).toContain('LEFT JOIN "MetricTypeService" mts');
    expect(selectParams).toEqual([
      PROJECT_ID.toString(),
      ["cpu.usage", "memory.usage"],
    ]);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      id: new ObjectID(existingMetricTypeId.toString()),
      data: {
        description: "new description",
        unit: "percent",
      },
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "memory.usage",
        description: "memory description",
        unit: "By",
        projectId: PROJECT_ID,
        services: [],
      }),
      props: {
        isRoot: true,
      },
    });

    const [insertSql, insertParams] = query.mock.calls[1] as QueryCall;
    expect(insertSql).toContain('INSERT INTO "MetricTypeService"');
    expect(insertSql).toContain(
      'ON CONFLICT ("metricTypeId", "serviceId") DO NOTHING',
    );
    expect(insertParams).toEqual([
      existingMetricTypeId.toString(),
      serviceB.toString(),
      createdMetricTypeId.toString(),
      serviceA.toString(),
    ]);
  });
});
