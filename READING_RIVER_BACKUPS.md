# Reading River Database Backups

Reading River uses the application `DATABASE_URL` for Postgres access. Locally this comes from
`.env` / `.env.local`; in production it comes from the hosting environment variables.

Create a custom-format backup:

```bash
pg_dump "$DATABASE_URL" --format=custom --file "reading-river-backup-$(date +%F).dump"
```

You can also run the matching package script:

```bash
npm run backup:reading-river
```

Restore a custom-format backup:

```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL" reading-river-backup-YYYY-MM-DD.dump
```

Do not commit backup files to Git. Use a filename like
`reading-river-backup-YYYY-MM-DD.dump`.
