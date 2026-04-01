# Reading River Vercel Environment Variables

Use this checklist when configuring the merged `Peter Website` project in Vercel.

Path in Vercel:

```text
Project -> Settings -> Environment Variables
```

Add each variable below to the `Peter Website` Vercel project. Set them for `Production` at minimum, then redeploy.

## Required variables

### `DATABASE_URL`

The PostgreSQL connection string for the Reading River database.

Example format:

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Where to get it:
- Copy it from your database provider dashboard.
- If Reading River was previously deployed on its own, copy the same value from that old project.

### `DATABASE_SSL_NO_VERIFY`

Controls whether the app adds `sslmode=no-verify` to the database connection.

Typical value:

```text
false
```

Use `true` only if your database provider explicitly requires it.

### `SESSION_COOKIE_NAME`

The cookie name used for Reading River logins.

Recommended value:

```text
reading-river-session
```

### `ADMIN_EMAIL`

The admin email for Reading River.

Example:

```text
you@example.com
```

### `ADMIN_PASSWORD`

The admin password for Reading River.

Use a strong password. Do not use the placeholder from `.env.example`.

### `ADMIN_DISPLAY_NAME`

The display name shown for the admin account.

Example:

```text
Peter
```

## Source of truth

These variable names come from:
- `.env.example`
- `README.md`

## After adding variables

1. Save each variable in Vercel.
2. Open `Deployments` in the same project.
3. Redeploy the latest deployment.
4. Test `https://petercurry.org/reading-river/login` again.

## Notes

- The live site is deployed from `Peter Website`, not the standalone `Reading_River` repo.
- If login still fails after adding these values, check the Vercel function logs for the `/reading-river/login` request.
