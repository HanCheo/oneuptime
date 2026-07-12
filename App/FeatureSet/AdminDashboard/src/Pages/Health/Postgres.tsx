import PageMap from "../../Utils/PageMap";
import RouteMap from "../../Utils/RouteMap";
import HealthPage from "./HealthPage";
import PostgresCluster from "./PostgresCluster";
import Route from "Common/Types/API/Route";
import React, { FunctionComponent, ReactElement } from "react";

const HealthPostgres: FunctionComponent = (): ReactElement => {
  return (
    <HealthPage
      title="PostgreSQL"
      currentRoute={RouteMap[PageMap.HEALTH_POSTGRES] as Route}
    >
      <PostgresCluster />
    </HealthPage>
  );
};

export default HealthPostgres;
