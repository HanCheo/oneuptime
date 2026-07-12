import React, { FunctionComponent, ReactElement, useEffect } from "react";
import MonitorStepMetricMonitor from "Common/Types/Monitor/MonitorStepMetricMonitor";
import MonitorCriteria from "Common/Types/Monitor/MonitorCriteria";
import MonitorCriteriaInstance from "Common/Types/Monitor/MonitorCriteriaInstance";
import {
  AnomalyDetectionSensitivity,
  CheckOn,
  FilterType,
} from "Common/Types/Monitor/CriteriaFilter";
import MetricView from "../../Metrics/MetricView";
import InBetween from "Common/Types/BaseDatabase/InBetween";
import RollingTimeUtil from "Common/Types/RollingTime/RollingTimeUtil";
import MetricViewData from "Common/Types/Metrics/MetricViewData";
import Card from "Common/UI/Components/Card/Card";
import HeaderAlert, {
  HeaderAlertType,
} from "Common/UI/Components/HeaderAlert/HeaderAlert";
import IconProp from "Common/Types/Icon/IconProp";
import ColorSwatch from "Common/Types/ColorSwatch";
import RollingTime from "Common/Types/RollingTime/RollingTime";
import Modal from "Common/UI/Components/Modal/Modal";
import DropdownUtil from "Common/UI/Utils/Dropdown";
import Dropdown, {
  DropdownOption,
  DropdownValue,
} from "Common/UI/Components/Dropdown/Dropdown";
import { GetReactElementFunction } from "Common/UI/Types/FunctionTypes";
import { AnomalyThresholdConfig } from "../../Metrics/MetricCharts";
import MetricQueryConfigData from "Common/Types/Metrics/MetricQueryConfigData";

export interface ComponentProps {
  monitorStepMetricMonitor: MonitorStepMetricMonitor | undefined;
  monitorCriteria?: MonitorCriteria | undefined;
}

const MetricMonitorPreview: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  const [rollingTime, setRollingTime] = React.useState<RollingTime>(
    props.monitorStepMetricMonitor?.rollingTime || RollingTimeUtil.getDefault(),
  );

  const rollingTimeDropdownOptions: DropdownOption[] =
    DropdownUtil.getDropdownOptionsFromEnum(RollingTime);

  const [modalTempRollingTime, setModalTempRollingTime] =
    React.useState<RollingTime | null>(null);

  const [showTimePickerModal, setShowTimePickerModal] =
    React.useState<boolean>(false);

  const initialStartAndEndDate: InBetween<Date> =
    RollingTimeUtil.convertToStartAndEndDate(
      props.monitorStepMetricMonitor?.rollingTime ||
        RollingTimeUtil.getDefault(),
    );

  const [startAndEndDate, setStartAndEndDate] = React.useState<InBetween<Date>>(
    initialStartAndEndDate,
  );

  useEffect(() => {
    setStartAndEndDate(RollingTimeUtil.convertToStartAndEndDate(rollingTime));
  }, [rollingTime]);

  const [metricViewData, setMetricViewData] = React.useState<MetricViewData>({
    startAndEndDate: startAndEndDate,
    queryConfigs:
      props.monitorStepMetricMonitor?.metricViewConfig.queryConfigs || [],
    formulaConfigs:
      props.monitorStepMetricMonitor?.metricViewConfig.formulaConfigs || [],
  });

  useEffect(() => {
    setMetricViewData({
      startAndEndDate: startAndEndDate,
      queryConfigs:
        props.monitorStepMetricMonitor?.metricViewConfig.queryConfigs || [],
      formulaConfigs:
        props.monitorStepMetricMonitor?.metricViewConfig.formulaConfigs || [],
    });
  }, [startAndEndDate]);

  const anomalyThresholdConfigs: Array<AnomalyThresholdConfig> = [];
  const criteriaInstances: Array<MonitorCriteriaInstance> =
    props.monitorCriteria?.data?.monitorCriteriaInstanceArray || [];
  for (const criteriaInstance of criteriaInstances) {
    if (criteriaInstance.data?.isEnabled === false) {
      continue;
    }

    for (const filter of criteriaInstance.data?.filters || []) {
      if (
        filter.checkOn !== CheckOn.MetricValue ||
        (filter.filterType !== FilterType.AnomalouslyHigh &&
          filter.filterType !== FilterType.AnomalouslyLow &&
          filter.filterType !== FilterType.Anomalous)
      ) {
        continue;
      }

      const metricAlias: string | undefined =
        filter.metricMonitorOptions?.metricAlias;
      const queryIndex: number =
        props.monitorStepMetricMonitor?.metricViewConfig.queryConfigs.findIndex(
          (queryConfig: MetricQueryConfigData) => {
            return queryConfig.metricAliasData?.metricVariable === metricAlias;
          },
        ) ?? -1;

      if (queryIndex < 0) {
        continue;
      }

      anomalyThresholdConfigs.push({
        queryIndex,
        filterType: filter.filterType,
        sensitivity:
          (filter.metricMonitorOptions?.anomalyDetection?.sensitivity as
            | AnomalyDetectionSensitivity
            | undefined) || AnomalyDetectionSensitivity.Medium,
        windowDays: filter.metricMonitorOptions?.anomalyDetection?.windowDays,
        minSamples: filter.metricMonitorOptions?.anomalyDetection?.minSamples,
      });
    }
  }

  const getStartAndEndDateElement: GetReactElementFunction =
    (): ReactElement => {
      return (
        <div>
          <HeaderAlert
            icon={IconProp.Clock}
            onClick={() => {
              // show modal
              setModalTempRollingTime(rollingTime);
              setShowTimePickerModal(true);
            }}
            title={`${rollingTime}`}
            alertType={HeaderAlertType.INFO}
            colorSwatch={ColorSwatch.Blue}
            tooltip="Click to change the date and time range of data."
          />
          {showTimePickerModal && (
            <Modal
              title="Select Time Range"
              onClose={() => {
                setModalTempRollingTime(null);
                setShowTimePickerModal(false);
              }}
              onSubmit={() => {
                if (modalTempRollingTime) {
                  setRollingTime(modalTempRollingTime);
                }
                setModalTempRollingTime(null);
                setShowTimePickerModal(false);
              }}
            >
              <div className="mt-5">
                <Dropdown
                  value={rollingTimeDropdownOptions.find(
                    (option: DropdownOption) => {
                      return option.value === modalTempRollingTime;
                    },
                  )}
                  onChange={(
                    range: DropdownValue | Array<DropdownValue> | null,
                  ) => {
                    setModalTempRollingTime(range as RollingTime);
                  }}
                  options={rollingTimeDropdownOptions}
                />
              </div>
            </Modal>
          )}
        </div>
      );
    };

  return (
    <Card
      title={"Metrics Preview"}
      description={"Preview of the metrics that match this monitor criteria"}
      rightElement={getStartAndEndDateElement()}
    >
      <MetricView
        data={metricViewData}
        hideQueryElements={true}
        chartCssClass="rounded-lg border border-gray-200 shadow-sm"
        hideStartAndEndDate={true}
        anomalyThresholdConfigs={anomalyThresholdConfigs}
        onChange={(data: MetricViewData) => {
          setMetricViewData(data);
        }}
      />
    </Card>
  );
};

export default MetricMonitorPreview;
