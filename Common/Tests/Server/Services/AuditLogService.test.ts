jest.mock("../../../Server/EnvironmentConfig", () => {
  return {
    ...jest.requireActual("../../../Server/EnvironmentConfig"),
    IsBillingEnabled: false,
    IsEnterpriseEdition: false,
  };
});
import { AuditLogService } from "../../../Server/Services/AuditLogService";
import DatabaseCommonInteractionProps from "../../../Types/BaseDatabase/DatabaseCommonInteractionProps";
import UserType from "../../../Types/UserType";

describe("AuditLogService", () => {
  test("allows enabled audit logs on the community self-hosted build", () => {
    const service: AuditLogService = new AuditLogService();

    const isEligible: boolean = (service as any).isEligible(
      {
        enableAuditLogs: true,
        retentionInDays: 7,
        storeSystemEventsInAuditLogs: false,
        planName: undefined,
        expiresAt: Date.now() + 1000,
      },
      {
        userType: UserType.User,
      } as DatabaseCommonInteractionProps,
    );

    expect(isEligible).toBe(true);
  });

  test("still skips system events when project settings disable them", () => {
    const service: AuditLogService = new AuditLogService();

    const isEligible: boolean = (service as any).isEligible(
      {
        enableAuditLogs: true,
        retentionInDays: 7,
        storeSystemEventsInAuditLogs: false,
        planName: undefined,
        expiresAt: Date.now() + 1000,
      },
      {
        isRoot: true,
      } as DatabaseCommonInteractionProps,
    );

    expect(isEligible).toBe(false);
  });
});
