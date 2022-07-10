import express from "express";
import { render, idToFunction, useX } from "./jsx-runtime";

const app = express();
const port = 3000;

app.get("/", (_req, res) => {
  // const count = useState(1);
  const x = useX();
  x.state("count", 10);
  const increment = () => {
    console.log("increment!");
    x.state("count", (v: number) => v + 1);
    console.log(x.state("count"));
  };
  const component = (
    <div>
      <h1>Counter</h1>
      <p>Count: {x.state("count")}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
  return res.send(render(component));
});

app.get("/:id.js", (req, res) => {
  const { id } = req.params;
  const fn = idToFunction.get(id);
  if (!fn) {
    res.sendStatus(404);
    return;
  }
  return res.send(fn.toString());
});

app.listen(port, () => {
  console.log(`listening on port: ${port}`);
});
