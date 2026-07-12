import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexedServiceScopeAttributesToProject1783020000000
  implements MigrationInterface
{
  public name = "AddIndexedServiceScopeAttributesToProject1783020000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Project" ADD "indexedServiceScopeAttributes" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Project" DROP COLUMN "indexedServiceScopeAttributes"`,
    );
  }
}
