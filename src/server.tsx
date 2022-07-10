import express from "express";
import { render, idToFunction, $ } from "./jsx-runtime";

const app = express();
const port = 3000;

// const sleep = (milliseconds: number) =>
// new Promise<void>((resolve) => setTimeout(() => resolve(), milliseconds));

async function getPosts() {
  // await sleep(2000);
  return [
    {
      title: "abc",
    },
    {
      title: "def",
    },
    {
      title: "ghi",
    },
  ];
}

declare module "./jsx-runtime" {
  interface $ {
    count: number;
  }
}

async function App() {
  // const count = useState(1);
  // const x = useX();
  $.count = 10;
  const increment = () => {
    $.count = $.count + 1;
  };
  const decrement = () => {
    $.count = $.count - 1;
  };
  const posts = await getPosts();
  return (
    <div>
      <h1>Counter</h1>
      <p>Count: {$.count}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
      <h1>Posts</h1>
      <ul>
        {posts.map((post) => (
          <li>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}

app.get("/", async (_req, res) => {
  return res.send(await render(<App />));
});

app.get("/:id.js", (req, res) => {
  const { id } = req.params;
  const fn = idToFunction.get(id);
  if (!fn) {
    res.sendStatus(404);
    return;
  }
  res.type("text/javascript");
  return res.send(
    `(${fn.toString().replace(/\b(\w+\.)(\$\.\w+)\b/g, "$2")})()`
  );
});

app.listen(port, () => {
  console.log(`listening on port: ${port}`);
});
