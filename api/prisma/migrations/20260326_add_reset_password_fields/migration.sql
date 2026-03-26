ALTER TABLE "Usuario"
ADD COLUMN "resetToken" TEXT,
ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);

CREATE INDEX "Usuario_resetToken_idx" ON "Usuario"("resetToken");