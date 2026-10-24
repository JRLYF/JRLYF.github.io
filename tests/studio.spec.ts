import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const repository = "/repos/LYF0422/LYF0422.github.io";
const token = "test-session-token-not-a-real-secret";
const seedPath = "src/content/posts/remote-note.md";
const seedSource =
  "---\ntitle: 远端记录\ndescription: 一篇测试记录\npubDatetime: 2026-10-01T12:00:00+08:00\ncategory: anime\ndraft: true\ntags: [anime]\n---\n\n原始正文。\n";
const hash = (value: string) => createHash("sha1").update(value).digest("hex");

async function mockGitHub(page: Page) {
  const blobs = new Map<string, { content: string; encoding: string }>();
  const seedSha = hash(seedSource);
  blobs.set(seedSha, {
    content: Buffer.from(seedSource).toString("base64"),
    encoding: "base64",
  });
  let files = new Map([
    [seedPath, seedSha],
    ["README.md", "readme-original"],
  ]);
  let head = "head-initial";
  let treeSha = "tree-initial";
  const trees = new Map<string, Map<string, string>>([
    [treeSha, new Map(files)],
  ]);
  const commits = new Map([
    [head, { tree: { sha: treeSha }, parents: [] as string[] }],
  ]);
  const calls: { method: string; path: string; data: any }[] = [];
  let counter = 0;
  const control = {
    failBlob: false,
    race: false,
    mutateArticle() {
      const source = seedSource.replace("原始正文", "来自另一台设备的更新");
      const sha = hash(source);
      blobs.set(sha, {
        content: Buffer.from(source).toString("base64"),
        encoding: "base64",
      });
      files = new Map(files);
      files.set(seedPath, sha);
      head = "head-other-device";
      treeSha = "tree-other-device";
      trees.set(treeSha, new Map(files));
      commits.set(head, { tree: { sha: treeSha }, parents: [] });
    },
    media() {
      return [...files]
        .filter(([path]) => path.startsWith("public/images/studio/"))
        .map(([path, sha]) => ({ path, base64: blobs.get(sha)!.content }));
    },
    get calls() {
      return calls;
    },
    get files() {
      return files;
    },
    source(path: string) {
      const blob = blobs.get(files.get(path)!);
      return blob
        ? Buffer.from(blob.content, "base64").toString("utf8")
        : undefined;
    },
  };
  await page.route("https://api.github.com/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = decodeURIComponent(url.pathname);
    const data = request.postDataJSON();
    calls.push({ method, path, data });
    const respond = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body),
      });
    if (method === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
          "access-control-allow-headers": "*",
        },
      });
    expect(request.headers().authorization).toBe(`Bearer ${token}`);
    if (path === "/user") return respond({ login: "LYF0422", avatar_url: "" });
    if (path === repository)
      return respond({ permissions: { push: true }, default_branch: "main" });
    if (path === `${repository}/git/ref/heads/main`)
      return respond({ object: { sha: head } });
    if (path.startsWith(`${repository}/git/commits/`) && method === "GET")
      return respond(commits.get(path.split("/").pop()!)!);
    if (path.startsWith(`${repository}/git/trees/`) && method === "GET") {
      const entries = trees.get(path.split("/").pop()!)!;
      return respond({
        tree: [...entries].map(([path, sha]) => ({ path, sha, type: "blob" })),
        truncated: false,
      });
    }
    if (path.startsWith(`${repository}/git/blobs/`) && method === "GET")
      return respond(blobs.get(path.split("/").pop()!)!);
    if (path === `${repository}/git/blobs` && method === "POST") {
      if (control.failBlob) {
        control.failBlob = false;
        return respond({ message: "Temporary failure" }, 503);
      }
      const sha = hash(`${data.encoding}:${data.content}`);
      blobs.set(sha, {
        content:
          data.encoding === "base64"
            ? data.content
            : Buffer.from(data.content).toString("base64"),
        encoding: "base64",
      });
      return respond({ sha }, 201);
    }
    if (path === `${repository}/git/trees` && method === "POST") {
      const next = new Map(trees.get(data.base_tree));
      for (const entry of data.tree) next.set(entry.path, entry.sha);
      const sha = `tree-created-${++counter}`;
      trees.set(sha, next);
      return respond({ sha }, 201);
    }
    if (path === `${repository}/git/commits` && method === "POST") {
      const sha = `commit-created-${++counter}`;
      commits.set(sha, { tree: { sha: data.tree }, parents: data.parents });
      return respond({ sha }, 201);
    }
    if (path === `${repository}/git/refs/heads/main` && method === "PATCH") {
      expect(data.force).toBe(false);
      if (control.race) {
        control.race = false;
        head = "head-unrelated-update";
        treeSha = "tree-unrelated-update";
        files = new Map(files);
        files.set("README.md", "readme-other-device");
        trees.set(treeSha, new Map(files));
        commits.set(head, { tree: { sha: treeSha }, parents: [] });
        return respond({ message: "Not a fast forward" }, 422);
      }
      const commit = commits.get(data.sha)!;
      if (commit.parents[0] !== head)
        return respond({ message: "Not a fast forward" }, 422);
      head = data.sha;
      treeSha = commit.tree.sha;
      files = new Map(trees.get(treeSha));
      return respond({ object: { sha: head } });
    }
    return respond(
      { message: `Unhandled test request ${method} ${path}` },
      404
    );
  });
  return control;
}

