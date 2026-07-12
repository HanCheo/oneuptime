import { describe, expect, test, beforeEach } from "@jest/globals";

/*
 * TelemetryBodyStore holds the raw OTLP payload out-of-band in Redis while
 * a BullMQ job references it by key. The critical invariant (the fix for the
 * deploy-time "Invalid resourceSpans format" bursts): a READ must NOT delete
 * the body — otherwise a job that fails a transient downstream error after
 * reading (e.g. ClickHouse not yet connected) loses its body, and every retry
 * decodes an empty payload and fails permanently. The body is reclaimed only
 * via deleteBody(), which the worker calls after the job succeeds.
 *
 * These tests back the store with an in-memory fake Redis client.
 */

const backingStore: Map<string, Buffer> = new Map();
let clientAvailable: boolean = true;
let lastSetArgs: Array<unknown> = [];
let connectCalls: number = 0;

const fakeClient: {
  status: string;
  connect: () => Promise<string>;
  set: (key: string, value: Buffer, ...rest: Array<unknown>) => Promise<string>;
  getBuffer: (key: string) => Promise<Buffer | null>;
  del: (key: string) => Promise<number>;
} = {
  status: "ready",
  connect: (): Promise<string> => {
    connectCalls++;
    fakeClient.status = "ready";
    return Promise.resolve("OK");
  },
  set: (
    key: string,
    value: Buffer,
    ...rest: Array<unknown>
  ): Promise<string> => {
    backingStore.set(key, value);
    lastSetArgs = [key, value, ...rest];
    return Promise.resolve("OK");
  },
  getBuffer: (key: string): Promise<Buffer | null> => {
    return Promise.resolve(
      backingStore.has(key) ? backingStore.get(key)! : null,
    );
  },
  del: (key: string): Promise<number> => {
    const existed: boolean = backingStore.delete(key);
    return Promise.resolve(existed ? 1 : 0);
  },
};

jest.mock("Common/Server/Infrastructure/Redis", () => {
  return {
    __esModule: true,
    default: {
      getClient: (): unknown => {
        return clientAvailable ? fakeClient : null;
      },
      isConnected: (): boolean => {
        return fakeClient.status === "ready";
      },
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
import TelemetryBodyStore from "../../FeatureSet/Telemetry/Utils/TelemetryBodyStore";

describe("TelemetryBodyStore lifecycle", () => {
  beforeEach(() => {
    backingStore.clear();
    clientAvailable = true;
    fakeClient.status = "ready";
    lastSetArgs = [];
    connectCalls = 0;
  });

  test("storeBody returns a namespaced key and writes with a 1-hour TTL", async () => {
    const buffer: Buffer = Buffer.from("otlp");
    const key: string = await TelemetryBodyStore.storeBody(buffer);

    expect(key.startsWith("telemetry:body:")).toBe(true);
    /*
     * Binary SET with an atomic 1h ("EX", 3600) expiry — the TTL is what
     * reclaims orphaned bodies from failed/dropped jobs.
     */
    expect(lastSetArgs).toEqual([key, buffer, "EX", 60 * 60]);
  });

  test("storeBody reconnects an idle Redis client before writing", async () => {
    fakeClient.status = "wait";

    await TelemetryBodyStore.storeBody(Buffer.from("otlp"));

    expect(connectCalls).toBe(1);
    expect(fakeClient.status).toBe("ready");
  });

  test("storeBody throws when no Redis client exists", async () => {
    clientAvailable = false;
    await expect(
      TelemetryBodyStore.storeBody(Buffer.from("x")),
    ).rejects.toThrow(/Redis not connected/);
  });

  test("readBody returns the stored body WITHOUT deleting it (retry-safe)", async () => {
    const key: string = await TelemetryBodyStore.storeBody(Buffer.from("otlp"));

    const first: Buffer | null = await TelemetryBodyStore.readBody(key);
    const second: Buffer | null = await TelemetryBodyStore.readBody(key);

    // Both reads succeed — a transient-failure retry can re-read the body.
    expect(first?.toString()).toBe("otlp");
    expect(second?.toString()).toBe("otlp");
    expect(backingStore.has(key)).toBe(true);
  });

  test("readBody tolerates a reconnecting Redis client", async () => {
    const key: string = await TelemetryBodyStore.storeBody(Buffer.from("otlp"));
    fakeClient.status = "reconnecting";

    await expect(TelemetryBodyStore.readBody(key)).resolves.toEqual(
      Buffer.from("otlp"),
    );
    expect(connectCalls).toBe(0);
  });

  test("deleteBody reclaims the body after the job succeeds", async () => {
    const key: string = await TelemetryBodyStore.storeBody(Buffer.from("otlp"));
    expect(backingStore.has(key)).toBe(true);

    await TelemetryBodyStore.deleteBody(key);

    expect(backingStore.has(key)).toBe(false);
    expect(await TelemetryBodyStore.readBody(key)).toBeNull();
  });

  test("readBody returns null for a lost/expired body", async () => {
    expect(
      await TelemetryBodyStore.readBody("telemetry:body:does-not-exist"),
    ).toBeNull();
  });

  test("readBody throws when no Redis client exists", async () => {
    clientAvailable = false;
    await expect(
      TelemetryBodyStore.readBody("telemetry:body:x"),
    ).rejects.toThrow(/Redis not connected/);
  });

  test("deleteBody is a no-op when no Redis client exists", async () => {
    clientAvailable = false;
    await expect(
      TelemetryBodyStore.deleteBody("telemetry:body:x"),
    ).resolves.toBeUndefined();
  });
});
