WITH tz_cases(nome, instante, tz, esperado) AS (
  VALUES
    ('23h BRT (=02h UTC dia seguinte) -> data local = dia anterior', '2026-09-04 02:00:00+00'::timestamptz, 'America/Sao_Paulo', DATE '2026-09-03'),
    ('09h BRT (=12h UTC) -> mesmo dia', '2026-09-04 12:00:00+00'::timestamptz, 'America/Sao_Paulo', DATE '2026-09-04'),
    ('meia-noite e 30 BRT (=03:30 UTC) -> ja virou o dia local', '2026-09-05 03:30:00+00'::timestamptz, 'America/Sao_Paulo', DATE '2026-09-05')
),
tz_res AS (
  SELECT nome, (instante AT TIME ZONE tz)::date AS obtido, esperado,
         CASE WHEN (instante AT TIME ZONE tz)::date = esperado THEN 'PASS' ELSE 'FAIL' END AS verdict
  FROM tz_cases
),
streak_cases(nome, last_date, hoje, prev, esperado) AS (
  VALUES
    ('dia consecutivo (ontem) -> +1', DATE '2026-09-03', DATE '2026-09-04', 5, 6),
    ('mesmo dia (ja praticou) -> mantem', DATE '2026-09-04', DATE '2026-09-04', 5, 5),
    ('gap de 3 dias -> reset 1', DATE '2026-09-01', DATE '2026-09-04', 5, 1),
    ('gap de 2 dias -> reset 1', DATE '2026-09-02', DATE '2026-09-04', 9, 1)
),
streak_res AS (
  SELECT nome,
    (CASE WHEN last_date = hoje - 1 THEN prev + 1
          WHEN last_date = hoje     THEN prev
          ELSE 1 END) AS obtido, esperado,
    CASE WHEN (CASE WHEN last_date = hoje - 1 THEN prev + 1 WHEN last_date = hoje THEN prev ELSE 1 END) = esperado THEN 'PASS' ELSE 'FAIL' END AS verdict
  FROM streak_cases
)
SELECT 'TZ' AS grupo, nome, obtido::text, esperado::text, verdict FROM tz_res
UNION ALL
SELECT 'STREAK', nome, obtido::text, esperado::text, verdict FROM streak_res;
