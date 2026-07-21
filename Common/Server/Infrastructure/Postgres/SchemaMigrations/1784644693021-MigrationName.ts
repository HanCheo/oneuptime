import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrationName1784644693021 implements MigrationInterface {
  public name = "MigrationName1784644693021";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" ADD "collectWebAnalyticsMetrics" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" ADD "collectDnsMetrics" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" ADD "collectLoadBalancerMetrics" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" ADD "collectWorkerScriptMetrics" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" ADD "collectRealtimeWebAnalyticsMetrics" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" DROP COLUMN "collectRealtimeWebAnalyticsMetrics"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" DROP COLUMN "collectWorkerScriptMetrics"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" DROP COLUMN "collectLoadBalancerMetrics"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" DROP COLUMN "collectDnsMetrics"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CloudflareIntegration" DROP COLUMN "collectWebAnalyticsMetrics"`,
    );
  }
}
