export interface $ {
  [key: string]: unknown;
}

type StateKey = string;
type SubId = string;

type $State = Map<StateKey, unknown>;
type $Subscriptions = Map<StateKey, SubId[]>;

const $$ = (options?: { state?: $State; subscriptions?: $Subscriptions }) => {
  const state = options?.state ?? (new Map() as $State);
  const subscriptions = options?.subscriptions ?? (new Map() as $Subscriptions);

  return new Proxy({} as $, {
    get(_, _key) {
      const key = _key as string;
      const value = state.get(key);
      if ("document" in globalThis) {
        return value;
      }
      const subId = generateId();
      subscriptions.set(key, (subscriptions.get(key) ?? []).concat(subId));
      return `<span subId="${subId}">${value}</span>`;
    },
    set(_, _key, value) {
      const key = _key as string;
      state.set(key, value);
      if ("document" in globalThis) {
        const subIds = subscriptions.get(key as string) ?? [];
        subIds.forEach((subId) => {
          const element = document.querySelector(`span[subId="${subId}"]`);
          if (!element) {
            return;
          }
          element.innerHTML = `${value}`;
        });
      }
      return true;
    },
  });
};

const state: $State = new Map();
const subscriptions: $Subscriptions = new Map();

export const $ = $$({ state, subscriptions });

export const idToFunction = new Map<string, Function>();
export const functionToId = new Map<Function, string>();

export const generateId = () => Math.random().toString().substring(2);

export const jsx = async (
  tag: string | (() => string | Promise<string>),
  props: { children: unknown; [key: string]: unknown }
) => {
  if (typeof tag === "function") {
    return tag();
  }
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
      ? (
          await Promise.all(
            props.children.map((child) =>
              typeof child === "function" ? child() : child
            )
          )
        ).join("\n")
      : await props.children
  }
</${tag}>`;
};

export const jsxs = jsx;

export interface Handler {
  (id: string): void;
  idToFunction: Map<string, Function>;
}

const bootstrap = () => {
  const x: Handler = async (id) => {
    console.log(id);
    const fnCached = x.idToFunction.get(id);
    if (fnCached) {
      return fnCached();
    }
    const fnRaw = await fetch(`/${id}.js`).then((res) => res.text());
    const fn = new Function(fnRaw);
    x.idToFunction.set(id, fn);
    return fn();
  };
  x.idToFunction = new Map();

  // @ts-expect-error
  window.x = x;
};

const strobj = (map: Map<string, unknown>) =>
  JSON.stringify(Object.fromEntries(map.entries()));

export const render = async (source: string | Promise<string>) => {
  return `
<html>
<head>
  <title>X</title>
</head>
<body>
  ${await source}
  <script>
(${bootstrap.toString()})();
window.$ = (${$$.toString()})({
  state: new Map(Object.entries(${strobj(state)})),
  subscriptions: new Map(Object.entries(${strobj(subscriptions)})),
});
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
