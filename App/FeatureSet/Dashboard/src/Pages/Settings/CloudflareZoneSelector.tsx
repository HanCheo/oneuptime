import CloudflareIntegration from "Common/Models/DatabaseModels/CloudflareIntegration";
import HTTPErrorResponse from "Common/Types/API/HTTPErrorResponse";
import HTTPResponse from "Common/Types/API/HTTPResponse";
import URL from "Common/Types/API/URL";
import { JSONObject } from "Common/Types/JSON";
import { APP_API_URL } from "Common/UI/Config";
import API from "Common/UI/Utils/API/API";
import ModelAPI from "Common/UI/Utils/ModelAPI/ModelAPI";
import { CustomElementProps } from "Common/UI/Components/Forms/Types/Field";
import FormValues from "Common/UI/Components/Forms/Types/FormValues";
import React, {
  FunctionComponent,
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface CloudflareZoneOption {
  id: string;
  name: string;
  accountId: string;
}

const zonesById: Map<string, CloudflareZoneOption> = new Map();
let selectedCloudflareZones: Array<CloudflareZoneOption> = [];

export function getSelectedCloudflareZones(): Array<CloudflareZoneOption> {
  return selectedCloudflareZones;
}

export function getCloudflareZoneOption(
  zoneId: string,
): CloudflareZoneOption | undefined {
  return zonesById.get(zoneId);
}

export interface ComponentProps extends CustomElementProps {
  values: FormValues<CloudflareIntegration>;
  isMultiSelect?: boolean | undefined;
}

const CloudflareZoneSelector: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  const apiToken: string =
    typeof props.values.cloudflareApiToken === "string"
      ? props.values.cloudflareApiToken.trim()
      : "";
  const currentZoneId: string =
    typeof props.initialValue === "string" ? props.initialValue : "";
  const currentZoneName: string =
    typeof props.values.cloudflareZoneName === "string"
      ? props.values.cloudflareZoneName
      : currentZoneId;

  const [zones, setZones] = useState<Array<CloudflareZoneOption>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedZoneIds, setSelectedZoneIds] = useState<Array<string>>(
    currentZoneId ? [currentZoneId] : [],
  );

  const hasCurrentZoneOption: boolean = useMemo(() => {
    return zones.some((zone: CloudflareZoneOption) => {
      return zone.id === currentZoneId;
    });
  }, [zones, currentZoneId]);

  const fetchZones: () => Promise<void> = async (): Promise<void> => {
    if (!apiToken) {
      selectedCloudflareZones = [];
      setSelectedZoneIds([]);
      setZones([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response: HTTPResponse<JSONObject> | HTTPErrorResponse =
        await API.post<JSONObject>({
          url: URL.fromString(APP_API_URL.toString()).addRoute(
            "/cloudflare-integration/zones",
          ),
          data: {
            apiToken: apiToken,
          },
          headers: ModelAPI.getCommonHeaders(),
        });

      if (response instanceof HTTPErrorResponse) {
        throw response;
      }

      const fetchedZones: Array<CloudflareZoneOption> = (
        (response.data["zones"] as Array<JSONObject> | undefined) || []
      )
        .map((zone: JSONObject) => {
          return {
            id: String(zone["id"] || ""),
            name: String(zone["name"] || ""),
            accountId: String(zone["accountId"] || ""),
          };
        })
        .filter((zone: CloudflareZoneOption) => {
          return Boolean(zone.id && zone.name && zone.accountId);
        });

      for (const zone of fetchedZones) {
        zonesById.set(zone.id, zone);
      }

      setZones(fetchedZones);
    } catch (err) {
      setZones([]);
      setError(API.getFriendlyMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const updateSelectedZones: (zoneIds: Array<string>) => void = (
    zoneIds: Array<string>,
  ): void => {
    const selectedZones: Array<CloudflareZoneOption> = zones.filter(
      (zone: CloudflareZoneOption) => {
        return zoneIds.includes(zone.id);
      },
    );

    for (const zone of selectedZones) {
      zonesById.set(zone.id, zone);
    }

    selectedCloudflareZones = selectedZones;
    setSelectedZoneIds(zoneIds);
    props.onChange?.(zoneIds[0] || "");
  };

  useEffect(() => {
    void fetchZones();
  }, [apiToken]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {props.isMultiSelect ? (
          <div className="max-h-48 w-full overflow-y-auto rounded-md border border-gray-300 bg-white p-3 shadow-sm disabled:bg-gray-100">
            {!apiToken && (
              <p className="text-sm text-gray-500">Enter API token first</p>
            )}
            {apiToken && isLoading && (
              <p className="text-sm text-gray-500">
                Loading Cloudflare zones...
              </p>
            )}
            {apiToken && !isLoading && zones.length === 0 && (
              <p className="text-sm text-gray-500">
                No zones found for this token.
              </p>
            )}
            {zones.map((zone: CloudflareZoneOption) => {
              const isChecked: boolean = selectedZoneIds.includes(zone.id);

              return (
                <label
                  className="flex cursor-pointer items-center gap-2 py-1 text-sm text-gray-900"
                  key={zone.id}
                >
                  <input
                    checked={isChecked}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    onBlur={props.onBlur}
                    onChange={() => {
                      updateSelectedZones(
                        isChecked
                          ? selectedZoneIds.filter((zoneId: string) => {
                              return zoneId !== zone.id;
                            })
                          : [...selectedZoneIds, zone.id],
                      );
                    }}
                    type="checkbox"
                  />
                  <span>{zone.name}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <select
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
            disabled={!apiToken || isLoading}
            onBlur={props.onBlur}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              const zoneId: string = event.target.value;
              const zone: CloudflareZoneOption | undefined = zones.find(
                (item: CloudflareZoneOption) => {
                  return item.id === zoneId;
                },
              );

              if (zone) {
                zonesById.set(zone.id, zone);
              }

              props.onChange?.(zoneId);
            }}
            value={currentZoneId}
          >
            <option value="">
              {isLoading
                ? "Loading Cloudflare zones..."
                : apiToken
                  ? "Select a Cloudflare zone"
                  : "Enter API token first"}
            </option>
            {currentZoneId && !hasCurrentZoneOption && (
              <option value={currentZoneId}>{currentZoneName}</option>
            )}
            {zones.map((zone: CloudflareZoneOption) => {
              return (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              );
            })}
          </select>
        )}
        <button
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm disabled:bg-gray-100 disabled:text-gray-400"
          disabled={!apiToken || isLoading}
          onClick={() => {
            void fetchZones();
          }}
          type="button"
        >
          Refresh
        </button>
      </div>
      {(error || props.error) && (
        <p className="text-sm text-red-600">{error || props.error}</p>
      )}
    </div>
  );
};

export default CloudflareZoneSelector;
