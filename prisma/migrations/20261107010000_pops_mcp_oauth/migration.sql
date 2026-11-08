-- CreateTable
CREATE TABLE "PopsOAuthClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "redirectUris" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopsOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsOAuthCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "scopes" TEXT[],
    "codeChallenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "PopsOAuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsOAuthGrant" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopsOAuthGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopsOAuthToken" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "accessHash" TEXT NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "PopsOAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PopsOAuthCode_codeHash_key" ON "PopsOAuthCode"("codeHash");

-- CreateIndex
CREATE INDEX "PopsOAuthCode_expiresAt_idx" ON "PopsOAuthCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PopsOAuthGrant_credentialId_key" ON "PopsOAuthGrant"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "PopsOAuthToken_accessHash_key" ON "PopsOAuthToken"("accessHash");

-- CreateIndex
CREATE UNIQUE INDEX "PopsOAuthToken_refreshHash_key" ON "PopsOAuthToken"("refreshHash");

-- CreateIndex
CREATE INDEX "PopsOAuthToken_grantId_idx" ON "PopsOAuthToken"("grantId");

-- AddForeignKey
ALTER TABLE "PopsOAuthCode" ADD CONSTRAINT "PopsOAuthCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "PopsOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsOAuthGrant" ADD CONSTRAINT "PopsOAuthGrant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "PopsOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsOAuthGrant" ADD CONSTRAINT "PopsOAuthGrant_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "PopsAgentCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopsOAuthToken" ADD CONSTRAINT "PopsOAuthToken_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "PopsOAuthGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
