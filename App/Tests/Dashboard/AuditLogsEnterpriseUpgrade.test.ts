jest.mock(
  "tippy.js/dist/tippy.css",
  () => {
    return {};
  },
  { virtual: true },
);

jest.mock(
  "tippy.js/themes/light-border.css",
  () => {
    return {};
  },
  { virtual: true },
);

jest.mock(
  "tippy.js/animations/shift-away-subtle.css",
  () => {
    return {};
  },
  { virtual: true },
);
jest.mock("Common/UI/Config", () => {
  return {
    BILLING_ENABLED: false,
    IS_ENTERPRISE_EDITION: false,
  };
});

import { isAuditLogsEnterpriseEligible } from "../../FeatureSet/Dashboard/src/Components/AuditLogs/AuditLogsEnterpriseUpgrade";

describe("AuditLogsEnterpriseUpgrade", () => {
  test("treats the community self-hosted build as eligible", () => {
    expect(isAuditLogsEnterpriseEligible()).toBe(true);
  });
});
