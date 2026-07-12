import React, { FunctionComponent, ReactElement } from "react";
import { normalizeServiceVersion } from "./environmentScope";

export interface ComponentProps {
  availableVersions: Array<string>;
  selectedVersion: string;
  onChange: (version: string) => void;
}

const VersionSelector: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement | null => {
  const options: Array<string> = Array.from(
    new Set(
      props.availableVersions
        .map((version: string): string => {
          return normalizeServiceVersion(version);
        })
        .filter((version: string): boolean => {
          return Boolean(version);
        }),
    ),
  ).sort((a: string, b: string): number => {
    return a.localeCompare(b, undefined, { numeric: true });
  });

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor="service-version-scope"
        className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-gray-500"
      >
        Version
      </label>
      <select
        id="service-version-scope"
        value={props.selectedVersion}
        disabled={options.length === 0}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => {
          props.onChange(event.target.value);
        }}
        className="min-w-0 w-full max-w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 lg:min-w-[220px]"
      >
        <option value="">All versions</option>
        {options.map((version: string): ReactElement => {
          return (
            <option key={version} value={version}>
              {version}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default VersionSelector;
