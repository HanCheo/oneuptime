import { JSONArray, JSONObject, JSONValue } from "../../../Types/JSON";
import ObjectID from "../../../Types/ObjectID";
import CaptureSpan from "./CaptureSpan";
import MetricType from "../../../Models/DatabaseModels/MetricType";
import MetricTypeService from "../../Services/MetricTypeService";
import Service from "../../../Models/DatabaseModels/Service";
import Dictionary from "../../../Types/Dictionary";

export type AttributeType = string | number | boolean | null;

export default class TelemetryUtil {
  private static readonly METRIC_TYPE_BATCH_SIZE: number = 500;

  @CaptureSpan()
  public static async indexMetricNameServiceNameMap(data: {
    projectId: ObjectID;
    metricNameServiceNameMap: Dictionary<MetricType>;
  }): Promise<void> {
    const metricNames: Array<string> = Object.keys(
      data.metricNameServiceNameMap,
    );

    if (metricNames.length === 0) {
      return;
    }

    const existingMetricTypesByName: Map<
      string,
      {
        id: string;
        description: string;
        unit: string;
        serviceIds: Set<string>;
      }
    > = await this.fetchExistingMetricTypes({
      projectId: data.projectId,
      metricNames,
    });

    const missingServiceLinks: Array<{
      metricTypeId: string;
      serviceId: string;
    }> = [];

    for (const metricName of metricNames) {
      const metricTypeInMap: MetricType =
        data.metricNameServiceNameMap[metricName]!;
      const desiredDescription: string = metricTypeInMap.description || "";
      const desiredUnit: string = metricTypeInMap.unit || "";
      const desiredServiceIds: Array<string> = this.getServiceIds(
        metricTypeInMap.services || [],
      );

      let existingMetricType:
        | {
            id: string;
            description: string;
            unit: string;
            serviceIds: Set<string>;
          }
        | undefined = existingMetricTypesByName.get(metricName);

      if (!existingMetricType) {
        const metricTypeToCreate: MetricType = new MetricType();
        metricTypeToCreate.name = metricName;
        metricTypeToCreate.description = desiredDescription;
        metricTypeToCreate.unit = desiredUnit;
        metricTypeToCreate.projectId = data.projectId;
        metricTypeToCreate.services = [];

        const createdMetricType: MetricType = await MetricTypeService.create({
          data: metricTypeToCreate,
          props: {
            isRoot: true,
          },
        });

        existingMetricType = {
          id: createdMetricType.id!.toString(),
          description: desiredDescription,
          unit: desiredUnit,
          serviceIds: new Set<string>(),
        };

        existingMetricTypesByName.set(metricName, existingMetricType);
      } else if (
        existingMetricType.description !== desiredDescription ||
        existingMetricType.unit !== desiredUnit
      ) {
        await MetricTypeService.updateColumnsByIdWithoutHooks({
          id: new ObjectID(existingMetricType.id),
          data: {
            description: desiredDescription,
            unit: desiredUnit,
          },
        });

        existingMetricType.description = desiredDescription;
        existingMetricType.unit = desiredUnit;
      }

      for (const serviceId of desiredServiceIds) {
        if (!existingMetricType.serviceIds.has(serviceId)) {
          missingServiceLinks.push({
            metricTypeId: existingMetricType.id,
            serviceId,
          });
          existingMetricType.serviceIds.add(serviceId);
        }
      }
    }

    await this.insertMetricTypeServiceLinks(missingServiceLinks);
  }

  private static getServiceIds(services: Array<Service>): Array<string> {
    return Array.from(
      new Set(
        services
          .map((service: Service) => {
            return service.id?.toString() || "";
          })
          .filter((serviceId: string) => {
            return Boolean(serviceId);
          }),
      ),
    );
  }