async function connect(page: Page) {
  await page.goto("/studio/");
  await expect(page.locator("#connect-dialog")).toBeVisible();
  await page.locator("#github-token").fill(token);
  await page.locator("#confirm-connect").click();
  await expect(page.locator("#connect-dialog")).not.toBeVisible();
  await expect(page.locator("#remote-documents button")).toHaveCount(1);
}
async function write(
  page: Page,
  title: string,
  body = "这是一篇值得留下的记录。"
) {
  await page.locator("#document-title").fill(title);
  await page.locator(".tiptap").fill(body);
  await expect(page.locator("#save-status")).toHaveText("已自动保存在本机");
}
async function pasteImage(page: Page) {
  await page.locator(".tiptap").click();
  await page.locator(".tiptap").press("ControlOrMeta+End");
  await page.locator(".tiptap").press("Enter");
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#53674e";
    ctx.fillRect(0, 0, 120, 80);
    const blob = await new Promise<Blob>(resolve =>
      canvas.toBlob(value => resolve(value!), "image/png")
    );
    const data = new DataTransfer();
    data.items.add(new File([blob], "clipboard.png", { type: "image/png" }));
    document.querySelector(".tiptap")!.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      })
    );
  });
  await expect(page.locator(".studio-image-node img")).toBeVisible();
}

test("pastes and formats images, atomically publishes an Anime article, and restores local drafts", async ({
  page,
}, testInfo) => {
  const api = await mockGitHub(page);
  await connect(page);
  await write(page, "Anime studio test");
  await page.locator("#document-category").selectOption("anime");
  await page.locator(".tiptap").press("ControlOrMeta+A");
  await page.getByRole("button", { name: "加粗", exact: true }).click();
  await expect(page.locator(".tiptap strong")).toContainText("值得留下");
  await pasteImage(page);
  await page.locator(".studio-image-node img").click();
  await page.locator("#image-width").selectOption("50");
  await page.locator("#image-caption").fill("故事里的一个瞬间");
  await page.locator("#image-alt").fill("绿色测试图片");
  await page.locator("#image-set-cover").click();
  await expect(page.locator(".studio-image-node figcaption")).toHaveText(
    "故事里的一个瞬间"
  );
  await page.locator(".tiptap").press("ControlOrMeta+End");
  await page.locator(".tiptap").press("Enter");
  await page.getByRole("button", { name: "插入表格", exact: true }).click();
  await expect(page.locator(".tiptap table tr")).toHaveCount(3);
  await page.getByRole("button", { name: "＋ 行", exact: true }).click();
  await expect(page.locator(".tiptap table tr")).toHaveCount(4);
  await page.locator("#document-line-height").selectOption("2.3");
  await page.locator("#mode-preview").click();
  await expect(page.locator("#article-preview img")).toBeVisible();
  expect(
    await page
      .locator("#article-preview img")
      .evaluate(image => (image as HTMLImageElement).naturalWidth)
  ).toBeGreaterThan(0);
  await page.locator("#mode-write").click();
  await page.locator("#publish-button").click();
  await expect(page.locator("#sync-result")).toContainText("文章与图片已提交");
  const path = "src/content/posts/anime-studio-test.md";
  const source = api.source(path)!;
  expect(source).toContain("category: anime");
  expect(source).toContain("draft: false");
  expect(source).toContain('data-width="50"');
  expect(source).toContain("故事里的一个瞬间");
  expect(source).not.toContain("blob:");
  expect(source).not.toContain(token);
  expect(source).toContain("<table");
  expect(source).toContain("line-height:2.3");
  await writeFile(
    testInfo.outputPath("published.json"),
    JSON.stringify({ source, media: api.media() })
  );
  const tree = api.calls.find(
    call => call.method === "POST" && call.path.endsWith("/git/trees")
  )!;
  expect(tree.data.tree).toHaveLength(2);
  expect(
    tree.data.tree.some((entry: { path: string }) =>
      entry.path.startsWith("public/images/studio/")
    )
  ).toBe(true);
  expect(api.files.get("README.md")).toBe("readme-original");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    token
  );
  await page.reload();
  await expect(page.locator("#document-title")).toHaveValue(
    "Anime studio test"
  );
  await expect(page.locator(".studio-image-node img")).toBeVisible();
  await expect(page.locator("#connect-dialog")).not.toBeVisible();
  await page.locator("#logout-button").click();
  expect(
    await page.evaluate(() => sessionStorage.getItem("writing-studio-session"))
  ).toBeNull();
});

