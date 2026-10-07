#!/bin/sh
set -e

echo "==> Esperando a la base de datos y aplicando el esquema (prisma db push)..."
ATTEMPTS=0
until yarn prisma db push --skip-generate; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [ "$ATTEMPTS" -ge 30 ]; then
    echo "ERROR: no se pudo conectar a la base de datos tras varios intentos."
    exit 1
  fi
  echo "   Base de datos aún no lista, reintentando en 3s... ($ATTEMPTS)"
  sleep 3
done

echo "==> Sembrando datos de demostración (prisma db seed)..."
yarn prisma db seed || echo "   (seed omitido o ya aplicado, continuando)"

echo "==> Iniciando la aplicación en http://localhost:3000"
exec yarn dev -H 0.0.0.0 -p 3000
