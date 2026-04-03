let jsdomModulePromise: Promise<typeof import("jsdom")> | null = null;

export async function loadJSDOM() {
  jsdomModulePromise ??= import("jsdom");

  return (await jsdomModulePromise).JSDOM;
}
