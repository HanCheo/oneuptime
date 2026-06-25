import ObjectID from "Common/Types/ObjectID";
import Includes from "Common/Types/BaseDatabase/Includes";
import TimeRange from "Common/Types/Time/TimeRange";

// @ts-expect-error Nested package path is used for this node-only regression test.
import * as React from "../../FeatureSet/Dashboard/node_modules/react";
// @ts-expect-error Nested package path is used for this node-only regression test.
import { renderToString } from "../../FeatureSet/Dashboard/node_modules/react-dom/server.node";

jest.mock(
  "tippy.js/dist/tippy.css",
  () => {
    return {};
  },
  { virtual: true },
);

jest.mock(
  "tippy.js/themes/light-border.css",
  () => {
    return {};
  },
  { virtual: true },
);

jest.mock(
  "tippy.js/animations/shift-away-subtle.css",
  () => {
    return {};
  },
  { virtual: true },
);

jest.mock("Common/UI/Config", () => {
  return {
    APP_API_URL: {
      toString() {
        return "http://localhost";
      },
    },
  };
});

jest.mock("Common/UI/Utils/API/API", () => {
  return {
    __esModule: true,
    default: {
      post: jest.fn(async () => {
        return {
          data: {},
        };
      }),
      getFriendlyMessage: jest.fn(() => {
        return "error";
      }),
    },
  };
});

jest.mock("Common/UI/Utils/ModelAPI/ModelAPI", () => {
  return {
    __esModule: true,
    default: {
      getList: jest.fn(async () => {
        return {
          data: [],
          count: 0,
        };
      }),
      updateById: jest.fn(async () => {
        return undefined;
      }),
      deleteItem: jest.fn(async () => {
        return undefined;
      }),
      getCommonHeaders: jest.fn(() => {
        return {};
      }),
    },
  };
});

jest.mock("Common/UI/Utils/AnalyticsModelAPI/AnalyticsModelAPI", () => {
  return {
    __esModule: true,
    default: {
      getList: jest.fn(async () => {
        return {
          data: [],
          count: 0,
        };
      }),
    },
  };
});

jest.mock("Common/UI/Utils/Realtime", () => {
  return {
    __esModule: true,
    default: {
      listenToAnalyticsModelEvent: jest.fn(() => {
        return () => {
          return undefined;
        };
      }),
    },
  };
});

jest.mock("Common/UI/Utils/LocalStorage", () => {
  return {
    getItem: jest.fn(() => {
      return null;
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };
});

jest.mock("Common/UI/Utils/Project", () => {
  return {
    __esModule: true,
    default: {
      getCurrentProjectId: jest.fn(() => {
        return null;
      }),
    },
  };
});

jest.mock("Common/UI/Components/Forms/ModelForm", () => {
  return {
    FormType: {
      Create: "create",
      Update: "update",
    },
  };
});

jest.mock("Common/UI/Components/Forms/Types/FormFieldSchemaType", () => {
  return {
    __esModule: true,
    default: {
      Text: "text",
      Checkbox: "checkbox",
    },
  };
});

jest.mock("Common/UI/Components/Button/Button", () => {
  return {
    ButtonStyleType: {
      DANGER: "danger",
    },
  };
});

jest.mock("Common/UI/Components/ErrorMessage/ErrorMessage", () => {
  return {
    __esModule: true,
    default: () => {
      return null;
    },
  };
});

jest.mock("Common/UI/Components/Modal/ConfirmModal", () => {
  return {
    __esModule: true,
    default: () => {
      return null;
    },
  };
});

jest.mock("Common/UI/Components/ModelFormModal/ModelFormModal", () => {
  return {
    __esModule: true,
    default: () => {
      return null;
    },
  };
});

jest.mock("Common/UI/Components/LogsViewer/LogsViewer", () => {
  return {
    __esModule: true,
    default: () => {
      return null;
    },
  };
});

(global as any).window = {
  process: {
    env: {},
  },
  location: {
    search: "",
    pathname: "/logs",
    hash: "",
  },
  history: {
    replaceState: jest.fn(),
  },
  setInterval,
  clearInterval,
};
(global as any).location = (global as any).window.location;

describe("DashboardLogsViewer", () => {
  test("renders with serviceIds without lexical initialization crashes", () => {
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
    // prettier-ignore
    const DashboardLogsViewer: React.ElementType = require("../../FeatureSet/Dashboard/src/Components/Logs/LogsViewer").default;
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

    expect(() => {
      renderToString(
        React.createElement(DashboardLogsViewer, {
          id: "logs-viewer-test",
          serviceIds: [new ObjectID("67b8f3e5f1d2c6a9b1234567")],
        }),
      );
    }).not.toThrow();
  });

  test("builds initial log query with persisted facet filters", () => {
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
    // prettier-ignore
    const { buildLogFilterOptions } = require("../../FeatureSet/Dashboard/src/Components/Logs/LogsViewer");
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

    const result: Record<string, unknown> = buildLogFilterOptions(
      {
        id: "logs-viewer-test",
        logQuery: {
          body: "worker",
        },
      },
      { range: TimeRange.PAST_ONE_HOUR },
      new Map([["severityText", new Set(["Debug", "Trace"])]]),
    );

    expect(result["body"]).toBe("worker");
    expect(result["severityText"]).toBeInstanceOf(Includes);
    expect((result["severityText"] as Includes).values).toEqual([
      "Debug",
      "Trace",
    ]);
    expect(result["time"]).toBeDefined();
  });

  test("uses an IN predicate for a single severity facet", () => {
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
    // prettier-ignore
    const { buildLogFilterOptions } = require("../../FeatureSet/Dashboard/src/Components/Logs/LogsViewer");
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

    const result: Record<string, unknown> = buildLogFilterOptions(
      {
        id: "logs-viewer-test",
      },
      { range: TimeRange.PAST_ONE_HOUR },
      new Map([["severityText", new Set(["Debug"])]]),
    );

    expect(result["severityText"]).toBeInstanceOf(Includes);
    expect((result["severityText"] as Includes).values).toEqual(["Debug"]);
  });
});