  private static async fetchExistingMetricTypes(data: {
    projectId: ObjectID;
    metricNames: Array<string>;
  }): Promise<
    Map<
      string,
      {
        id: string;
        description: string;
        unit: string;
        serviceIds: Set<string>;
      }
    >
  > {
    const existingMetricTypesByName: Map<
      string,
      {
        id: string;
        description: string;
        unit: string;
        serviceIds: Set<string>;
      }
    > = new Map();

    const repository: ReturnType<typeof MetricTypeService.getRepository> =
      MetricTypeService.getRepository();

    for (
      let offset: number = 0;
      offset < data.metricNames.length;
      offset += this.METRIC_TYPE_BATCH_SIZE
    ) {
      const metricNamesChunk: Array<string> = data.metricNames.slice(
        offset,
        offset + this.METRIC_TYPE_BATCH_SIZE,
      );

      const rows: Array<{
        metricTypeId: string;
        name: string;
        description: string | null;
        unit: string | null;
        serviceId: string | null;
      }> = await repository.manager.query(
        `
          SELECT
            mt."_id" AS "metricTypeId",
            mt."name" AS "name",
            mt."description" AS "description",
            mt."unit" AS "unit",
            mts."serviceId" AS "serviceId"
          FROM "MetricType" mt
          LEFT JOIN "MetricTypeService" mts
            ON mts."metricTypeId" = mt."_id"
          WHERE mt."projectId" = $1
            AND mt."name" = ANY($2::varchar[])
        `,
        [data.projectId.toString(), metricNamesChunk],
      );

      for (const row of rows) {
        if (!existingMetricTypesByName.has(row.name)) {
          existingMetricTypesByName.set(row.name, {
            id: row.metricTypeId,
            description: row.description || "",
            unit: row.unit || "",
            serviceIds: new Set<string>(),
          });
        }

        if (row.serviceId) {
          existingMetricTypesByName
            .get(row.name)!
            .serviceIds.add(row.serviceId);
        }
      }
    }

    return existingMetricTypesByName;
  }

  private static async insertMetricTypeServiceLinks(
    links: Array<{ metricTypeId: string; serviceId: string }>,
  ): Promise<void> {
    if (links.length === 0) {
      return;
    }

    const repository: ReturnType<typeof MetricTypeService.getRepository> =
      MetricTypeService.getRepository();

    for (
      let offset: number = 0;
      offset < links.length;
      offset += this.METRIC_TYPE_BATCH_SIZE
    ) {
      const chunk: Array<{ metricTypeId: string; serviceId: string }> =
        links.slice(offset, offset + this.METRIC_TYPE_BATCH_SIZE);
      const params: Array<string> = [];
      const valueFragments: Array<string> = [];

      for (const link of chunk) {
        params.push(link.metricTypeId, link.serviceId);
        const metricTypeParamIndex: number = params.length - 1;
        const serviceParamIndex: number = params.length;
        valueFragments.push(
          `($${metricTypeParamIndex}, $${serviceParamIndex})`,
        );
      }

      await repository.manager.query(
        `
          INSERT INTO "MetricTypeService" ("metricTypeId", "serviceId")
          VALUES ${valueFragments.join(", ")}
          ON CONFLICT ("metricTypeId", "serviceId") DO NOTHING
        `,
        params,
      );
    }
  }

  public static getAttributesForServiceIdAndServiceName(data: {
    serviceId: ObjectID;
    serviceName: string;
  }): Dictionary<AttributeType> {
    // get attributes for service id and service name
    return {
      "oneuptime.service.id": data.serviceId.toString(),
      "oneuptime.service.name": data.serviceName,
    };
  }

  /*
   * Cross-cutting resource stamps. Spread alongside the service stamp on
   * every analytics row so a single ClickHouse query can find "all
   * telemetry from host X" / "from docker host Y" / "from cluster Z"
   * regardless of which Service the row primarily belongs to. Without
   * these, host context would only be queryable as the raw OTel
   * `resource.host.name` string with no stable id link.
   */
  public static getAttributesForHostIdAndHostName(data: {
    hostId: ObjectID;
    hostName: string;
  }): Dictionary<AttributeType> {
    return {
      "oneuptime.host.id": data.hostId.toString(),
      "oneuptime.host.name": data.hostName,
    };
  }

