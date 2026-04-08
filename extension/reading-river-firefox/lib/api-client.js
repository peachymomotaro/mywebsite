const DEFAULT_READING_RIVER_ORIGIN = "https://petercurry.org";

function buildUrl(baseUrl, path) {
  return new URL(path, baseUrl || DEFAULT_READING_RIVER_ORIGIN).toString();
}

async function postJson(path, body, options = {}) {
  const response = await (options.fetchImpl ?? globalThis.fetch)(buildUrl(options.baseUrl ?? "", path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
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
