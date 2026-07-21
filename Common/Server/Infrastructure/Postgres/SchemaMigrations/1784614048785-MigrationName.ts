import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrationName1784614048785 implements MigrationInterface {
  public name = "MigrationName1784614048785";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "CloudflareIntegration" ("_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL, "projectId" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" character varying(500), "cloudflareApiToken" character varying NOT NULL, "cloudflareAccountId" character varying(100) NOT NULL, "cloudflareZoneId" character varying(100) NOT NULL, "cloudflareZoneName" character varying(100) NOT NULL, "isEnabled" boolean NOT NULL DEFAULT true, "pollIntervalInMinutes" integer NOT NULL DEFAULT '5', "lastSyncedAt" TIMESTAMP WITH TIME ZONE, "lastSuccessfulSyncAt" TIMESTAMP WITH TIME ZONE, "nextSyncAt" TIMESTAMP WITH TIME ZONE, "syncStatus" character varying(100), "lastError" character varying(500), "lastErrorAt" TIMESTAMP WITH TIME ZONE, "createdByUserId" uuid, CONSTRAINT "PK_75a074e6955b9478c7817c9e760" PRIMARY KEY ("_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb04a6d12cea1ce9dc7c0d46e9" ON "CloudflareIntegration" ("projectId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4d6e2267712c7bb670175351a7" ON "CloudflareIntegration" ("name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c9138273a21d1857340ff7e7a5" ON "CloudflareIntegration" ("projectId", "cloudflareZoneId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" ADD CONSTRAINT "FK_fb04a6d12cea1ce9dc7c0d46e94" FOREIGN KEY ("projectId") REFERENCES "Project"("_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" ADD CONSTRAINT "FK_27f3c7f92c144ebd1ea6a8a228c" FOREIGN KEY ("createdByUserId") REFERENCES "User"("_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" DROP CONSTRAINT "FK_27f3c7f92c144ebd1ea6a8a228c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" DROP CONSTRAINT "FK_fb04a6d12cea1ce9dc7c0d46e94"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c9138273a21d1857340ff7e7a5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4d6e2267712c7bb670175351a7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb04a6d12cea1ce9dc7c0d46e9"`,
    );
    await queryRunner.query(`DROP TABLE "CloudflareIntegration"`);
  }
}