  public static getAttributesForDockerHostIdAndHostName(data: {
    dockerHostId: ObjectID;
    hostName: string;
  }): Dictionary<AttributeType> {
    return {
      "oneuptime.docker.host.id": data.dockerHostId.toString(),
      "oneuptime.docker.host.name": data.hostName,
    };
  }

  public static getAttributesForPodmanHostIdAndHostName(data: {
    podmanHostId: ObjectID;
    hostName: string;
  }): Dictionary<AttributeType> {
    return {
      "oneuptime.podman.host.id": data.podmanHostId.toString(),
      "oneuptime.podman.host.name": data.hostName,
    };
  }

  public static getAttributesForKubernetesClusterIdAndName(data: {
    kubernetesClusterId: ObjectID;
    clusterName: string;
  }): Dictionary<AttributeType> {
    return {
      "oneuptime.kubernetes.cluster.id": data.kubernetesClusterId.toString(),
      "oneuptime.kubernetes.cluster.name": data.clusterName,
    };
  }

  @CaptureSpan()
  public static getAttributes(data: {
    prefixKeysWithString: string;
    items: JSONArray;
  }): Dictionary<AttributeType | Array<AttributeType>> {
    const { items } = data;
    let { prefixKeysWithString } = data;

    if (prefixKeysWithString) {
      prefixKeysWithString = `${prefixKeysWithString}.`;
    }

    const finalObj: Dictionary<AttributeType | Array<AttributeType>> = {};
    const attributes: JSONArray = items;

    if (!attributes) {
      return finalObj;
    }

    for (const attribute of attributes) {
      if (!attribute["key"] || typeof attribute["key"] !== "string") {
        continue;
      }

      const keyWithPrefix: string = `${prefixKeysWithString}${attribute["key"]}`;

      const value:
        | AttributeType
        | Dictionary<AttributeType | Array<AttributeType>>
        | Array<AttributeType>
        | null = this.getAttributeValues(keyWithPrefix, attribute["value"]);

      if (value === null) {
        finalObj[keyWithPrefix] = null;
        continue;
      }

      if (Array.isArray(value)) {
        finalObj[keyWithPrefix] = value;
        continue;
      }

      if (typeof value === "object") {
        for (const [nestedKey, nestedValue] of Object.entries(
          value as Dictionary<AttributeType | Array<AttributeType>>,
        )) {
          finalObj[nestedKey] = nestedValue as
            | AttributeType
            | Array<AttributeType>;
        }

        continue;
      }

      finalObj[keyWithPrefix] = value as AttributeType;
    }

    return finalObj;
  }

