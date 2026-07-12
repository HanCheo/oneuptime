import PageMap from "../../Utils/PageMap";
import RouteMap from "../../Utils/RouteMap";
import DiagnosticLogs from "./DiagnosticLogs";
import HealthPage from "./HealthPage";
import Route from "Common/Types/API/Route";
import React, { FunctionComponent, ReactElement } from "react";

const HealthLogs: FunctionComponent = (): ReactElement => {
  return (
    <HealthPage
      title="Diagnostic Logs"
      currentRoute={RouteMap[PageMap.HEALTH_LOGS] as Route}
    >
      <DiagnosticLogs />
    </HealthPage>
  );
};

export default HealthLogs;
