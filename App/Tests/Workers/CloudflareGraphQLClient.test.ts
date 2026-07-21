import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import axios from "axios";

jest.mock("axios", () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      isAxiosError: jest.fn(),
      post: jest.fn(),
    },
  };
});

import CloudflareGraphQLClient from "../../FeatureSet/Workers/Utils/Cloudflare/CloudflareGraphQLClient";

const axiosGetMock: jest.MockedFunction<typeof axios.get> =
  axios.get as jest.MockedFunction<typeof axios.get>;

const axiosResponse: (
  data: unknown,
) => Awaited<ReturnType<typeof axios.get>> = (
  data: unknown,
): Awaited<ReturnType<typeof axios.get>> => {
  return { data: data } as Awaited<ReturnType<typeof axios.get>>;
};

describe("CloudflareGraphQLClient.getZones", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("lists every zone visible to the token", async () => {
    axiosGetMock
      .mockResolvedValueOnce(
        axiosResponse({
          result: [
            {
              id: "zone-a",
              name: "example.com",
              account: { id: "account-a" },
            },
          ],
          result_info: { total_pages: 2 },
        }),
      )
      .mockResolvedValueOnce(
        axiosResponse({
          result: [
            {
              id: "zone-b",
              name: "example.net",
              account: { id: "account-b" },
            },
          ],
          result_info: { total_pages: 2 },
        }),
      );

    await expect(CloudflareGraphQLClient.getZones("token-1")).resolves.toEqual([
      { id: "zone-a", name: "example.com", accountId: "account-a" },
      { id: "zone-b", name: "example.net", accountId: "account-b" },
    ]);

    expect(axiosGetMock).toHaveBeenCalledTimes(2);
    expect(axiosGetMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer token-1" },
      params: { page: 1, per_page: 50 },
    });
    expect(axiosGetMock.mock.calls[1]?.[1]).toMatchObject({
      params: { page: 2, per_page: 50 },
    });
  });

  test("surfaces Cloudflare API errors", async () => {
    axiosGetMock.mockResolvedValueOnce(
      axiosResponse({
        errors: [{ message: "token cannot list zones" }],
      }),
    );

    await expect(CloudflareGraphQLClient.getZones("bad-token")).rejects.toThrow(
      "token cannot list zones",
    );
  });
});
