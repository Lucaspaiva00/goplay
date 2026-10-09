ALTER TABLE "Usuario" ADD COLUMN "bio" VARCHAR(280);
CREATE TABLE "UsuarioSeguidor" (
    "seguidorId" INTEGER NOT NULL,
    "seguidoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsuarioSeguidor_pkey" PRIMARY KEY ("seguidorId", "seguidoId"),
    CONSTRAINT "UsuarioSeguidor_distintos_check" CHECK ("seguidorId" <> "seguidoId"),
    CONSTRAINT "UsuarioSeguidor_seguidorId_fkey" FOREIGN KEY ("seguidorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UsuarioSeguidor_seguidoId_fkey" FOREIGN KEY ("seguidoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UsuarioSeguidor_seguidoId_seguidorId_idx" ON "UsuarioSeguidor"("seguidoId", "seguidorId");
