import CloudflareIntegration from "../../../Models/DatabaseModels/CloudflareIntegration";
import CloudflareIntegrationService from "../../../Server/Services/CloudflareIntegrationService";
import { OnUpdate } from "../../../Server/Types/Database/Hooks";
import UpdateBy from "../../../Server/Types/Database/UpdateBy";
import { describe, expect, test } from "@jest/globals";

type CloudflareIntegrationServiceWithUpdateHook = {
  onBeforeUpdate(
    updateBy: UpdateBy<CloudflareIntegration>,
  ): Promise<OnUpdate<CloudflareIntegration>>;
};

function makeUpdateBy(
  data: Record<string, unknown>,
): UpdateBy<CloudflareIntegration> {
  return {
    query: {},
    data,
    limit: 1,
    skip: 0,
    props: {
      isRoot: true,
    },
  } as unknown as UpdateBy<CloudflareIntegration>;
}

describe("CloudflareIntegrationService poll interval", () => {
  test("normalizes form string updates and schedules immediate sync", async () => {
    const result: OnUpdate<CloudflareIntegration> = await (
      CloudflareIntegrationService as unknown as CloudflareIntegrationServiceWithUpdateHook
    ).onBeforeUpdate(
      makeUpdateBy({
        pollIntervalInMinutes: "1",
      }),
    );

    expect(result.updateBy.data.pollIntervalInMinutes).toBe(1);
    expect(result.updateBy.data.nextSyncAt).toBeInstanceOf(Date);
  });
});
