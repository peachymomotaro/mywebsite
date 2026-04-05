CREATE TABLE IF NOT EXISTS "ExtensionToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),

  CONSTRAINT "ExtensionToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExtensionToken_tokenHash_key" ON "ExtensionToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "ExtensionToken_userId_idx" ON "ExtensionToken"("userId");
CREATE INDEX IF NOT EXISTS "ExtensionToken_expiresAt_idx" ON "ExtensionToken"("expiresAt");

ALTER TABLE "ExtensionToken" DROP CONSTRAINT IF EXISTS "ExtensionToken_userId_fkey";
ALTER TABLE "ExtensionToken"
ADD CONSTRAINT "ExtensionToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