test("stops when another device changed the same article and retains the local version", async ({
  page,
}) => {
  const api = await mockGitHub(page);
  await connect(page);
  await page.locator("#remote-documents button").click();
  await expect(page.locator("#document-title")).toHaveValue("远端记录");
  await page.locator(".tiptap").fill("本机尚未合并的想法");
  api.mutateArticle();
  await page.locator("#publish-button").click();
  await expect(page.locator("#studio-error")).toContainText("其他设备已更新");
  expect(api.source(seedPath)).toContain("来自另一台设备的更新");
  expect(api.calls.filter(call => call.method === "POST")).toHaveLength(0);
  await page.reload();
  await expect(page.locator(".tiptap")).toContainText("本机尚未合并的想法");
});

test("retries a racing unrelated commit without force pushing or losing other files", async ({
  page,
}) => {
  const api = await mockGitHub(page);
  await connect(page);
  await write(page, "Unrelated race");
  api.race = true;
  await page.locator("#publish-button").click();
  await expect(page.locator("#sync-result")).toContainText("文章与图片已提交");
  expect(api.files.get("README.md")).toBe("readme-other-device");
  expect(api.source("src/content/posts/unrelated-race.md")).toContain(
    "值得留下"
  );
  const updates = api.calls.filter(call => call.method === "PATCH");
  expect(updates).toHaveLength(2);
  expect(updates.every(call => call.data.force === false)).toBe(true);
});

test("retains the draft after a failed upload and successfully retries", async ({
  page,
}) => {
  const api = await mockGitHub(page);
  await connect(page);
  await write(page, "Retry record");
  api.failBlob = true;
  await page.locator("#publish-button").click();
  await expect(page.locator("#studio-error")).toContainText("503");
  expect(api.files.has("src/content/posts/retry-record.md")).toBe(false);
  await expect(page.locator(".tiptap")).toContainText("值得留下");
  await page.locator("#publish-button").click();
  await expect(page.locator("#sync-result")).toContainText("文章与图片已提交");
});

test("automatically syncs new entries as drafts", async ({ page }) => {
  const api = await mockGitHub(page);
  await connect(page);
  await page.locator("#auto-sync").check();
  await write(page, "Automatic draft");
  await expect(page.locator("#sync-result")).toContainText("草稿已同步", {
    timeout: 20_000,
  });
  expect(api.source("src/content/posts/automatic-draft.md")).toContain(
    "draft: true"
  );
});

test("supports phone editing, settings, and a public Anime category", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio/");
  await page.locator("#try-writing").click();
  await write(page, "手机记录", "在手机上也可以写下想法。");
  await page.locator("#toggle-inspector").click();
  await page.locator("#document-category").selectOption("anime");
  await page.locator("#close-inspector").click();
  await page.locator("#mode-preview").click();
  await expect(page.locator("#article-preview")).toContainText(
    "在手机上也可以"
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.goto("/blog/anime/");
  await expect(page.locator("main h1")).toContainText("Anime");
  await page.goto("/");
  await expect(page.locator(".collection-anime")).toBeVisible();
});
