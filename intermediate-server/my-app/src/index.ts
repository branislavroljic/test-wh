import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { promises as fs } from "fs";
import path from "path";

const app = new Hono();
const port = 3001;

// File path to store the tag
const versionFilePath = path.join(__dirname, "version.txt");

// Middleware to parse JSON bodies
app.use("*", async (c, next) => {
  try {
    const body = await c.req.json();
    c.req.body = body;
  } catch (e) {
    c.req.body = null;
  }
  await next();
});

app.post("/webhook", async (c) => {
  const payload = c.req.body;
  const event = c.req.header("x-github-event");

  if (!payload) {
    return c.json({ message: "No payload received" }, 400);
  }

  console.log(`Received event: ${event}`);
  if (event === "registry_package") {
    const action = payload.action;
    console.log(`Received action: ${action}`);
    if (action === "published") {
      const registryPackage = payload.registry_package;
      let tag = registryPackage?.package_version?.container_metadata?.tag?.name;
      tag = tag && tag.length ? tag : "latest";

      console.log(`Tag used: ${tag}`);

      if (tag) {
        await fs.writeFile(versionFilePath, tag);
        console.log("Release tag detected and stored");
      } else {
        console.log("No release tag detected");
      }
    } else {
      console.log("Action is not 'published'");
    }
  } else {
    console.log("Event is not 'registry_package'");
  }

  return c.json({ message: "Webhook processed successfully" }, 200);
});

app.get("/version", async (c) => {
  try {
    const tag = await fs.readFile(versionFilePath, "utf-8");
    return c.json({ version: tag });
  } catch (e) {
    return c.json({ message: "Version not found" }, 404);
  }
});

app.get("/", (c) => {
  return c.text("Hello Honoooo!");
});

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
