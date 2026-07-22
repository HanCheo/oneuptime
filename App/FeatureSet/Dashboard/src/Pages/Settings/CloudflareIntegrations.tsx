import ProjectUtil from "Common/UI/Utils/Project";
import PageComponentProps from "../PageComponentProps";
import FormFieldSchemaType from "Common/UI/Components/Forms/Types/FormFieldSchemaType";
import Field, {
  CustomElementProps,
} from "Common/UI/Components/Forms/Types/Field";
import { FormStep } from "Common/UI/Components/Forms/Types/FormStep";
import FormValues from "Common/UI/Components/Forms/Types/FormValues";
import { JSONValue } from "Common/Types/JSON";
import ModelTable from "Common/UI/Components/ModelTable/ModelTable";
import FieldType from "Common/UI/Components/Types/FieldType";
import Navigation from "Common/UI/Utils/Navigation";
import CloudflareIntegration from "Common/Models/DatabaseModels/CloudflareIntegration";
import ModelAPI from "Common/UI/Utils/ModelAPI/ModelAPI";
import CloudflareZoneSelector, {
  CloudflareZoneOption,
  getCloudflareZoneOption,
  getSelectedCloudflareZones,
} from "./CloudflareZoneSelector";
import React, { FunctionComponent, ReactElement } from "react";

const CloudflareIntegrations: FunctionComponent<
  PageComponentProps
> = (): ReactElement => {
  return (
    <ModelTable<CloudflareIntegration>
      modelType={CloudflareIntegration}
      query={{
        projectId: ProjectUtil.getCurrentProjectId()!,
      }}
      id="cloudflare-integrations-table"
      userPreferencesKey="settings-cloudflare-integrations-table"
      name="Settings > Cloudflare Integrations"
      saveFilterProps={{
        tableId: "settings-cloudflare-integrations-table",
      }}
      isDeleteable={true}
      isEditable={false}
      isViewable={true}
      isCreateable={true}
      cardProps={{
        title: "Cloudflare Integrations",
        description:
          "Poll Cloudflare zone analytics and ingest them as metrics through OneUptime telemetry.",
      }}
      noItemsMessage="No Cloudflare integrations configured. Add a Cloudflare zone to ingest request and bandwidth metrics."
      viewPageRoute={Navigation.getCurrentRoute()}
      formSteps={formSteps}
      formFields={formFields}
      onBeforeCreate={(
        item: CloudflareIntegration,
      ): Promise<CloudflareIntegration> => {
        const selectedZones: Array<CloudflareZoneOption> =
          getSelectedCloudflareZones();

        if (selectedZones.length === 0) {
          throw new Error("Select at least one Cloudflare zone.");
        }

        const sourceName: string | undefined = item.name;

        item.projectId = ProjectUtil.getCurrentProjectId()!;
        setCloudflareZoneOnIntegration({
          integration: item,
          zone: selectedZones[0]!,
          totalZones: selectedZones.length,
        });

        pendingCloudflareBulkCreate = {
          source: item,
          sourceName: sourceName,
          zones: selectedZones,
        };
        return Promise.resolve(item);
      }}
      onCreateSuccess={async (
        item: CloudflareIntegration,
      ): Promise<CloudflareIntegration> => {
        const pending: CloudflareBulkCreate | null =
          pendingCloudflareBulkCreate;
        pendingCloudflareBulkCreate = null;

        if (!pending || pending.zones.length <= 1) {
          return item;
        }

        for (const zone of pending.zones.slice(1)) {
          await ModelAPI.create<CloudflareIntegration>({
            model: buildCloudflareIntegrationForZone({
              source: pending.source,
              sourceName: pending.sourceName,
              zone: zone,
              totalZones: pending.zones.length,
            }),
            modelType: CloudflareIntegration,
          });
        }

        return item;
      }}
      showRefreshButton={true}
      searchableFields={["name", "description", "cloudflareZoneName"]}
      filters={[
        {
          field: {
            name: true,
          },
          title: "Name",
          type: FieldType.Text,
        },
        {
          field: {
            cloudflareZoneName: true,
          },
          title: "Zone Name",
          type: FieldType.Text,
        },
        {
          field: {
            isEnabled: true,
          },
          title: "Enabled",
          type: FieldType.Boolean,
        },
      ]}
      columns={[
        {
          field: {
            name: true,
          },
          title: "Name",
          type: FieldType.Text,
        },
        {
          field: {
            cloudflareZoneName: true,
          },
          title: "Zone Name",
          type: FieldType.Text,
        },
        {
          field: {
            isEnabled: true,
          },
          title: "Enabled",
          type: FieldType.Boolean,
        },
        {
          field: {
            syncStatus: true,
          },
          title: "Sync Status",
          type: FieldType.Text,
          noValueMessage: "Pending",
        },
        {
          field: {
            lastSyncedAt: true,
          },
          title: "Last Synced At",
          type: FieldType.DateTime,
          noValueMessage: "Never",
        },
      ]}
    />
  );
};

