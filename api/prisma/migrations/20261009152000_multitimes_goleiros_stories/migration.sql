-- Canonical many-to-many roster; retain the legacy preferred team for older clients.
CREATE TABLE "_ElencoTimes" (
 "A" INTEGER NOT NULL REFERENCES "Time"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "B" INTEGER NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "_ElencoTimes_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX "_ElencoTimes_B_index" ON "_ElencoTimes"("B");
INSERT INTO "_ElencoTimes"("A","B") SELECT "timeRelacionadoId",id FROM "Usuario" WHERE "timeRelacionadoId" IS NOT NULL;
CREATE OR REPLACE FUNCTION goplay_check_team_capacity() RETURNS trigger AS $$
DECLARE limite integer;
BEGIN
 IF NEW."timeRelacionadoId" IS NOT NULL AND (TG_OP='INSERT' OR NEW."timeRelacionadoId" IS DISTINCT FROM OLD."timeRelacionadoId") THEN
  SELECT "maxJogadores" INTO limite FROM "Time" WHERE id=NEW."timeRelacionadoId" FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM "_ElencoTimes" WHERE "A"=NEW."timeRelacionadoId" AND "B"=NEW.id) AND
    (SELECT count(*) FROM (SELECT "B" FROM "_ElencoTimes" WHERE "A"=NEW."timeRelacionadoId" UNION SELECT id FROM "Usuario" WHERE "timeRelacionadoId"=NEW."timeRelacionadoId") roster)>=limite THEN
   RAISE EXCEPTION 'GOPLAY_TEAM_FULL: O time atingiu o limite de jogadores.' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION goplay_check_team_limit() RETURNS trigger AS $$
BEGIN
 IF NEW."maxJogadores"<1 OR NEW."maxJogadores"<(SELECT count(*) FROM (SELECT "B" FROM "_ElencoTimes" WHERE "A"=NEW.id UNION SELECT id FROM "Usuario" WHERE "timeRelacionadoId"=NEW.id) roster) THEN
  RAISE EXCEPTION 'GOPLAY_TEAM_LIMIT: O limite não pode ser menor que o elenco atual.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE FUNCTION goplay_multiteam_capacity() RETURNS trigger AS $$
DECLARE limite integer;
BEGIN
 SELECT "maxJogadores" INTO limite FROM "Time" WHERE id=NEW."A" FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM "_ElencoTimes" WHERE "A"=NEW."A" AND "B"=NEW."B") AND
 (SELECT count(*) FROM (SELECT "B" FROM "_ElencoTimes" WHERE "A"=NEW."A" UNION SELECT id FROM "Usuario" WHERE "timeRelacionadoId"=NEW."A") roster)>=limite AND
 NOT EXISTS(SELECT 1 FROM "Usuario" WHERE id=NEW."B" AND "timeRelacionadoId"=NEW."A") THEN
  RAISE EXCEPTION 'GOPLAY_TEAM_FULL: O time atingiu o limite de jogadores.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER goplay_multiteam_capacity BEFORE INSERT OR UPDATE ON "_ElencoTimes" FOR EACH ROW EXECUTE FUNCTION goplay_multiteam_capacity();
CREATE FUNCTION goplay_sync_preferred_team() RETURNS trigger AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD."timeRelacionadoId" IS DISTINCT FROM NEW."timeRelacionadoId" AND OLD."timeRelacionadoId" IS NOT NULL THEN
  DELETE FROM "_ElencoTimes" WHERE "A"=OLD."timeRelacionadoId" AND "B"=NEW.id;
 END IF;
 IF NEW."timeRelacionadoId" IS NOT NULL THEN
  INSERT INTO "_ElencoTimes"("A","B") VALUES(NEW."timeRelacionadoId",NEW.id) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER goplay_sync_preferred_team AFTER INSERT OR UPDATE OF "timeRelacionadoId" ON "Usuario" FOR EACH ROW EXECUTE FUNCTION goplay_sync_preferred_team();
CREATE TYPE "StatusConviteSocial" AS ENUM('PENDENTE','ACEITO','RECUSADO','CANCELADO');
CREATE TABLE "ConviteTime" (
 id SERIAL PRIMARY KEY,"timeId" INTEGER NOT NULL REFERENCES "Time"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "usuarioId" INTEGER NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 status "StatusConviteSocial" NOT NULL DEFAULT 'PENDENTE',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"respondidoEm" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "ConviteTime_timeId_usuarioId_key" ON "ConviteTime"("timeId","usuarioId");
CREATE INDEX "ConviteTime_usuarioId_status_idx" ON "ConviteTime"("usuarioId",status);
CREATE TABLE "PedidoGoleiro" (
 id SERIAL PRIMARY KEY,"timeId" INTEGER NOT NULL REFERENCES "Time"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "solicitanteId" INTEGER NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "goleiroId" INTEGER NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "amistosoId" INTEGER REFERENCES "Amistoso"(id) ON DELETE SET NULL ON UPDATE CASCADE,
 "dataHora" TIMESTAMP(3) NOT NULL,"duracaoMinutos" INTEGER NOT NULL DEFAULT 60,"local" VARCHAR(280) NOT NULL,
 "mensagem" VARCHAR(500),"valorProposto" DECIMAL(10,2),status "StatusConviteSocial" NOT NULL DEFAULT 'PENDENTE',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"respondidoEm" TIMESTAMP(3),
 CONSTRAINT "PedidoGoleiro_duracao_check" CHECK("duracaoMinutos" BETWEEN 30 AND 240),CONSTRAINT "PedidoGoleiro_valor_check" CHECK("valorProposto" IS NULL OR "valorProposto">=0)
);
CREATE UNIQUE INDEX "PedidoGoleiro_timeId_goleiroId_dataHora_key" ON "PedidoGoleiro"("timeId","goleiroId","dataHora");
CREATE INDEX "PedidoGoleiro_goleiroId_status_dataHora_idx" ON "PedidoGoleiro"("goleiroId",status,"dataHora");
CREATE INDEX "PedidoGoleiro_solicitanteId_status_idx" ON "PedidoGoleiro"("solicitanteId",status);
CREATE TABLE "Story" (
 id SERIAL PRIMARY KEY,"usuarioId" INTEGER NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 texto VARCHAR(280),imagem TEXT,cor VARCHAR(20) NOT NULL DEFAULT 'verde',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Story_usuarioId_expiresAt_idx" ON "Story"("usuarioId","expiresAt");
CREATE INDEX "Story_expiresAt_idx" ON "Story"("expiresAt");
CREATE TABLE "StoryVisualizacao" (
 "storyId" INTEGER NOT NULL REFERENCES "Story"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "usuarioId" INTEGER NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY("storyId","usuarioId")
);
