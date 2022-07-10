export interface State<T> {
  state: T;
  (nextState?: T | ((prevState: T) => T)): T;
}

// export type Serialisable<T> = T extends (...args: any[]) => any ? never : T;

export const useState = <T>(initialState: T): State<T> => {
  if (typeof initialState === "function") {
    throw new TypeError("initialState: must not be function!");
  }
  const state: State<T> = Object.assign(
    ((...args) => {
      const [nextState] = args;
      if (args.length) {
        if (typeof nextState === "function") {
          // @ts-expect-error
          state.state = nextState(state.state);
        } else {
          // @ts-expect-error
          state.state = nextState;
        }
      }
      return state.state;
    }) as State<T>,
    {
      state: initialState,
    }
  );
  return state;
};

export const idToFunction = new Map<string, Function>();
export const functionToId = new Map<Function, string>();

export const generateId = () => Math.random().toString().substring(2);

export const jsx = (
  tag: string,
  props: { children: unknown; [key: string]: unknown }
) => {
  console.log(tag, props);
  const { children, ...otherProps } = props;
  const domProperties = Object.entries(otherProps)
    .map(([key, value]) => {
      if (typeof value !== "function") {
        return [key, value].join("=");
      }
      let id = functionToId.get(value);
      if (!id) {
        id = generateId();
        functionToId.set(value, id);
        idToFunction.set(id, value);
      }

      return [key, `x("${id}")`].join("=");
    })
    .join(" ");
  return `<${[tag, domProperties].filter((i) => i).join(" ")}>
  ${
    Array.isArray(props.children)
      ? props.children
          .map((child) => (typeof child === "function" ? child() : child))
          .join("\n")
      : props.children
  }
</${tag}>`;
};

export const jsxs = jsx;

export interface Handler {
  (id: string): void;
  idToFunction: Map<string, Function>;
  state: (
    key: string,
    nextValue?: unknown | ((v: unknown) => unknown)
  ) => unknown;
}

type StateKey = string;
const globalState = new Map<StateKey, unknown>();

type SubId = string;
const subscriptions = new Map<StateKey, SubId[]>();

const stateFn: Handler["state"] = (...args) => {
  const [key, nextValue] = args;
  if (args.length > 1) {
    if (typeof nextValue === "function") {
      const prevValue = globalState.get(key);
      globalState.set(key, nextValue(prevValue));
    } else {
      globalState.set(key, nextValue);
    }
  }
  const value = globalState.get(key);
  const subId = generateId();
  subscriptions.set(key, (subscriptions.get(key) ?? []).concat(subId));
  return `<span subId="${subId}">${value}</span>`;
};

export const useX = (): Pick<Handler, "state"> => ({
  state: stateFn,
});

const bootstrap = () => {
  const x: Handler = async (id) => {
    console.log(id);
    const fnCached = x.idToFunction.get(id);
    if (fnCached) {
      return fnCached();
    }
    const fnRaw = await fetch(`/${id}.js`).then((res) => res.text());
    const fn = new Function(`(${fnRaw})()`);
    x.idToFunction.set(id, fn);
    return fn();
  };
  x.idToFunction = new Map();
  // @ts-expect-error
  const [initialState, initialSubscriptions] = [_state, _subscriptions] as [
    Record<string, unknown>,
    Record<string, string[]>
  ];
  const globalState = new Map(Object.entries(initialState));
  const subscriptions = new Map(Object.entries(initialSubscriptions));
  x.state = (...args) => {
    const [key, nextValue] = args;
    let value = globalState.get(key);
    if (args.length > 1) {
      if (typeof nextValue === "function") {
        value = nextValue(value);
        globalState.set(key, value);
      } else {
        value = nextValue;
        globalState.set(key, value);
      }
      const subIds = subscriptions.get(key) ?? [];
      subIds.forEach((subId) => {
        const element = document.querySelector(`span[subId="${subId}"]`);
        if (!element) {
          return;
        }
        element.innerHTML = `${value}`;
      });
    }
    return value;
  };

  // @ts-expect-error
  window.x = x;

  console.log("loaded");
};

export const render = (source: string) => {
  console.log(globalState);
  return `
<html>
<head>
  <title>X</title>
</head>
<body>
  ${source}
  <script>const _state = ${JSON.stringify(
    Object.fromEntries(globalState.entries())
  )};
  const _subscriptions = ${JSON.stringify(
    Object.fromEntries(subscriptions.entries())
  )};
  (${bootstrap.toString()})()
  </script>
</body>
</html>
`.trim();
};

export declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
