export const READING_RIVER_BASE_PATH = "/reading-river";

export function readingRiverPath(path = "") {
  if (!path || path === "/") {
    return READING_RIVER_BASE_PATH;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${READING_RIVER_BASE_PATH}${normalized}`;
}
