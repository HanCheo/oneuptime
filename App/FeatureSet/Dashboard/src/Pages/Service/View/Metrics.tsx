import MetricsViewer from "../../../Components/Metrics/MetricsViewer";
import PageComponentProps from "../../PageComponentProps";
import ObjectID from "Common/Types/ObjectID";
import Navigation from "Common/UI/Utils/Navigation";
import React, { Fragment, FunctionComponent, ReactElement } from "react";
import { useOutletContext } from "react-router-dom";
import {
  getServiceTelemetryAttributeFilterDisplayKeys,
  getServiceTelemetryAttributeFilters,
  ServiceTelemetryScopeContext,
} from "./environmentScope";

const ServiceMetrics: FunctionComponent<
  PageComponentProps
> = (): ReactElement => {
  const modelId: ObjectID = Navigation.getLastParamAsObjectID(1);
  const { selectedEnvironment, selectedVersion } =
    useOutletContext<ServiceTelemetryScopeContext>();

  return (
    <Fragment>
      <MetricsViewer
        serviceIds={[modelId]}
        serviceIdsToDisplay={[modelId]}
        attributeFilters={getServiceTelemetryAttributeFilters({
          environment: selectedEnvironment,
          version: selectedVersion,
        })}
        attributeFilterDisplayKeys={getServiceTelemetryAttributeFilterDisplayKeys(
          {
            environment: selectedEnvironment,
            version: selectedVersion,
          },
        )}
      />
    </Fragment>
  );
};

export default ServiceMetrics;
