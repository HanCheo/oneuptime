import Project from "./Project";
import User from "./User";
import BaseModel from "./DatabaseBaseModel/DatabaseBaseModel";
import Route from "../../Types/API/Route";
import ColumnAccessControl from "../../Types/Database/AccessControl/ColumnAccessControl";
import TableAccessControl from "../../Types/Database/AccessControl/TableAccessControl";
import ColumnLength from "../../Types/Database/ColumnLength";
import ColumnType from "../../Types/Database/ColumnType";
import CrudApiEndpoint from "../../Types/Database/CrudApiEndpoint";
import EnableDocumentation from "../../Types/Database/EnableDocumentation";
import TableColumn from "../../Types/Database/TableColumn";
import TableColumnType from "../../Types/Database/TableColumnType";
import TableMetadata from "../../Types/Database/TableMetadata";
import TenantColumn from "../../Types/Database/TenantColumn";
import IconProp from "../../Types/Icon/IconProp";
import ObjectID from "../../Types/ObjectID";
import Permission from "../../Types/Permission";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

const adminPermissions: Array<Permission> = [
  Permission.ProjectOwner,
  Permission.ProjectAdmin,
  Permission.ProjectMember,
  Permission.SettingsAdmin,
  Permission.SettingsMember,
];

const readPermissions: Array<Permission> = [
  Permission.ProjectOwner,
  Permission.ProjectAdmin,
  Permission.ProjectMember,
  Permission.Viewer,
  Permission.SettingsAdmin,
  Permission.SettingsMember,
  Permission.SettingsViewer,
];

