import test from "node:test";
import assert from "node:assert";

test("jsx", async (t) => {
  await t.test("div w/ text children", () => {
    assert.strictEqual(<div>Hello, World!</div>, "<div>Hello, World!</div>");
  });

  await t.test("div w/ div w/ text children", () => {
    assert.strictEqual(
      <div>
        <div>Hello, World!</div>
      </div>,
      "<div><div>Hello, World!</div></div>"
    );
  });
});
