const DEFAULT_READING_RIVER_ORIGIN = "https://petercurry.org";

export class ApiError extends Error {
  constructor(message, status, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function buildUrl(baseUrl, path) {
  return new URL(path, baseUrl || DEFAULT_READING_RIVER_ORIGIN).toString();
}

async function postJson(path, body, options = {}) {
  const response = await (options.fetchImpl ?? globalThis.fetch)(
    buildUrl(options.baseUrl ?? "", path),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    throw new ApiError(`Request to ${path} failed with status ${response.status}`, response.status, payload);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function login(credentials, options = {}) {
  return postJson("/reading-river/api/extension/login", credentials, options);
}

export function save(payload, options = {}) {
  return postJson("/reading-river/api/extension/save", payload, options);
}

export function logout(options = {}) {
  return postJson("/reading-river/api/extension/logout", {}, options);
}
