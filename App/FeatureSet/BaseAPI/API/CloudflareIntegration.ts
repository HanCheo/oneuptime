import BadDataException from "Common/Types/Exception/BadDataException";
import { JSONArray, JSONObject } from "Common/Types/JSON";
import UserMiddleware from "Common/Server/Middleware/UserAuthorization";
import CommonAPI from "Common/Server/API/CommonAPI";
import DatabaseCommonInteractionProps from "Common/Types/BaseDatabase/DatabaseCommonInteractionProps";
import Express, {
  ExpressRequest,
  ExpressResponse,
  ExpressRouter,
  NextFunction,
} from "Common/Server/Utils/Express";
import Response from "Common/Server/Utils/Response";
import CloudflareGraphQLClient, {
  CloudflareZone,
} from "../../Workers/Utils/Cloudflare/CloudflareGraphQLClient";

export default class CloudflareIntegrationAPI {
  public getRouter(): ExpressRouter {
    const router: ExpressRouter = Express.getRouter();

    router.post(
      "/cloudflare-integration/zones",
      UserMiddleware.getUserMiddleware,
      async (
        req: ExpressRequest,
        res: ExpressResponse,
        next: NextFunction,
      ): Promise<void> => {
        try {
          const props: DatabaseCommonInteractionProps =
            await CommonAPI.getDatabaseCommonInteractionProps(req);

          if (!props.tenantId) {
            throw new BadDataException("Project not found in request");
          }

          const body: JSONObject = req.body as JSONObject;
          const apiToken: unknown = body["apiToken"];

          if (typeof apiToken !== "string" || apiToken.trim().length === 0) {
            throw new BadDataException("Cloudflare API token is required");
          }

          const zones: Array<CloudflareZone> =
            await CloudflareGraphQLClient.getZones(apiToken.trim());

          return Response.sendJsonObjectResponse(req, res, {
            zones: zones.map((zone: CloudflareZone) => {
              return {
                id: zone.id,
                name: zone.name,
                accountId: zone.accountId,
              };
            }) as JSONArray,
          });
        } catch (err) {
          next(err);
        }
      },
    );

    return router;
  }
}
