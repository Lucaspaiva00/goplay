-- Reconcile historical installations where league fields were changed manually.
-- Preserve the legacy round column and all existing results.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoJogo') THEN
    CREATE TYPE "TipoJogo" AS ENUM ('IDA', 'VOLTA', 'MATA_MATA');
  END IF;
END $$;
ALTER TABLE "Jogo" ADD COLUMN IF NOT EXISTS "rodada" INTEGER;
ALTER TABLE "Jogo" ADD COLUMN IF NOT EXISTS "tipoJogo" "TipoJogo" NOT NULL DEFAULT 'IDA';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Jogo' AND column_name = 'round') THEN
    EXECUTE 'UPDATE "Jogo" SET "rodada" = COALESCE("rodada", "round", 1) WHERE "rodada" IS NULL';
    EXECUTE 'ALTER TABLE "Jogo" ALTER COLUMN "round" DROP NOT NULL';
  END IF;
END $$;
UPDATE "Jogo" SET "rodada" = 1 WHERE "rodada" IS NULL;
ALTER TABLE "Jogo" ALTER COLUMN "rodada" SET NOT NULL;

-- Preserve existing rosters even when the old default limit was smaller.
UPDATE "Time" t SET "maxJogadores" = GREATEST(t."maxJogadores", (
  SELECT count(*)::integer FROM "Usuario" u WHERE u."timeRelacionadoId" = t.id
));

-- Lock the team before counting: also protects legacy/future write routes.
CREATE OR REPLACE FUNCTION goplay_check_team_capacity() RETURNS trigger AS $$
DECLARE limite integer;
BEGIN
  IF NEW."timeRelacionadoId" IS NOT NULL AND
     (TG_OP = 'INSERT' OR NEW."timeRelacionadoId" IS DISTINCT FROM OLD."timeRelacionadoId") THEN
    SELECT "maxJogadores" INTO limite FROM "Time"
      WHERE id = NEW."timeRelacionadoId" FOR UPDATE;
    IF (SELECT count(*) FROM "Usuario" WHERE "timeRelacionadoId" = NEW."timeRelacionadoId") >= limite THEN
      RAISE EXCEPTION 'GOPLAY_TEAM_FULL: O time atingiu o limite de jogadores.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER goplay_team_capacity BEFORE INSERT OR UPDATE OF "timeRelacionadoId" ON "Usuario"
  FOR EACH ROW EXECUTE FUNCTION goplay_check_team_capacity();

CREATE OR REPLACE FUNCTION goplay_check_team_limit() RETURNS trigger AS $$
BEGIN
  IF NEW."maxJogadores" < 1 OR NEW."maxJogadores" < (
    SELECT count(*) FROM "Usuario" WHERE "timeRelacionadoId" = NEW.id
  ) THEN
    RAISE EXCEPTION 'GOPLAY_TEAM_LIMIT: O limite não pode ser menor que o elenco atual.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER goplay_team_limit BEFORE INSERT OR UPDATE OF "maxJogadores" ON "Time"
  FOR EACH ROW EXECUTE FUNCTION goplay_check_team_limit();

-- Serializes reservations from amistosos, avulsos and recurring schedules alike.
-- Existing reservations are retained; the guard applies to new/changed intervals.
CREATE OR REPLACE FUNCTION goplay_check_booking_overlap() RETURNS trigger AS $$
DECLARE inicio integer; fim integer;
BEGIN
  IF NEW.status = 'CANCELADO' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW."campoId" IS NOT DISTINCT FROM OLD."campoId"
    AND NEW.data IS NOT DISTINCT FROM OLD.data
    AND NEW."horaInicio" IS NOT DISTINCT FROM OLD."horaInicio"
    AND NEW."horaFim" IS NOT DISTINCT FROM OLD."horaFim"
    AND OLD.status <> 'CANCELADO' THEN RETURN NEW; END IF;
  PERFORM id FROM "Campo" WHERE id = NEW."campoId" FOR UPDATE;
  inicio := split_part(NEW."horaInicio", ':', 1)::integer * 60 + split_part(NEW."horaInicio", ':', 2)::integer;
  fim := CASE WHEN NEW."horaFim" = '00:00' THEN 1440 ELSE
    split_part(NEW."horaFim", ':', 1)::integer * 60 + split_part(NEW."horaFim", ':', 2)::integer END;
  IF fim <= inicio THEN
    RAISE EXCEPTION 'GOPLAY_BOOKING_INVALID: Intervalo de reserva inválido.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Agendamento" a WHERE a."campoId" = NEW."campoId" AND a.data = NEW.data
      AND a.id IS DISTINCT FROM NEW.id AND a.status <> 'CANCELADO'
      AND split_part(a."horaInicio", ':', 1)::integer * 60 + split_part(a."horaInicio", ':', 2)::integer < fim
      AND CASE WHEN a."horaFim" = '00:00' THEN 1440 ELSE
        split_part(a."horaFim", ':', 1)::integer * 60 + split_part(a."horaFim", ':', 2)::integer END > inicio
  ) THEN
    RAISE EXCEPTION 'GOPLAY_BOOKING_OVERLAP: Esse horário já está ocupado nesta quadra.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER goplay_booking_overlap BEFORE INSERT OR UPDATE OF "campoId", data, "horaInicio", "horaFim", status ON "Agendamento"
  FOR EACH ROW EXECUTE FUNCTION goplay_check_booking_overlap();