interface CloudflareBulkCreate {
  source: CloudflareIntegration;
  sourceName: string | undefined;
  zones: Array<CloudflareZoneOption>;
}

let pendingCloudflareBulkCreate: CloudflareBulkCreate | null = null;

function getCloudflareIntegrationName(data: {
  sourceName: string | undefined;
  zone: CloudflareZoneOption;
  totalZones: number;
}): string {
  if (data.totalZones <= 1) {
    return data.sourceName || data.zone.name;
  }

  return `${data.sourceName || "Cloudflare"} - ${data.zone.name}`;
}

function setCloudflareZoneOnIntegration(data: {
  integration: CloudflareIntegration;
  zone: CloudflareZoneOption;
  totalZones: number;
}): void {
  data.integration.cloudflareAccountId = data.zone.accountId;
  data.integration.cloudflareZoneId = data.zone.id;
  data.integration.cloudflareZoneName = data.zone.name;
  data.integration.name = getCloudflareIntegrationName({
    sourceName: data.integration.name,
    zone: data.zone,
    totalZones: data.totalZones,
  });
}

function buildCloudflareIntegrationForZone(data: {
  source: CloudflareIntegration;
  sourceName: string | undefined;
  zone: CloudflareZoneOption;
  totalZones: number;
}): CloudflareIntegration {
  const integration: CloudflareIntegration = new CloudflareIntegration();

  integration.projectId = ProjectUtil.getCurrentProjectId()!;
  integration.name = data.sourceName || data.zone.name;
  if (data.source.description !== undefined) {
    integration.description = data.source.description;
  }
  if (data.source.cloudflareApiToken !== undefined) {
    integration.cloudflareApiToken = data.source.cloudflareApiToken;
  }
  if (data.source.isEnabled !== undefined) {
    integration.isEnabled = data.source.isEnabled;
  }
  if (data.source.pollIntervalInMinutes !== undefined) {
    integration.pollIntervalInMinutes = data.source.pollIntervalInMinutes;
  }
  if (data.source.collectWebAnalyticsMetrics !== undefined) {
    integration.collectWebAnalyticsMetrics =
      data.source.collectWebAnalyticsMetrics;
  }
  if (data.source.collectDnsMetrics !== undefined) {
    integration.collectDnsMetrics = data.source.collectDnsMetrics;
  }
  if (data.source.collectLoadBalancerMetrics !== undefined) {
    integration.collectLoadBalancerMetrics =
      data.source.collectLoadBalancerMetrics;
  }
  if (data.source.collectWorkerScriptMetrics !== undefined) {
    integration.collectWorkerScriptMetrics =
      data.source.collectWorkerScriptMetrics;
  }
  if (data.source.collectRealtimeWebAnalyticsMetrics !== undefined) {
    integration.collectRealtimeWebAnalyticsMetrics =
      data.source.collectRealtimeWebAnalyticsMetrics;
  }

  setCloudflareZoneOnIntegration({
    integration: integration,
    zone: data.zone,
    totalZones: data.totalZones,
  });

  return integration;
}

const formSteps: Array<FormStep<CloudflareIntegration>> = [
  {
    title: "Basic Info",
    id: "basic-info",
  },
  {
    title: "Cloudflare Settings",
    id: "cloudflare-settings",
  },
  {
    title: "Polling",
    id: "polling",
  },
];

