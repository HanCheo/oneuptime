jest.mock("../../../../../Server/EnvironmentConfig", () => {
  return {
    ...jest.requireActual("../../../../../Server/EnvironmentConfig"),
    IsBillingEnabled: false,
    IsEnterpriseEdition: false,
  };
});

import ProjectSSO from "../../../../../Models/DatabaseModels/ProjectSso";
import ProjectOIDC from "../../../../../Models/DatabaseModels/ProjectOidc";
import ProjectSCIM from "../../../../../Models/DatabaseModels/ProjectSCIM";
import StatusPageSSO from "../../../../../Models/DatabaseModels/StatusPageSso";
import StatusPageOIDC from "../../../../../Models/DatabaseModels/StatusPageOidc";
import StatusPageSCIM from "../../../../../Models/DatabaseModels/StatusPageSCIM";
import GlobalSSO from "../../../../../Models/DatabaseModels/GlobalSso";
import GlobalOIDC from "../../../../../Models/DatabaseModels/GlobalOidc";
import GlobalSSOProject from "../../../../../Models/DatabaseModels/GlobalSsoProject";
import GlobalOIDCProject from "../../../../../Models/DatabaseModels/GlobalOidcProject";
import TeamComplianceSetting from "../../../../../Models/DatabaseModels/TeamComplianceSetting";
import EditionPermissions from "../../../../../Server/Types/Database/Permissions/EditionPermission";
import { DatabaseBaseModelType } from "../../../../../Models/DatabaseModels/DatabaseBaseModel/DatabaseBaseModel";
import DatabaseCommonInteractionProps from "../../../../../Types/BaseDatabase/DatabaseCommonInteractionProps";
import PaymentRequiredException from "../../../../../Types/Exception/PaymentRequiredException";

describe("EditionPermissions auth provider access", () => {
  const props: DatabaseCommonInteractionProps =
    {} as DatabaseCommonInteractionProps;
  const communityAccessibleModels: Array<DatabaseBaseModelType> = [
    ProjectSSO,
    ProjectOIDC,
    ProjectSCIM,
    StatusPageSSO,
    StatusPageOIDC,
    StatusPageSCIM,
    GlobalSSO,
    GlobalOIDC,
    GlobalSSOProject,
    GlobalOIDCProject,
  ];

  it.each(communityAccessibleModels)(
    "allows %p on the community build",
    (modelType: DatabaseBaseModelType) => {
      expect(() => {
        EditionPermissions.checkEditionPermissions(modelType, props);
      }).not.toThrow();
    },
  );

  it("still blocks unrelated enterprise-only models", () => {
    expect(() => {
      EditionPermissions.checkEditionPermissions(TeamComplianceSetting, props);
    }).toThrow(PaymentRequiredException);
  });
});
