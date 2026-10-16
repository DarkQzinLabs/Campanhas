-- Campanhas: testes negativos de integridade para a migration candidata.
-- PRÉ-REQUISITO: aplicar a migration candidata em um banco PostgreSQL descartável e vazio.
-- Este arquivo NÃO aplica migrations. Execute apenas no banco isolado de auditoria.
-- Todos os fixtures e testes são revertidos no final.
\set ON_ERROR_STOP on

BEGIN;

INSERT INTO public.profiles (id, auth_subject, display_name, role)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'audit-admin-1', 'Auditoria Admin', 'admin'),
  ('10000000-0000-4000-8000-000000000002', 'audit-admin-2', 'Auditoria Admin 2', 'admin');

INSERT INTO public.campaigns (id, name, ranking_type, status)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Auditoria A', 'individual', 'active'),
  ('20000000-0000-4000-8000-000000000002', 'Auditoria B', 'individual', 'active');

INSERT INTO public.negotiators (id, external_key, name)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'audit-neg-1', 'Negociador Auditoria 1'),
  ('30000000-0000-4000-8000-000000000002', 'audit-neg-2', 'Negociador Auditoria 2');

INSERT INTO public.campaign_members (campaign_id, negotiator_id, target_cents)
VALUES
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 10000),
  ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 10000);

INSERT INTO public.campaign_groups (id, campaign_id, name)
VALUES
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Grupo A'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Grupo B');

INSERT INTO public.campaign_cycles
  (id, campaign_id, label, starts_at, ends_at, status, champions_announced_at, announced_by)
VALUES
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'Ciclo A', '2026-10-01T00:00:00Z', '2026-10-15T23:59:59Z', 'champions_announced',
   '2026-10-16T12:00:00Z', '10000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002',
   'Ciclo B', '2026-10-01T00:00:00Z', '2026-10-15T23:59:59Z', 'champions_announced',
   '2026-10-16T12:00:00Z', '10000000-0000-4000-8000-000000000002');

INSERT INTO public.champion_snapshots
  (id, campaign_id, cycle_id, announced_at, announced_by, ranking_type, snapshot_payload)
VALUES
  ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   '50000000-0000-4000-8000-000000000001', '2026-10-16T12:00:00Z',
   '10000000-0000-4000-8000-000000000001', 'individual', '{"ranking":[]}');

-- 1. Ciclo não pode pertencer a uma campanha diferente no snapshot.
DO $test$
BEGIN
  BEGIN
    INSERT INTO public.champion_snapshots
      (campaign_id, cycle_id, announced_at, announced_by, ranking_type, snapshot_payload)
    VALUES
      ('20000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-000000000002', '2026-10-16T12:00:00Z',
       '10000000-0000-4000-8000-000000000001', 'individual', '{"ranking":[]}');
    RAISE EXCEPTION 'TEST FAILED: snapshot aceitou campanha incompatível' USING ERRCODE = 'ZX001';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'PASS: snapshot/campanha/ciclo incompatíveis rejeitados';
  END;
END
$test$;

-- 2. Produção não pode associar um ciclo à campanha errada (FK composta).
DO $test$
BEGIN
  BEGIN
    INSERT INTO public.production_entries
      (negotiator_id, campaign_id, cycle_id, occurred_at, amount_cents)
    VALUES
      ('30000000-0000-4000-8000-000000000001',
       '20000000-0000-4000-8000-000000000002',
       '50000000-0000-4000-8000-000000000001', '2026-10-10T12:00:00Z', 100);
    RAISE EXCEPTION 'TEST FAILED: production aceitou campanha/ciclo incompatíveis' USING ERRCODE = 'ZX002';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'PASS: produção com campanha/ciclo incompatíveis rejeitada';
  END;
END
$test$;

