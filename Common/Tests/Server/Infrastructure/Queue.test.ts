import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import type { Job } from "bullmq";

const mockAdd: jest.Mock = jest.fn();
const mockClean: jest.Mock = jest.fn().mockResolvedValue(undefined);
const mockGetJob: jest.Mock = jest.fn();
const mockGetRepeatableJobs: jest.Mock = jest.fn().mockResolvedValue([]);
const mockRemoveRepeatableByKey: jest.Mock = jest.fn().mockResolvedValue(undefined);
const mockClientOn: jest.Mock = jest.fn();
const mockLoggerDebug: jest.Mock = jest.fn();
const mockLoggerError: jest.Mock = jest.fn();

const mockQueueInstance: Record<string, unknown> = {
  add: mockAdd,
  clean: mockClean,
  getJob: mockGetJob,
  getRepeatableJobs: mockGetRepeatableJobs,
  removeRepeatableByKey: mockRemoveRepeatableByKey,
  client: Promise.resolve({ on: mockClientOn }),
};

jest.mock("bullmq", () => {
  return {
    __esModule: true,
    Queue: jest.fn().mockImplementation(() => {
      return mockQueueInstance;
    }),
  };
});

jest.mock("@bull-board/express", () => {
  return {
    __esModule: true,
    ExpressAdapter: class {
      public setBasePath(): void {}
      public getRouter(): any {
        return {};
      }
    },
  };
});

jest.mock("@bull-board/api", () => {
  return {
    __esModule: true,
    createBullBoard: jest.fn(),
  };
});

jest.mock("@bull-board/api/bullMQAdapter", () => {
  return {
    __esModule: true,
    BullMQAdapter: class {},
  };
});

jest.mock("../../../Server/Infrastructure/Redis", () => {
  return {
    __esModule: true,
    default: {
      getRedisOptions: jest.fn().mockReturnValue({}),
      getClient: jest.fn().mockReturnValue({}),
      isConnected: jest.fn().mockReturnValue(true),
    },
  };
});

jest.mock("../../../Server/Utils/Logger", () => {
  return {
    __esModule: true,
    default: {
      debug: mockLoggerDebug,
      error: mockLoggerError,
    },
  };
});

jest.mock("../../../Server/Utils/Telemetry", () => {
  return {
    __esModule: true,
    default: {
      isMetricsEnabled: jest.fn().mockReturnValue(false),
      getObservableGauge: jest.fn(),
      recordExceptionMarkSpanAsErrorAndEndSpan: jest.fn(),
      startActiveSpan: jest.fn().mockImplementation(async (data: any) => {
        return await data.fn({
          setStatus: jest.fn(),
          recordException: jest.fn(),
          end: jest.fn(),
        });
      }),
    },
  };
});

import Queue, { QueueName } from "../../../Server/Infrastructure/Queue";

describe("Queue.addJob", () => {
  beforeEach(() => {
    jest.spyOn(Queue, "getQueue").mockReturnValue(mockQueueInstance as any);

    jest.clearAllMocks();
    mockGetRepeatableJobs.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("keeps an active job instead of failing when another worker holds the lock", async () => {
    const activeJob: Partial<Job> = {
      remove: jest.fn().mockRejectedValue(
        new Error(
          "Job Monitor-KeepCurrentStateConsistent could not be removed because it is locked by another worker",
        ),
      ),
    };

    mockGetJob.mockResolvedValue(activeJob);

    const returnedJob: Job = await Queue.addJob(
      QueueName.Worker,
      "Monitor:KeepCurrentStateConsistent",
      "Monitor:KeepCurrentStateConsistent",
      {},
      {},
    );

    expect(returnedJob).toBe(activeJob);
    expect((activeJob.remove as jest.Mock)).toHaveBeenCalledTimes(1);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockLoggerDebug).toHaveBeenCalledWith(
      expect.stringContaining("keeping active job Monitor-KeepCurrentStateConsistent"),
      { service: "workers" },
    );
  });

  test("rethrows non-lock removal errors", async () => {
    const activeJob: Partial<Job> = {
      remove: jest.fn().mockRejectedValue(new Error("redis is unavailable")),
    };

    mockGetJob.mockResolvedValue(activeJob);

    await expect(
      Queue.addJob(
        QueueName.Worker,
        "Monitor:KeepCurrentStateConsistent",
        "Monitor:KeepCurrentStateConsistent",
        {},
        {},
      ),
    ).rejects.toThrow("redis is unavailable");

    expect(mockAdd).not.toHaveBeenCalled();
  });
});
