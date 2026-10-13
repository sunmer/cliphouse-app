// Shared editor helpers for smoke tests: the editor keeps share, export, and agent actions in one menu,
// and theme and music in side panels.
exports.openPanel = async (page, name) => {
  if (!await page.locator('.editor-panel').filter({has: page.getByRole('heading', {name, exact: true})}).count()) {
    await page.getByRole('button', {name, exact: true}).click();
  }
  await page.locator('.editor-panel').waitFor();
};
exports.menuAction = async (page, name) => {
  if (!await page.getByRole('menu', {name: 'Share and download'}).count()) await page.getByRole('button', {name: 'Share and download', exact: true}).click();
  return page.getByRole('menuitem', {name});
};
