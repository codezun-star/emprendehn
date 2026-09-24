#!/usr/bin/env bash
# Aplica todas las migraciones sobre un Postgres LIMPIO que imita a Supabase y
# corre las pruebas de supabase/tests. Nunca apuntes esto a tu proyecto real.
#
# Uso (con las variables estándar de psql):
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres scripts/probar-migraciones.sh
# Crea (y reemplaza) la base de datos "emprendehn_pruebas".
set -euo pipefail

cd "$(dirname "$0")/.."
BD=emprendehn_pruebas
psql_bd() { psql -X -q -v ON_ERROR_STOP=1 -d "$BD" "$@"; }
# Las migraciones avisan con NOTICE ("... does not exist, skipping"): solo mostrar advertencias y errores.
migrar() { PGOPTIONS="-c client_min_messages=warning" psql_bd -f "$1" >/dev/null; }

psql -X -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $BD" -c "create database $BD"
psql_bd -f supabase/tests/00_entorno_supabase.sql

for migracion in supabase/migrations/*.sql; do
  echo "→ $(basename "$migracion")"
  migrar "$migracion"
done

echo "→ idempotencia: se vuelven a aplicar todas"
for migracion in supabase/migrations/*.sql; do
  migrar "$migracion" || { echo "✗ No es idempotente: $migracion"; exit 1; }
done

for prueba in supabase/tests/[0-9][0-9][0-9]_*.sql; do
  echo "→ prueba $(basename "$prueba")"
  psql_bd -f "$prueba" 2>&1 | sed -n -e 's/.*NOTICE:  //p' -e '/ERROR/p'
done
echo "✓ Migraciones y pruebas OK"
