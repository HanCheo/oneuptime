import React, { FunctionComponent, ReactElement } from "react";
import { normalizeServiceEnvironment } from "./environmentScope";

export interface ComponentProps {
  availableEnvironments: Array<string>;
  selectedEnvironment: string;
  onChange: (environment: string) => void;
}

const EnvironmentSelector: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement | null => {
  const options: Array<string> = Array.from(
    new Set(
      props.availableEnvironments
        .map((environment: string): string => {
          return normalizeServiceEnvironment(environment);
        })
        .filter((environment: string): boolean => {
          return Boolean(environment);
        }),
    ),
  ).sort((a: string, b: string): number => {
    return a.localeCompare(b);
  });

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor="service-environment-scope"
        className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-gray-500"
      >
        Environment
      </label>
      <select
        id="service-environment-scope"
        value={props.selectedEnvironment}
        disabled={options.length === 0}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => {
          props.onChange(event.target.value);
        }}
        className="min-w-0 w-full max-w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 lg:min-w-[220px]"
      >
        <option value="">All environments</option>
        {options.map((environment: string): ReactElement => {
          return (
            <option key={environment} value={environment}>
              {environment}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default EnvironmentSelector;