  public static getAttributeValues(
    prefixKeysWithString: string,
    value: JSONValue,
  ):
    | AttributeType
    | Dictionary<AttributeType | Array<AttributeType>>
    | Array<AttributeType>
    | null {
    let finalObj:
      | Dictionary<AttributeType | Array<AttributeType>>
      | AttributeType
      | Array<AttributeType>
      | null = null;
    const jsonValue: JSONObject = value as JSONObject;

    if (jsonValue && typeof jsonValue === "object") {
      // Handle both camelCase (JSON encoding) and snake_case (protobuf via protobufjs)
      if (
        Object.prototype.hasOwnProperty.call(jsonValue, "stringValue") ||
        Object.prototype.hasOwnProperty.call(jsonValue, "string_value")
      ) {
        const stringValue: JSONValue =
          jsonValue["stringValue"] ?? jsonValue["string_value"];
        finalObj =
          stringValue !== undefined && stringValue !== null
            ? (stringValue as string)
            : "";
      } else if (
        Object.prototype.hasOwnProperty.call(jsonValue, "intValue") ||
        Object.prototype.hasOwnProperty.call(jsonValue, "int_value")
      ) {
        const intValue: JSONValue =
          jsonValue["intValue"] ?? jsonValue["int_value"];
        if (intValue !== undefined && intValue !== null) {
          finalObj = intValue as number;
        }
      } else if (
        Object.prototype.hasOwnProperty.call(jsonValue, "doubleValue") ||
        Object.prototype.hasOwnProperty.call(jsonValue, "double_value")
      ) {
        const doubleValue: JSONValue =
          jsonValue["doubleValue"] ?? jsonValue["double_value"];
        if (doubleValue !== undefined && doubleValue !== null) {
          finalObj = doubleValue as number;
        }
      } else if (
        Object.prototype.hasOwnProperty.call(jsonValue, "boolValue") ||
        Object.prototype.hasOwnProperty.call(jsonValue, "bool_value")
      ) {
        finalObj = (jsonValue["boolValue"] ??
          jsonValue["bool_value"]) as boolean;
      } else if (
        (jsonValue["arrayValue"] &&
          (jsonValue["arrayValue"] as JSONObject)["values"]) ||
        (jsonValue["array_value"] &&
          (jsonValue["array_value"] as JSONObject)["values"])
      ) {
        const arrayVal: JSONObject = (jsonValue["arrayValue"] ||
          jsonValue["array_value"]) as JSONObject;
        const values: JSONArray = arrayVal["values"] as JSONArray;
        finalObj = values.map((v: JSONObject) => {
          return this.getAttributeValues(
            prefixKeysWithString,
            v,
          ) as AttributeType;
        }) as Array<AttributeType>;
      } else if (
        jsonValue["mapValue"] &&
        (jsonValue["mapValue"] as JSONObject)["fields"]
      ) {
        const fields: JSONObject = (jsonValue["mapValue"] as JSONObject)[
          "fields"
        ] as JSONObject;

        const flattenedFields: Dictionary<
          AttributeType | Array<AttributeType>
        > = {};
        for (const key in fields) {
          const nestedPrefix: string = `${prefixKeysWithString}.${key}`;
          const nestedValue:
            | AttributeType
            | Dictionary<AttributeType | Array<AttributeType>>
            | Array<AttributeType>
            | null = this.getAttributeValues(nestedPrefix, fields[key]);

          if (nestedValue === null) {
            flattenedFields[nestedPrefix] = null;
            continue;
          }

          if (Array.isArray(nestedValue)) {
            flattenedFields[nestedPrefix] = nestedValue;
            continue;
          }

          if (typeof nestedValue === "object") {
            for (const [nestedKey, nestedEntry] of Object.entries(
              nestedValue as Dictionary<AttributeType | Array<AttributeType>>,
            )) {
              flattenedFields[nestedKey] = nestedEntry as
                | AttributeType
                | Array<AttributeType>;
            }

            continue;
          }

          flattenedFields[nestedPrefix] = nestedValue as AttributeType;
        }

        finalObj = flattenedFields;
      } else if (
        (jsonValue["kvlistValue"] &&
          (jsonValue["kvlistValue"] as JSONObject)["values"]) ||
        (jsonValue["kvlist_value"] &&
          (jsonValue["kvlist_value"] as JSONObject)["values"])
      ) {
        const kvlistVal: JSONObject = (jsonValue["kvlistValue"] ||
          jsonValue["kvlist_value"]) as JSONObject;
        const values: JSONArray = kvlistVal["values"] as JSONArray;
        finalObj = this.getAttributes({
          prefixKeysWithString,
          items: values,
        });
      } else if ("nullValue" in jsonValue || "null_value" in jsonValue) {
        finalObj = null;
      }
    }

    return finalObj;
  }

  public static getAttributeKeys(
    attributes:
      | Dictionary<AttributeType | Array<AttributeType> | JSONObject>
      | JSONObject
      | undefined,
  ): Array<string> {
    if (!attributes || typeof attributes !== "object") {
      return [];
    }

    return Object.keys(attributes).sort();
  }
}