const formFields: Array<Field<CloudflareIntegration>> = [
  {
    field: {
      name: true,
    },
    stepId: "basic-info",
    title: "Name",
    fieldType: FormFieldSchemaType.Text,
    required: true,
    placeholder: "Production Cloudflare Zone",
    validation: {
      minLength: 2,
    },
  },
  {
    field: {
      description: true,
    },
    title: "Description",
    stepId: "basic-info",
    fieldType: FormFieldSchemaType.LongText,
    required: false,
    placeholder: "Primary production traffic zone.",
  },
  {
    field: {
      cloudflareApiToken: true,
    },
    title: "Cloudflare API Token",
    stepId: "cloudflare-settings",
    fieldType: FormFieldSchemaType.EncryptedText,
    required: true,
    placeholder: "Cloudflare API token with Analytics Read permissions",
  },
  {
    field: {
      cloudflareZoneId: true,
    },
    title: "Cloudflare Zone",
    stepId: "cloudflare-settings",
    fieldType: FormFieldSchemaType.CustomComponent,
    required: true,
    description: "Select a zone available to this Cloudflare API token.",
    getCustomElement: (
      values: FormValues<CloudflareIntegration>,
      props: CustomElementProps,
    ) => {
      return (
        <CloudflareZoneSelector
          {...props}
          isMultiSelect={true}
          values={values}
        />
      );
    },
    onChange: (
      value: JSONValue,
      currentFormValues: FormValues<CloudflareIntegration>,
      setNewFormValues: (
        currentFormValues: FormValues<CloudflareIntegration>,
      ) => void,
    ) => {
      const zone: CloudflareZoneOption | undefined = getCloudflareZoneOption(
        String(value || ""),
      );

      if (!zone) {
        return;
      }

      setNewFormValues({
        ...currentFormValues,
        cloudflareAccountId: zone.accountId,
        cloudflareZoneId: zone.id,
        cloudflareZoneName: zone.name,
      });
    },
  },
  {
    field: {
      isEnabled: true,
    },
    title: "Enabled",
    stepId: "polling",
    fieldType: FormFieldSchemaType.Toggle,
    required: false,
    description: "Poll this Cloudflare zone for metrics.",
  },
  {
    field: {
      collectWebAnalyticsMetrics: true,
    },
    title: "Collect Web Analytics Metrics",
    stepId: "polling",
    fieldType: FormFieldSchemaType.Toggle,
    required: false,
    description: "Collect Cloudflare web request and bandwidth metrics.",
  },
  {
    field: {
      collectDnsMetrics: true,
    },
    title: "Collect DNS Metrics",
    stepId: "polling",
    fieldType: FormFieldSchemaType.Toggle,
    required: false,
    description: "Collect Cloudflare DNS query metrics.",
  },
  {
    field: {
      collectLoadBalancerMetrics: true,
    },
    title: "Collect Load Balancer Metrics",
    stepId: "polling",
    fieldType: FormFieldSchemaType.Toggle,
    required: false,
    description: "Collect Cloudflare load balancer request metrics.",
  },
  {
    field: {
      collectWorkerScriptMetrics: true,
    },
    title: "Collect Worker Script Metrics",
    stepId: "polling",
    fieldType: FormFieldSchemaType.Toggle,
    required: false,
    description: "Collect Cloudflare Workers invocation metrics.",
  },
  {
    field: {
      collectRealtimeWebAnalyticsMetrics: true,
    },
    title: "Collect Realtime Web Analytics Metrics",
    stepId: "polling",
    fieldType: FormFieldSchemaType.Toggle,
    required: false,
    description: "Collect sampled Cloudflare realtime web analytics metrics.",
  },
  {
    field: {
      pollIntervalInMinutes: true,
    },
    title: "Poll Interval in Minutes",
    stepId: "polling",
    fieldType: FormFieldSchemaType.PositiveNumber,
    required: true,
    placeholder: "5",
    description:
      "How often OneUptime should poll Cloudflare. Allowed range: 1 to 60 minutes.",
  },
];

export default CloudflareIntegrations;
