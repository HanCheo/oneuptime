import PageMap from "../../Utils/PageMap";
import RouteMap, { RouteUtil } from "../../Utils/RouteMap";
import PageComponentProps from "../PageComponentProps";
import Route from "Common/Types/API/Route";
import ObjectID from "Common/Types/ObjectID";
import FormFieldSchemaType from "Common/UI/Components/Forms/Types/FormFieldSchemaType";
import Field from "Common/UI/Components/Forms/Types/Field";
import { FormStep } from "Common/UI/Components/Forms/Types/FormStep";
import ModelDelete from "Common/UI/Components/ModelDelete/ModelDelete";
import CardModelDetail from "Common/UI/Components/ModelDetail/CardModelDetail";
import FieldType from "Common/UI/Components/Types/FieldType";
import Navigation from "Common/UI/Utils/Navigation";
import CloudflareIntegration from "Common/Models/DatabaseModels/CloudflareIntegration";
import React, {
  Fragment,
  FunctionComponent,
  ReactElement,
  useState,
} from "react";

const CloudflareIntegrationView: FunctionComponent<PageComponentProps> = (
  _props: PageComponentProps,
): ReactElement => {
  const [modelId] = useState<ObjectID>(Navigation.getLastParamAsObjectID());

  return (
    <Fragment>
      <CardModelDetail<CloudflareIntegration>
        name="Cloudflare Integration Details"
        cardProps={{
          title: "Cloudflare Integration Details",
          description:
            "Here are more details for this Cloudflare metrics integration.",
        }}
        isEditable={true}
        formSteps={formSteps}
        formFields={formFields}
        modelDetailProps={{
          modelType: CloudflareIntegration,
          id: "model-detail-cloudflare-integration",
          fields: [
            {
              field: {
                _id: true,
              },
              title: "Cloudflare Integration ID",
              fieldType: FieldType.ObjectID,
            },
            {
              field: {
                name: true,
              },
              title: "Name",
            },
            {
              field: {
                description: true,
              },
              title: "Description",
              placeholder: "No description provided.",
            },
            {
              field: {
                cloudflareAccountId: true,
              },
              title: "Cloudflare Account ID",
            },
            {
              field: {
                cloudflareZoneId: true,
              },
              title: "Cloudflare Zone ID",
            },
            {
              field: {
                cloudflareZoneName: true,
              },
              title: "Cloudflare Zone Name",
            },
            {
              field: {
                isEnabled: true,
              },
              title: "Enabled",
              fieldType: FieldType.Boolean,
            },
            {
              field: {
                pollIntervalInMinutes: true,
              },
              title: "Poll Interval in Minutes",
              fieldType: FieldType.Minutes,
            },
            {
              field: {
                syncStatus: true,
              },
              title: "Sync Status",
              placeholder: "Pending",
            },
            {
              field: {
                lastSyncedAt: true,
              },
              title: "Last Synced At",
              fieldType: FieldType.DateTime,
              placeholder: "Never",
            },
            {
              field: {
                lastSuccessfulSyncAt: true,
              },
              title: "Last Successful Sync At",
              fieldType: FieldType.DateTime,
              placeholder: "Never",
            },
            {
              field: {
                nextSyncAt: true,
              },
              title: "Next Sync At",
              fieldType: FieldType.DateTime,
              placeholder: "Not scheduled",
            },
            {
              field: {
                lastError: true,
              },
              title: "Last Error",
              placeholder: "None",
            },
            {
              field: {
                lastErrorAt: true,
              },
              title: "Last Error At",
              fieldType: FieldType.DateTime,
              placeholder: "Never",
            },
          ],
          modelId: modelId,
        }}
      />

      <ModelDelete
        modelType={CloudflareIntegration}
        modelId={modelId}
        onDeleteSuccess={() => {
          Navigation.navigate(
            RouteUtil.populateRouteParams(
              RouteMap[PageMap.SETTINGS_CLOUDFLARE_INTEGRATIONS] as Route,
              { modelId },
            ),
          );
        }}
      />
    </Fragment>
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

export default CloudflareIntegrationView;
