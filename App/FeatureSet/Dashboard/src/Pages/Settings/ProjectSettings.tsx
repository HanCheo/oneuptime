import ProjectTelemetryScopeAttributePicker, {
  selectedAttributeKeysFromFormValue,
} from "../../Components/Project/ProjectTelemetryScopeAttributePicker";
import ProjectUtil from "Common/UI/Utils/Project";
import PageComponentProps from "../PageComponentProps";
import FormFieldSchemaType from "Common/UI/Components/Forms/Types/FormFieldSchemaType";
import FormValues from "Common/UI/Components/Forms/Types/FormValues";
import CardModelDetail from "Common/UI/Components/ModelDetail/CardModelDetail";
import FieldType from "Common/UI/Components/Types/FieldType";
import Navigation from "Common/UI/Utils/Navigation";
import Project from "Common/Models/DatabaseModels/Project";
import { CustomElementProps } from "Common/UI/Components/Forms/Types/Field";
import React, { Fragment, FunctionComponent, ReactElement } from "react";
import { BILLING_ENABLED } from "Common/UI/Config";

const Settings: FunctionComponent<PageComponentProps> = (): ReactElement => {
  return (
    <Fragment>
      {/* Project Settings View  */}
      <CardModelDetail
        name="Project Details"
        cardProps={{
          title: "Project Details",
          description: "Here are more details for this Project.",
        }}
        isEditable={true}
        formFields={[
          {
            field: {
              name: true,
            },
            title: "Project Name",
            fieldType: FormFieldSchemaType.Text,
            required: true,
            placeholder: "Project Name",
            validation: {
              minLength: 2,
            },
          },
        ]}
        onSaveSuccess={() => {
          Navigation.reload();
        }}
        modelDetailProps={{
          modelType: Project,
          id: "model-detail-project",
          fields: [
            {
              field: {
                _id: true,
              },
              title: "Project ID",
              fieldType: FieldType.ObjectID,
            },
            {
              field: {
                name: true,
              },
              title: "Project Name",
            },
          ],
          modelId: ProjectUtil.getCurrentProjectId()!,
        }}
      />

      <CardModelDetail
        name="Indexed Service Scope Attributes"
        cardProps={{
          title: "Indexed Service Scope Attributes",
          description:
            "Choose which trace attribute keys should power fast service scope selectors for this project. The editor shows which keys are active by default, why a recommendation exists, and how much recent service coverage and value fan-out each key would add.",
        }}
        isEditable={true}
        formFields={[
          {
            field: {
              indexedServiceScopeAttributes: true,
            },
            title: "Indexed Service Scope Attributes",
            description:
              "Empty keeps the default fast selectors. Add extra keys only when their drilldown value is worth the additional selector surface area.",
            fieldType: FormFieldSchemaType.CustomComponent,
            getCustomElement: (
              values: FormValues<Project>,
              elementProps: CustomElementProps,
            ): ReactElement => {
              return (
                <ProjectTelemetryScopeAttributePicker
                  selectedAttributeKeys={selectedAttributeKeysFromFormValue(
                    (values as { indexedServiceScopeAttributes?: unknown })
                      .indexedServiceScopeAttributes,
                  )}
                  onChange={(keys: Array<string>) => {
                    elementProps.onChange?.(keys);
                  }}
                />
              );
            },
            required: false,
          },
        ]}
        onSaveSuccess={() => {
          Navigation.reload();
        }}
        modelDetailProps={{
          modelType: Project,
          id: "model-detail-project-indexed-scope-attributes",
          fields: [
            {
              field: {
                indexedServiceScopeAttributes: true,
              },
              title: "Indexed Service Scope Attributes",
              fieldType: FieldType.ArrayOfText,
              placeholder: "Using default selectors: Environment, Version",
            },
          ],
          modelId: ProjectUtil.getCurrentProjectId()!,
        }}
      />

      {/* Project Settings View  */}
      {BILLING_ENABLED && (
        <CardModelDetail
          name="Enable Customer Support Access"
          cardProps={{
            title: "Enable Customer Support Access",
            description:
              "Enable Customer Support Access to this project. This will allow Customer Support to access this project for troubleshooting purposes.",
          }}
          isEditable={true}
          formFields={[
            {
              field: {
                letCustomerSupportAccessProject: true,
              },
              title: "Let Customer Support Access Project",
              fieldType: FormFieldSchemaType.Toggle,
              required: false,
            },
          ]}
          onSaveSuccess={() => {
            Navigation.reload();
          }}
          modelDetailProps={{
            modelType: Project,
            id: "model-detail-project",
            fields: [
              {
                field: {
                  letCustomerSupportAccessProject: true,
                },
                fieldType: FieldType.Boolean,
                title: "Let Customer Support Access Project",
                placeholder: "No",
              },
            ],
            modelId: ProjectUtil.getCurrentProjectId()!,
          }}
        />
      )}
    </Fragment>
  );
};

export default Settings;
