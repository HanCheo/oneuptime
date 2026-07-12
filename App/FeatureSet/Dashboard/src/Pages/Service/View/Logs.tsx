import DashboardLogsViewer from "../../../Components/Logs/LogsViewer";
import PageComponentProps from "../../PageComponentProps";
import ObjectID from "Common/Types/ObjectID";
import Navigation from "Common/UI/Utils/Navigation";
import React, {
  Fragment,
  FunctionComponent,
  ReactElement,
  useMemo,
} from "react";
import { useOutletContext } from "react-router-dom";
import Log from "Common/Models/AnalyticsModels/Log";
import Query from "Common/Types/BaseDatabase/Query";
import {
  getServiceTelemetryAttributeFilters,
  ServiceTelemetryScopeContext,
} from "./environmentScope";

const ServiceLogs: FunctionComponent<PageComponentProps> = (): ReactElement => {
  const modelId: ObjectID = Navigation.getLastParamAsObjectID(1);
  const { selectedEnvironment, selectedVersion } =
    useOutletContext<ServiceTelemetryScopeContext>();

  const logQuery: Query<Log> | undefined = useMemo(() => {
    const attributes: Record<string, string> | undefined =
      getServiceTelemetryAttributeFilters({
        environment: selectedEnvironment,
        version: selectedVersion,
      });

    if (!attributes) {
      return undefined;
    }

    return {
      attributes,
    };
  }, [selectedEnvironment, selectedVersion]);

  return (
    <Fragment>
      <DashboardLogsViewer
        id="service-logs"
        serviceIds={[modelId]}
        showFilters={true}
        enableRealtime={true}
        limit={100}
        noLogsMessage="No logs found for this service."
        logQuery={logQuery}
      />
    </Fragment>
  );
};

export default ServiceLogs;
