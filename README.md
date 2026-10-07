# Labolab LIMS

Sistema de gestión de laboratorio (LIMS) para Labolab: ingreso de muestras,
cotizaciones, órdenes de trabajo, registro de resultados, emisión de reportes
con declaración de conformidad, portal del cliente e indicadores (KPIs/TAT).

## Stack técnico

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Prisma 6** ORM sobre **PostgreSQL**
- **NextAuth 4** (autenticación por email/contraseña)
- **Tailwind CSS** + **shadcn/ui** (Radix) + **Recharts**
- Gestor de paquetes: **Yarn (Berry / v4)** vía corepack

---

## Requisitos previos

- **Docker** y **Docker Compose** (opción recomendada), ó
- **Node.js 20+** y un **PostgreSQL** accesible (opción manual)

---

## Opción A — Arranque con Docker (recomendado)

Esta opción levanta la base de datos PostgreSQL, aplica el esquema, siembra
datos de demostración y arranca la aplicación, todo con un solo comando.

```bash
# 1. (Opcional) genera un secreto propio y pégalo en docker-compose.yml (NEXTAUTH_SECRET)
openssl rand -base64 32

# 2. Construye y levanta todo
docker compose up --build
```

La primera vez tarda unos minutos (instala dependencias y construye la imagen).
Cuando veas el mensaje de arranque, abre:

> http://localhost:3000

Para detener: `Ctrl+C` y luego `docker compose down`.
Para borrar también los datos de la base: `docker compose down -v`.

---

## Opción B — Arranque manual (sin Docker)

```bash
# 1. Habilita Yarn Berry (una sola vez)
corepack enable

# 2. Instala dependencias
yarn install

# 3. Configura variables de entorno
cp .env.example .env
#    Edita .env:
#    - DATABASE_URL: apunta a tu PostgreSQL local (usa la línea de localhost)
#    - NEXTAUTH_SECRET: genera uno con  openssl rand -base64 32

# 4. Genera el cliente de Prisma y crea las tablas
yarn prisma generate
yarn prisma db push

# 5. Siembra datos de demostración (usuarios, catálogo, flujos demo)
yarn prisma db seed

# 6. Arranca en modo desarrollo
yarn dev
```

Abre http://localhost:3000

### Base de datos rápida con Docker (solo Postgres)

Si prefieres el arranque manual pero no tienes PostgreSQL instalado:

```bash
docker run --name labolab-db -e POSTGRES_USER=labolab \
  -e POSTGRES_PASSWORD=labolab -e POSTGRES_DB=labolab_lims \
  -p 5432:5432 -d postgres:16-alpine
```

Y en `.env` usa:
`DATABASE_URL="postgresql://labolab:labolab@localhost:5432/labolab_lims?schema=public"`

---

## Usuarios de demostración (creados por el seed)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Administrador | `admin@labolab.com.ec` | `Adminuz4duy!89` |
| Secretaria | `secretaria@labolab.com.ec` | `Labolab2024!` |
| Analista Físico-Químico | `analista.fq@labolab.com.ec` | `Labolab2024!` |
| Analista Microbiología | `analista.mica@labolab.com.ec` | `Labolab2024!` |
| Cliente (portal) | `cliente@labolab.com.ec` | `Cliente2024!` |

> Cambia estas contraseñas antes de cualquier uso real.

---

## Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|------------|
| `DATABASE_URL` | Sí | Cadena de conexión a PostgreSQL |
| `NEXTAUTH_URL` | Sí | URL base de la app (`http://localhost:3000` en local) |
| `NEXTAUTH_SECRET` | Sí | Secreto para firmar sesiones (`openssl rand -base64 32`) |
| `ABACUSAI_API_KEY` | No | Solo para generación de PDFs y funciones de IA. La app funciona sin ella; esas funciones específicas quedarán deshabilitadas hasta integrar un proveedor equivalente. |

---

## Notas para el desarrollador (Cursor)

- Abre la carpeta `labolab-lims/` directamente en Cursor/VS Code.
- El esquema de datos completo está en `prisma/schema.prisma`.
- El seed está en `scripts/seed.ts` (envuelto por `scripts/safe-seed.ts`, que
  impide ejecutar borrados masivos accidentales).
- No existe carpeta `prisma/migrations/`: el esquema se aplica con
  `yarn prisma db push`. Si deseas migraciones versionadas, puedes inicializarlas
  con `yarn prisma migrate dev --name init`.
- La generación de PDFs usa un servicio HTTP de Abacus.AI (requiere
  `ABACUSAI_API_KEY`). Para un entorno 100% independiente, reemplázala por una
  librería local (p. ej. Playwright o Puppeteer) en las rutas
  `app/api/**/pdf/route.ts` y `app/api/generate-pdf/`.

## Build de producción

```bash
yarn build
yarn start
```
(Requiere que `DATABASE_URL` y `NEXTAUTH_SECRET` estén definidos.)
