type EnvironmentMap = Record<string, string | undefined>;

function isEnabled(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function resolveDatabaseConnectionString(
  connectionString: string,
  environment: EnvironmentMap = process.env,
) {
  if (!isEnabled(environment.DATABASE_SSL_NO_VERIFY)) {
    return connectionString;
  }

  const url = new URL(connectionString);

  url.searchParams.set("sslmode", "no-verify");

  return url.toString();
}
