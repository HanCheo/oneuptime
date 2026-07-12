import ExceptionsViewer from "../../../Components/Exceptions/ExceptionsViewer";
import PageComponentProps from "../../PageComponentProps";
import ObjectID from "Common/Types/ObjectID";
import Navigation from "Common/UI/Utils/Navigation";
import React, { Fragment, FunctionComponent, ReactElement } from "react";
import { useOutletContext } from "react-router-dom";
import {
  normalizeServiceEnvironment,
  normalizeServiceVersion,
  ServiceTelemetryScopeContext,
} from "./environmentScope";

const ServiceExceptions: FunctionComponent<
  PageComponentProps
> = (): ReactElement => {
  const modelId: ObjectID = Navigation.getLastParamAsObjectID(1);
  const { selectedEnvironment, selectedVersion } =
    useOutletContext<ServiceTelemetryScopeContext>();
  const normalizedEnvironment: string =
    normalizeServiceEnvironment(selectedEnvironment);
  const normalizedVersion: string = normalizeServiceVersion(selectedVersion);

  return (
    <Fragment>
      <ExceptionsViewer
        primaryEntityId={modelId}
        environments={normalizedEnvironment ? [normalizedEnvironment] : []}
        releases={normalizedVersion ? [normalizedVersion] : []}
      />
    </Fragment>
  );
};

export default ServiceExceptions;