-- 3. FK básica: associação não pode referenciar um grupo inexistente.
-- Limitação de esquema: campaign_group_members não possui campaign_id;
-- portanto, este teste NÃO valida compatibilidade grupo/campanha.
DO $test$
BEGIN
  BEGIN
    INSERT INTO public.campaign_group_members (group_id, negotiator_id)
    VALUES
      ('40000000-0000-4000-8000-000000000099',
       '30000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'TEST FAILED: associação aceitou grupo inexistente' USING ERRCODE = 'ZX003';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'PASS: associação a grupo inexistente rejeitada';
  END;
END
$test$;

-- 4. Metadados de anúncio devem ser preenchidos em conjunto (CHECK existente).
DO $test$
BEGIN
  BEGIN
    INSERT INTO public.campaign_cycles
      (campaign_id, label, starts_at, ends_at, status, champions_announced_at, announced_by)
    VALUES
      ('20000000-0000-4000-8000-000000000001', 'Ciclo com metadados inconsistentes',
       '2026-10-01T00:00:00Z', '2026-10-15T23:59:59Z', 'champions_announced',
       '2026-10-16T12:00:00Z', NULL);
    RAISE EXCEPTION 'TEST FAILED: metadados de anúncio incompletos foram aceitos' USING ERRCODE = 'ZX004';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: metadados de anúncio inconsistentes rejeitados';
  END;
END
$test$;

-- 5. Intervalo de ciclo invertido deve ser rejeitado.
DO $test$
BEGIN
  BEGIN
    INSERT INTO public.campaign_cycles (campaign_id, label, starts_at, ends_at)
    VALUES
      ('20000000-0000-4000-8000-000000000001', 'Ciclo com intervalo inválido',
       '2026-10-16T00:00:00Z', '2026-10-15T00:00:00Z');
    RAISE EXCEPTION 'TEST FAILED: ciclo com ends_at anterior a starts_at foi aceito' USING ERRCODE = 'ZX005';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: intervalo de ciclo invertido rejeitado';
  END;
END
$test$;

-- 6. Valores monetários negativos devem ser rejeitados.
DO $test$
BEGIN
  BEGIN
    INSERT INTO public.production_entries
      (negotiator_id, occurred_at, amount_cents)
    VALUES
      ('30000000-0000-4000-8000-000000000001', '2026-10-10T12:00:00Z', -1);
    RAISE EXCEPTION 'TEST FAILED: amount_cents negativo foi aceito' USING ERRCODE = 'ZX006';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: amount_cents negativo rejeitado';
  END;
END
$test$;

-- 7. A mesma chave externa de origem não pode duplicar a produção.
DO $test$
BEGIN
  INSERT INTO public.production_entries
    (negotiator_id, occurred_at, amount_cents, source_system, external_key)
  VALUES
    ('30000000-0000-4000-8000-000000000001', '2026-10-10T12:00:00Z', 100, 'audit', 'duplicate-key');

  BEGIN
    INSERT INTO public.production_entries
      (negotiator_id, occurred_at, amount_cents, source_system, external_key)
    VALUES
      ('30000000-0000-4000-8000-000000000001', '2026-10-10T12:01:00Z', 200, 'audit', 'duplicate-key');
    RAISE EXCEPTION 'TEST FAILED: chave externa duplicada foi aceita' USING ERRCODE = 'ZX007';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS: chave externa duplicada rejeitada';
  END;
END
$test$;

-- 8. Snapshot anunciado não pode ser alterado.
DO $test$
BEGIN
  BEGIN
    UPDATE public.champion_snapshots
       SET snapshot_payload = '{"ranking":[{"position":1}]}'
     WHERE id = '60000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'TEST FAILED: snapshot imutável foi alterado' USING ERRCODE = 'ZX008';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'TEST FAILED: snapshot imutável foi alterado' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'PASS: alteração de snapshot rejeitada pelo trigger';
  END;
END
$test$;

-- 9. Snapshot anunciado não pode ser excluído.
DO $test$
BEGIN
  BEGIN
    DELETE FROM public.champion_snapshots
     WHERE id = '60000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'TEST FAILED: snapshot imutável foi excluído' USING ERRCODE = 'ZX009';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'TEST FAILED: snapshot imutável foi excluído' THEN
      RAISE;
    END IF;
    RAISE NOTICE 'PASS: exclusão de snapshot rejeitada pelo trigger';
  END;
END
$test$;


-- 10. Ciclo informado exige campaign_id (CHECK esperado pela regra de domínio).
-- A migration atualmente recuperada não declara este CHECK; este caso deverá
-- falhar como TEST FAILED até a constraint ser adicionada.
DO $test$
BEGIN
  BEGIN
    INSERT INTO public.production_entries
      (negotiator_id, cycle_id, occurred_at, amount_cents)
    VALUES
      ('30000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-000000000001', '2026-10-10T12:00:00Z', 100);
    RAISE EXCEPTION 'TEST FAILED: cycle_id sem campaign_id foi aceito' USING ERRCODE = 'ZX010';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: cycle_id sem campaign_id rejeitado';
  END;
END
$test$;

-- 11. Status champions_announced exige timestamp e autor (CHECK esperado).
-- A migration atualmente recuperada apenas valida os dois metadados entre si,
-- sem relacioná-los ao status; este caso deverá falhar até a regra ser reforçada.
DO $test$
BEGIN
  BEGIN
    INSERT INTO public.campaign_cycles
      (campaign_id, label, starts_at, ends_at, status)
    VALUES
      ('20000000-0000-4000-8000-000000000001', 'Ciclo anunciado sem metadados',
       '2026-10-01T00:00:00Z', '2026-10-15T23:59:59Z', 'champions_announced');
    RAISE EXCEPTION 'TEST FAILED: status champions_announced sem metadados foi aceito' USING ERRCODE = 'ZX011';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: status anunciado sem metadados rejeitado';
  END;
END
$test$;

ROLLBACK;
