import {
  QUESTION,
  SECOND_QUESTION,
  UNSOURCED_QUESTION,
  expect,
  expectPlaying,
  seed,
  test,
} from "./fixtures";

/**
 * The quiz loop, which `AGENTS.md` calls the whole product: no timer,
 * immediate feedback, Learn when a source exists. Everything here is cheap to
 * assert and expensive to break silently.
 */
test.describe("quiz loop", () => {
  test.beforeEach(async ({ page }) => {
    await seed(page);
  });

  test("answers a question and reveals the verdict immediately", async ({ page }) => {
    await page.goto("/");
    await expectPlaying(page);

    const options = page.locator("main ul li button");
    await expect(options).toHaveCount(4);
    // Nothing is revealed before a pick.
    await expect(page.getByRole("button", { name: /^next/ })).toHaveCount(0);

    await options.nth(0).click();

    await expect(page.getByText("not quite", { exact: true })).toBeVisible();
    await expect(page.getByText(QUESTION.explanation)).toBeVisible();
    // The bank snapshot is preserved; options stay put for the reveal.
    await expect(options).toHaveCount(4);
    // No timer anywhere in the reveal.
    await expect(page.locator("main")).not.toContainText(/\d+:\d\d/);
  });

  test("marks the correct answer when the pick is right", async ({ page }) => {
    await page.goto("/");
    await expectPlaying(page);

    await page.locator("main ul li button").filter({ hasText: "Machine learning" }).click();

    await expect(page.getByText("correct", { exact: true })).toBeVisible();
  });

  test("Learn links to the source", async ({ page }) => {
    await page.goto("/");
    await page.locator("main ul li button").nth(0).click();

    await expect(page.getByRole("link", { name: /learn/ })).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Machine_learning",
    );
  });

  test("Learn stays hidden when the question has no source", async ({ page }) => {
    await seed(page, { questions: [UNSOURCED_QUESTION] });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: UNSOURCED_QUESTION.text })).toBeVisible();

    await page.locator("main ul li button").nth(3).click();

    // The explanation still teaches, so the reveal is not empty without Learn.
    await expect(page.getByText(UNSOURCED_QUESTION.explanation)).toBeVisible();
    await expect(page.getByRole("link", { name: /learn/ })).toHaveCount(0);
  });

  test("advances with Enter and answers with a letter key", async ({ page }) => {
    await seed(page, { questions: [QUESTION, SECOND_QUESTION] });
    await page.goto("/");
    await expectPlaying(page);

    const heading = page.getByRole("heading", { level: 1 });
    // The opening question is drawn at random from the cached page, so this
    // reads which one it got instead of assuming.
    const first = (await heading.textContent())?.trim();
    const second = first === QUESTION.text ? SECOND_QUESTION.text : QUESTION.text;

    // Click once before using the keyboard. Options are painted from a layout
    // effect, but the keydown listener is a plain effect, so there is a frame
    // where the quiz looks ready and is not listening yet. The click proves
    // hydration, which is the only thing the key specs actually depend on.
    await page.locator("main ul li button").nth(0).click();
    await expect(page.getByRole("button", { name: /^next/ })).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(heading).toHaveText(second);
    await expect(page.locator("main ul li button")).toHaveCount(4);

    // A letter key answers the question that is actually on screen, whichever
    // of the two it turned out to be.
    await page.keyboard.press("a");
    await expect(page.getByText(/^(correct|not quite)$/)).toBeVisible();
  });

  test("opens the source with ?", async ({ page }) => {
    await page.goto("/");
    await page.locator("main ul li button").nth(0).click();

    const popup = page.waitForEvent("popup");
    await page.keyboard.press("?");

    expect((await popup).url()).toContain("wikipedia.org/wiki/Machine_learning");
  });

  test("a spent bank offline ends the run instead of hanging", async ({ page, context }) => {
    await seed(page);
    await page.goto("/");
    await page.locator("main ul li button").nth(0).click();
    await expect(page.getByText("not quite", { exact: true })).toBeVisible();

    // The single seeded question is used up and the top-up draw cannot reach
    // Convex, so the run has to end here rather than sit on a question that is
    // never coming.
    await context.setOffline(true);
    await page.getByRole("button", { name: /^next/ }).click();

    await expect(page.getByText("bank complete", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /done list/ })).toBeVisible();

    await context.setOffline(false);
  });
});
