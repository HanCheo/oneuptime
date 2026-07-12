import { afterEach, beforeAll, beforeEach, describe, expect, it, test } from "@jest/globals";
import type { Job, Queue as BullMQQueue, RepeatableJob } from "bullmq";
import Queue, { QueueName } from "../../../Server/Infrastructure/Queue";

const mockAdd: jest.Mock = jest.fn();
const mockClean: jest.Mock = jest.fn().mockResolvedValue(undefined);
const mockGetJob: jest.Mock = jest.fn();
const mockGetRepeatableJobs: jest.Mock = jest.fn().mockResolvedValue([]);
const mockRemoveRepeatableByKey: jest.Mock = jest
  .fn()
  .mockResolvedValue(undefined);
const mockClientOn: jest.Mock = jest.fn();
const mockLoggerDebug: jest.Mock = jest.fn();
const mockLoggerError: jest.Mock = jest.fn();

type MockBullQueue = {
  getRepeatableJobs: jest.Mock;
  removeRepeatableByKey: jest.Mock;
  getJob: jest.Mock;
  clean: jest.Mock;
  add: jest.Mock;
  client: Promise<{ on: jest.Mock }>;
};

const mockQueueInstance: MockBullQueue = {
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
      public getRouter(): unknown {
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
      startActiveSpan: jest.fn().mockImplementation(
        async (data: {
          fn: (span: {
            setStatus: jest.Mock;
            recordException: jest.Mock;
            end: jest.Mock;
          }) => Promise<unknown>;
        }) => {
          return await data.fn({
            setStatus: jest.fn(),
            recordException: jest.fn(),
            end: jest.fn(),
          });
        },
      ),
    },
  };
});

const repeatable: (name: string, key: string) => RepeatableJob = (
  name: string,
  key: string,
): RepeatableJob => {
  return {
    key: key,
    name: name,
    id: null,
    endDate: null,
    tz: null,
    pattern: "*/15 * * * *",
  };
};

describe("Queue.removeRepeatableByName", () => {
  let queue: MockBullQueue;

  beforeAll(() => {
    Queue.getQueue(QueueName.Worker);
    queue = mockQueueInstance;
  });

  beforeEach(() => {
    queue.getRepeatableJobs.mockReset().mockResolvedValue([]);
    queue.removeRepeatableByKey.mockReset().mockResolvedValue(true);
  });

  it("removes a repeatable whose name matches, using its key", async () => {
    queue.getRepeatableJobs.mockResolvedValue([
      repeatable("AIInsight:ScanForInsights", "aaaaaaaaaaaaaaaa"),
      repeatable("SentinelInsight:ScanForInsights", "86b9a73a59ccbe97264b573"),
    ]);

    const removedCount: number = await Queue.removeRepeatableByName(
      QueueName.Worker,
      "SentinelInsight:ScanForInsights",
    );

    expect(removedCount).toBe(1);
    expect(queue.removeRepeatableByKey).toHaveBeenCalledTimes(1);
    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith(
      "86b9a73a59ccbe97264b573",
    );
  });

  it("never passes the job name to removeRepeatableByKey", async () => {
    queue.getRepeatableJobs.mockResolvedValue([
      repeatable("SentinelInsight:ScanForInsights", "86b9a73a59ccbe97264b573"),
    ]);

    await Queue.removeRepeatableByName(
      QueueName.Worker,
      "SentinelInsight:ScanForInsights",
    );

    expect(queue.removeRepeatableByKey).not.toHaveBeenCalledWith(
      "SentinelInsight:ScanForInsights",
    );
    expect(queue.removeRepeatableByKey).not.toHaveBeenCalledWith(
      "SentinelInsight-ScanForInsights",
    );
  });

  it("removes every repeatable sharing the name and returns the count", async () => {
    queue.getRepeatableJobs.mockResolvedValue([
      repeatable("SentinelInsight:ScanForInsights", "key-one"),
      repeatable("SomeOther:Job", "key-two"),
      repeatable("SentinelInsight:ScanForInsights", "key-three"),
    ]);

    const removedCount: number = await Queue.removeRepeatableByName(
      QueueName.Worker,
      "SentinelInsight:ScanForInsights",
    );

    expect(removedCount).toBe(2);
    expect(
      queue.removeRepeatableByKey.mock.calls.map((c: Array<string>) => {
        return c[0];
      }),
    ).toEqual(["key-one", "key-three"]);
  });

  it("is a no-op when no repeatable has that name", async () => {
    queue.getRepeatableJobs.mockResolvedValue([
      repeatable("AIInsight:ScanForInsights", "aaaaaaaaaaaaaaaa"),
    ]);

    const removedCount: number = await Queue.removeRepeatableByName(
      QueueName.Worker,
      "SentinelInsight:ScanForInsights",
    );

    expect(removedCount).toBe(0);
    expect(queue.removeRepeatableByKey).not.toHaveBeenCalled();
  });

  it("does not count a repeatable BullMQ reported as not removed", async () => {
    queue.getRepeatableJobs.mockResolvedValue([
      repeatable("SentinelInsight:ScanForInsights", "key-one"),
    ]);
    queue.removeRepeatableByKey.mockResolvedValue(false);

    const removedCount: number = await Queue.removeRepeatableByName(
      QueueName.Worker,
      "SentinelInsight:ScanForInsights",
    );

    expect(removedCount).toBe(0);
  });

  it("skips the Redis round trip when the name is empty", async () => {
    const removedCount: number = await Queue.removeRepeatableByName(
      QueueName.Worker,
      "",
    );

    expect(removedCount).toBe(0);
    expect(queue.getRepeatableJobs).not.toHaveBeenCalled();
  });
});

describe("Queue.removeJob", () => {
  let queue: MockBullQueue;

  beforeAll(() => {
    Queue.getQueue(QueueName.Worker);
    queue = mockQueueInstance;
  });

  beforeEach(() => {
    queue.getJob.mockReset().mockResolvedValue(undefined);
    queue.removeRepeatableByKey.mockReset().mockResolvedValue(true);
  });

  it("passes the repeat key through unsanitized", async () => {
    await Queue.removeJob(QueueName.Worker, "myjob:someid:0::*/5 * * * *");

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith(
      "myjob:someid:0::*/5 * * * *",
    );
  });

  it("looks the one-off job up by its sanitized id", async () => {
    await Queue.removeJob(QueueName.Worker, "myjob:someid");

    expect(queue.getJob).toHaveBeenCalledWith("myjob-someid");
  });
});

describe("Queue.addJob", () => {
  beforeEach(() => {
    jest
      .spyOn(Queue, "getQueue")
      .mockReturnValue(mockQueueInstance as unknown as BullMQQueue);
    jest.clearAllMocks();
    mockGetRepeatableJobs.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("keeps an active job instead of failing when another worker holds the lock", async () => {
    const activeJob: Partial<Job> = {
      remove: jest
        .fn()
        .mockRejectedValue(
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
    expect(activeJob.remove as jest.Mock).toHaveBeenCalledTimes(1);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockLoggerDebug).toHaveBeenCalledWith(
      expect.stringContaining(
        "keeping active job Monitor-KeepCurrentStateConsistent",
      ),
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
