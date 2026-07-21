import ProjectUtil from "Common/UI/Utils/Project";
import PageComponentProps from "../PageComponentProps";
import FormFieldSchemaType from "Common/UI/Components/Forms/Types/FormFieldSchemaType";
import Field from "Common/UI/Components/Forms/Types/Field";
import { FormStep } from "Common/UI/Components/Forms/Types/FormStep";
import ModelTable from "Common/UI/Components/ModelTable/ModelTable";
import FieldType from "Common/UI/Components/Types/FieldType";
import Navigation from "Common/UI/Utils/Navigation";
import CloudflareIntegration from "Common/Models/DatabaseModels/CloudflareIntegration";
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
        item.projectId = ProjectUtil.getCurrentProjectId()!;
        return Promise.resolve(item);
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
            cloudflareZoneId: true,
          },
          title: "Zone ID",
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
      cloudflareAccountId: true,
    },
    title: "Cloudflare Account ID",
    stepId: "cloudflare-settings",
    fieldType: FormFieldSchemaType.Text,
    required: true,
    placeholder: "Cloudflare account ID",
  },
  {
    field: {
      cloudflareZoneId: true,
    },
    title: "Cloudflare Zone ID",
    stepId: "cloudflare-settings",
    fieldType: FormFieldSchemaType.Text,
    required: true,
    placeholder: "Cloudflare zone ID",
  },
  {
    field: {
      cloudflareZoneName: true,
    },
    title: "Cloudflare Zone Name",
    stepId: "cloudflare-settings",
    fieldType: FormFieldSchemaType.Text,
    required: true,
    placeholder: "example.com",
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
