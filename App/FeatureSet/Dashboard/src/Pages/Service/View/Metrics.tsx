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

  const [serviceName, setServiceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  /*
   * Load the service name so telemetry can be scoped by the `service.name`
   * attribute rather than the service id — consistent with how the Host /
   * Kubernetes metric views scope by their resource attribute.
   */
  const fetchData: PromiseVoidFunction = async (): Promise<void> => {
    setIsLoading(true);
    setError("");
    try {
      const item: Service | null = await ModelAPI.getItem({
        modelType: Service,
        id: modelId,
        select: {
          name: true,
        },
      });

      if (!item?.name) {
        setError("Service not found.");
        setIsLoading(false);
        return;
      }

      setServiceName(item.name.toString());
    } catch (err) {
      setError(API.getFriendlyMessage(err));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData().catch((err: Error) => {
      setError(API.getFriendlyMessage(err));
    });
  }, []);

  if (isLoading) {
    return <PageLoader isVisible={true} />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!serviceName) {
    return <ErrorMessage message="Service not found." />;
  }

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