@EnableDocumentation()
@TenantColumn("projectId")
@CrudApiEndpoint(new Route("/cloudflare-integration"))
@TableAccessControl({
  create: adminPermissions,
  read: readPermissions,
  delete: adminPermissions,
  update: adminPermissions,
})
@TableMetadata({
  tableName: "CloudflareIntegration",
  singularName: "Cloudflare Integration",
  pluralName: "Cloudflare Integrations",
  icon: IconProp.Cloud,
  tableDescription:
    "Cloudflare zone metrics integration. A worker polls Cloudflare Analytics and sends normalized OTLP metrics into OneUptime telemetry ingestion.",
})
@Index(["projectId", "cloudflareZoneId"], { unique: true })
@Entity({ name: "CloudflareIntegration" })
export default class CloudflareIntegration extends BaseModel {
  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: [],
  })
  @TableColumn({
    manyToOneRelationColumn: "projectId",
    type: TableColumnType.Entity,
    modelType: Project,
    title: "Project",
    description: "Project this Cloudflare integration belongs to.",
  })
  @ManyToOne(
    () => {
      return Project;
    },
    {
      eager: false,
      nullable: true,
      onDelete: "CASCADE",
      orphanedRowAction: "nullify",
    },
  )
  @JoinColumn({ name: "projectId" })
  public project?: Project = undefined;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: [],
  })
  @Index()
  @TableColumn({
    type: TableColumnType.ObjectID,
    required: true,
    canReadOnRelationQuery: true,
    title: "Project ID",
    description: "ID of the project this Cloudflare integration belongs to.",
  })
  @Column({
    type: ColumnType.ObjectID,
    nullable: false,
    transformer: ObjectID.getDatabaseTransformer(),
  })
  public projectId?: ObjectID = undefined;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @Index()
  @TableColumn({
    required: true,
    type: TableColumnType.ShortText,
    title: "Name",
    description: "Friendly name for this Cloudflare integration.",
    canReadOnRelationQuery: true,
    example: "Production Cloudflare Zone",
  })
  @Column({
    nullable: false,
    type: ColumnType.ShortText,
    length: ColumnLength.ShortText,
  })
  public name?: string = undefined;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: false,
    type: TableColumnType.LongText,
    title: "Description",
    description:
      "Friendly description that will help you remember this integration.",
  })
  @Column({
    nullable: true,
    type: ColumnType.LongText,
    length: ColumnLength.LongText,
  })
  public description?: string = undefined;

  @ColumnAccessControl({
    create: adminPermissions,
    read: [Permission.ProjectOwner, Permission.ProjectAdmin],
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.LongText,
    title: "Cloudflare API Token",
    description:
      "Cloudflare API token used to read Analytics API data for this zone. Stored encrypted at rest.",
    encrypted: true,
  })
  @Column({
    nullable: false,
    type: ColumnType.LongText,
  })
  public cloudflareApiToken?: string = undefined;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.ShortText,
    title: "Cloudflare Account ID",
    description: "Cloudflare account ID that owns the zone.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: false,
    type: ColumnType.ShortText,
    length: ColumnLength.ShortText,
  })
  public cloudflareAccountId?: string = undefined;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.ShortText,
    title: "Cloudflare Zone ID",
    description: "Cloudflare zone ID to collect metrics for.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: false,
    type: ColumnType.ShortText,
    length: ColumnLength.ShortText,
  })
  public cloudflareZoneId?: string = undefined;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.ShortText,
    title: "Cloudflare Zone Name",
    description: "Human-readable zone name, for example example.com.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: false,
    type: ColumnType.ShortText,
    length: ColumnLength.ShortText,
  })
  public cloudflareZoneName?: string = undefined;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.Boolean,
    title: "Enabled",
    description:
      "Whether OneUptime should poll Cloudflare metrics for this zone.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: false,
    type: ColumnType.Boolean,
    default: true,
  })
  public isEnabled?: boolean = true;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.Boolean,
    title: "Collect Web Analytics Metrics",
    description: "Collect Cloudflare web request and bandwidth metrics.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: false,
    type: ColumnType.Boolean,
    default: true,
  })
  public collectWebAnalyticsMetrics?: boolean = true;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.Boolean,
    title: "Collect DNS Metrics",
    description: "Collect Cloudflare DNS query metrics.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: false,
    type: ColumnType.Boolean,
    default: false,
  })
  public collectDnsMetrics?: boolean = false;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.Boolean,
    title: "Collect Load Balancer Metrics",
    description: "Collect Cloudflare load balancer request metrics.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: false,
    type: ColumnType.Boolean,
    default: false,
  })
  public collectLoadBalancerMetrics?: boolean = false;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.Boolean,
    title: "Collect Worker Script Metrics",
    description: "Collect Cloudflare Workers invocation metrics.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: false,
    type: ColumnType.Boolean,
    default: false,
  })
  public collectWorkerScriptMetrics?: boolean = false;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.Boolean,
    title: "Collect Realtime Web Analytics Metrics",
    description: "Collect sampled Cloudflare realtime web analytics metrics.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: false,
    type: ColumnType.Boolean,
    default: false,
  })
  public collectRealtimeWebAnalyticsMetrics?: boolean = false;

  @ColumnAccessControl({
    create: adminPermissions,
    read: readPermissions,
    update: adminPermissions,
  })
  @TableColumn({
    required: true,
    type: TableColumnType.Number,
    title: "Poll Interval (Minutes)",
    description: "How often OneUptime should poll Cloudflare for new metrics.",
  })
  @Column({
    nullable: false,
    type: ColumnType.Number,
    default: 5,
  })
  public pollIntervalInMinutes?: number = 5;

  @ColumnAccessControl({
    create: [],
    read: readPermissions,
    update: [],
  })
  @TableColumn({
    required: false,
    type: TableColumnType.Date,
    title: "Last Synced At",
    description:
      "End of the latest Cloudflare metric window successfully queued for ingestion.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: true,
    type: ColumnType.Date,
  })
  public lastSyncedAt?: Date = undefined;

  @ColumnAccessControl({
    create: [],
    read: readPermissions,
    update: [],
  })
  @TableColumn({
    required: false,
    type: TableColumnType.Date,
    title: "Last Successful Sync At",
    description:
      "When this integration last queued a Cloudflare metrics payload successfully.",
  })
  @Column({
    nullable: true,
    type: ColumnType.Date,
  })
  public lastSuccessfulSyncAt?: Date = undefined;

  @ColumnAccessControl({
    create: [],
    read: readPermissions,
    update: [],
  })
  @TableColumn({
    required: false,
    type: TableColumnType.Date,
    title: "Next Sync At",
    description: "When the worker should next poll this integration.",
    canReadOnRelationQuery: true,
  })
  @Column({
    nullable: true,
    type: ColumnType.Date,
  })
  public nextSyncAt?: Date = undefined;

  @ColumnAccessControl({
    create: [],
    read: readPermissions,
    update: [],
  })
  @TableColumn({
    required: false,
    type: TableColumnType.ShortText,
    title: "Sync Status",
    description: "Latest sync status: pending, success, or error.",
  })
  @Column({
    nullable: true,
    type: ColumnType.ShortText,
    length: ColumnLength.ShortText,
  })
  public syncStatus?: string = undefined;

  @ColumnAccessControl({
    create: [],
    read: readPermissions,
    update: [],
  })
  @TableColumn({
    required: false,
    type: TableColumnType.LongText,
    title: "Last Error",
    description: "Latest Cloudflare polling error, if any.",
  })
  @Column({
    nullable: true,
    type: ColumnType.LongText,
    length: ColumnLength.LongText,
  })
  public lastError?: string = undefined;

  @ColumnAccessControl({
    create: [],
    read: readPermissions,
    update: [],
  })
  @TableColumn({
    required: false,
    type: TableColumnType.Date,
    title: "Last Error At",
    description: "When the latest Cloudflare polling error happened.",
  })
  @Column({
    nullable: true,
    type: ColumnType.Date,
  })
  public lastErrorAt?: Date = undefined;

  @ColumnAccessControl({
    create: [],
    read: readPermissions,
    update: [],
  })
  @TableColumn({
    manyToOneRelationColumn: "createdByUserId",
    type: TableColumnType.Entity,
    modelType: User,
    title: "Created by User",
    description: "User who created this integration.",
  })
  @ManyToOne(
    () => {
      return User;
    },
    {
      eager: false,
      nullable: true,
      onDelete: "SET NULL",
      orphanedRowAction: "nullify",
    },
  )
  @JoinColumn({ name: "createdByUserId" })
  public createdByUser?: User = undefined;

  @ColumnAccessControl({
    create: [],
    read: readPermissions,
    update: [],
  })
  @TableColumn({
    type: TableColumnType.ObjectID,
    required: false,
    title: "Created by User ID",
    description: "ID of the user who created this integration.",
  })
  @Column({
    type: ColumnType.ObjectID,
    nullable: true,
    transformer: ObjectID.getDatabaseTransformer(),
  })
  public createdByUserId?: ObjectID = undefined;
}
