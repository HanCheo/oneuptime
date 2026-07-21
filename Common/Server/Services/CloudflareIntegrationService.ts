import DatabaseService from "./DatabaseService";
import Model from "../../Models/DatabaseModels/CloudflareIntegration";
import CreateBy from "../Types/Database/CreateBy";
import UpdateBy from "../Types/Database/UpdateBy";
import { OnCreate, OnUpdate } from "../Types/Database/Hooks";
import OneUptimeDate from "../../Types/Date";
import CaptureSpan from "../Utils/Telemetry/CaptureSpan";

const DEFAULT_POLL_INTERVAL_MINUTES: number = 5;
const MIN_POLL_INTERVAL_MINUTES: number = 1;
const MAX_POLL_INTERVAL_MINUTES: number = 60;

export class Service extends DatabaseService<Model> {
  public constructor() {
    super(Model);
  }

  @CaptureSpan()
  protected override async onBeforeCreate(
    createBy: CreateBy<Model>,
  ): Promise<OnCreate<Model>> {
    createBy.data.pollIntervalInMinutes = this.normalizePollInterval(
      createBy.data.pollIntervalInMinutes,
    );

    if (createBy.data.isEnabled === undefined) {
      createBy.data.isEnabled = true;
    }

    if (!createBy.data.nextSyncAt) {
      createBy.data.nextSyncAt = OneUptimeDate.getCurrentDate();
    }

    if (!createBy.data.syncStatus) {
      createBy.data.syncStatus = "pending";
    }

    return { createBy, carryForward: null };
  }

  @CaptureSpan()
  protected override async onBeforeUpdate(
    updateBy: UpdateBy<Model>,
  ): Promise<OnUpdate<Model>> {
    if (updateBy.data.pollIntervalInMinutes !== undefined) {
      updateBy.data.pollIntervalInMinutes = this.normalizePollInterval(
        updateBy.data.pollIntervalInMinutes,
      );
      updateBy.data.nextSyncAt = OneUptimeDate.getCurrentDate();
    }

    return { updateBy, carryForward: null };
  }

  private normalizePollInterval(
    value: number | (() => string) | null | undefined,
  ): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return DEFAULT_POLL_INTERVAL_MINUTES;
    }

    return Math.min(
      MAX_POLL_INTERVAL_MINUTES,
      Math.max(MIN_POLL_INTERVAL_MINUTES, Math.floor(value)),
    );
  }
}

export default new Service();
