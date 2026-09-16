# Gestión de issues — reporte de bugs desde web-empleados

| | |
|---|---|
| **Issue** | [#8](https://github.com/angelisco1/curso-claude-resttek-1/issues/8) |
| **Estado** | Borrador |
| **Autor de la issue** | @angelisco1 |
| **Fecha** | 2026-09-15 |
| **Etiquetas** | `feature`, `proyecto:web-empleados`, `proyecto:api` |

## 1. Contexto

Hoy no hay ningún canal dentro del producto para que un empleado de restaurante avise de un fallo de la aplicación. La web de empleados (`packages/web-empleados`) solo tiene tres páginas —Cocina, Barra y Salón— y ninguna forma de comunicarse con el equipo de desarrollo. El apaño actual es que el empleado se lo cuente a su manager y que alguien abra la issue a mano en GitHub, con lo que la mayoría de los fallos nunca llegan al repositorio.

La issue #8 pide cerrar ese hueco: una página nueva en el menú de la web de empleados con un campo de texto donde describir el problema, y una API que, al recibir el reporte, cree automáticamente una issue en `angelisco1/curso-claude-resttek-1` con las etiquetas correctas más una etiqueta extra `por-revisar` que marca las issues creadas por esta vía (nadie ha triado todavía si el reporte es real, si es un duplicado o si es en realidad una petición de funcionalidad).

La issue no tiene comentarios, así que el cuerpo es la única fuente. Tres decisiones que el cuerpo dejaba abiertas se confirmaron con el autor antes de escribir esta spec: **no se persiste** el reporte en SQLite (GitHub es la única fuente de verdad), el formulario es **un único campo de texto** (sin selector de tipo ni de app), y la API habla con GitHub **ejecutando el binario `gh`**, no por HTTP contra `api.github.com`.

## 2. Alcance

**Incluido**

- Página nueva "Reportar incidencia" en `web-empleados`, accesible desde el menú lateral para cualquier rol que hoy entra en el shell (`cocinero`, `camarero`, `manager`).
- Un único endpoint nuevo: `POST /api/v1/bug-reports`, autenticado.
- Creación de la issue en GitHub ejecutando `gh issue create` desde la API, con etiquetas `bug`, `proyecto:web-empleados` y `por-revisar`.
- Creación de la etiqueta `por-revisar` en el repositorio (hoy no existe; ver sección 6, paso 1).
- Tests unitarios del servicio de reportes con un doble del cliente de GitHub.

**Excluido**

- **Persistencia del reporte en SQLite.** Decisión del autor: no se crea tabla `bug_reports` ni repositorio. Evita tocar `runInitialMigrations()` en `packages/api/src/config/database.ts`, que obligaría a borrar `packages/api/resttek.db` y resembrar.
- **Selector de tipo (`bug` / `feature`) y de app afectada.** Decisión del autor: el formulario es solo descripción. La etiqueta de tipo es siempre `bug` y la de proyecto siempre `proyecto:web-empleados`; el label `feature` que menciona la issue queda para el triaje manual posterior (por eso existe `por-revisar`).
- **Listado o consulta de reportes enviados.** No hay `GET /api/v1/bug-reports`; el empleado no ve el histórico, solo recibe el enlace de la issue que acaba de crear.
- **Adjuntar capturas de pantalla o logs.** Solo texto.
- **Reintentos, cola o envío diferido.** Si `gh` falla, el reporte se pierde y el empleado ve un error (ver 3.2).
- **Reporte desde `web-clientes` y `web-admin`.** La issue habla solo de la web de empleados. El servicio queda preparado para recibir el origen, pero no se expone en otras apps.
- **Anti-spam / rate limiting.** Ver riesgos en la sección 8.

## 3. Comportamiento esperado

### 3.1 Un empleado envía un reporte válido

**Dado** un empleado autenticado en `web-empleados` con restaurante asignado
**Cuando** abre "Reportar incidencia" en el menú lateral, escribe `El botón de "Listo" en Cocina no marca el plato como servido` en el textarea y pulsa "Enviar reporte"
**Entonces**:

- El frontend hace `POST /api/v1/bug-reports` con cuerpo `{ "description": "El botón de \"Listo\" en Cocina no marca el plato como servido" }` y la cabecera `Authorization: Bearer <token>` que añade `authInterceptor`.
- La API ejecuta `gh issue create` (ver 4) y responde `201` con:
  ```json
  {
    "issueNumber": 42,
    "issueUrl": "https://github.com/angelisco1/curso-claude-resttek-1/issues/42"
  }
  ```
- La issue creada en GitHub tiene:
  - **Título:** `[web-empleados] El botón de "Listo" en Cocina no marca el plato como servido`
  - **Cuerpo:**
    ```
    El botón de "Listo" en Cocina no marca el plato como servido

    ---
    Reportado desde la app **web-empleados**.

    - Empleado: `<employeeId>` (rol: `cocinero`)
    - Restaurante: `<restaurantId>`
    - Fecha: `2026-09-15T10:32:04.512Z`
    ```
  - **Etiquetas:** `bug`, `proyecto:web-empleados`, `por-revisar`.
- La UI sustituye el formulario por un mensaje de éxito: `Reporte enviado. Se ha creado la issue #42.` con un enlace `Ver issue` que apunta a `issueUrl` (abre en pestaña nueva, `target="_blank" rel="noopener"`), y un botón `Enviar otro reporte` que limpia el textarea y vuelve al formulario.

### 3.2 GitHub o `gh` no responden

**Dado** un empleado que envía un reporte válido
**Cuando** el comando `gh issue create` termina con código distinto de 0, supera el timeout de 15 s, o el binario `gh` no está instalado/autenticado en la máquina de la API
**Entonces** la API responde `502` con `{ "error": "GithubIssueCreationError", "message": "No se pudo crear la issue en GitHub" }`, escribe en `console.error` el stderr completo del comando, y la UI muestra la alerta `No se pudo enviar el reporte. Inténtalo de nuevo en unos minutos.` **manteniendo el texto escrito en el textarea** para que el empleado no lo pierda.

### 3.3 Descripción vacía o demasiado corta

**Dado** un empleado en la página de reporte
**Cuando** el textarea está vacío o solo tiene espacios
**Entonces** el botón "Enviar reporte" está deshabilitado y no se hace ninguna llamada HTTP.

**Cuando** el texto tiene entre 1 y 9 caracteres (tras `trim()`) y aun así llega a la API
**Entonces** la API responde `400` con `{ "error": "BugReportDescriptionTooShortError", "message": "La descripción debe tener al menos 10 caracteres" }`.

**Cuando** falta el campo `description` en el cuerpo, o no es un string
**Entonces** la API responde `400` con `{ "error": "BugReportDescriptionRequiredError", "message": "La descripción del reporte es requerida" }`.

### 3.4 Descripción demasiado larga

**Dado** un empleado que pega un texto de más de 5000 caracteres
**Cuando** pulsa enviar
**Entonces** el textarea tiene `maxlength="5000"` y un contador `1234 / 5000` debajo, así que la UI lo corta antes; si aun así llega a la API un `description` de más de 5000 caracteres (tras `trim()`), responde `400` con `{ "error": "BugReportDescriptionTooLongError", "message": "La descripción no puede superar los 5000 caracteres" }`.

### 3.5 Sin sesión o con rol no permitido

**Dado** una petición a `POST /api/v1/bug-reports`
**Cuando** no lleva token, o el token es inválido o expirado
**Entonces** la API responde `401` (`authenticate` de `@shared/infrastructure/http/middlewares.js`) y `errorInterceptor` de `web-shared` limpia la sesión y redirige a `/login`.

**Cuando** el rol del token es `cliente`
**Entonces** la API responde `403 { "error": "Forbidden: Insufficient permissions" }`. Los roles permitidos son `cocinero`, `camarero`, `manager` y `admin`.

## 4. Diseño técnico

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `packages/api/src/models/bug-report.model.ts` | Nuevo — interfaz `BugReport` y constantes `BUG_REPORT_LABELS`, `MIN_DESCRIPTION_LENGTH`, `MAX_DESCRIPTION_LENGTH`. |
| `packages/api/src/services/issue-tracker.client.ts` | Nuevo — interfaz `IssueTracker` + implementación `GhCliIssueTracker` que ejecuta `gh issue create` con `execFile`. Interfaz e implementación en el mismo archivo, igual que `IngredientRepository` / `SqliteIngredientRepository` en `packages/api/src/repositories/ingredient.repository.ts`. |
| `packages/api/src/services/bug-report.service.ts` | Nuevo — `BugReportService.create(dto)`: valida con `buildBugReport()`, compone título y cuerpo y delega en `IssueTracker`. |
| `packages/api/src/controllers/bug-report.controller.ts` | Nuevo — `BugReportController.create`, con `try/catch` + `next(error)` como `IngredientController`. |
| `packages/api/src/routes/bug-report.routes.ts` | Nuevo — wiring inline (tracker → service → controller → router) y `authenticate` + `authorize([...])`, igual que `packages/api/src/routes/ingredient.routes.ts`. |
| `packages/api/src/app.ts` | Registrar `app.use('/api/v1/bug-reports', bugReportRoutes)`. |
| `packages/api/src/errors/DomainErrors.ts` | Añadir `BugReportDescriptionRequiredError`, `BugReportDescriptionTooShortError`, `BugReportDescriptionTooLongError`, `GithubIssueCreationError` (mensajes en español, como el resto del archivo tras `fc62d3b`). |
| `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts` | Añadir lista `BAD_GATEWAY_ERRORS = ['GithubIssueCreationError']` → `502`, junto a `NOT_FOUND_ERRORS` y `UNAUTHORIZED_ERRORS`. |
| `packages/api/src/services/mocks/MockIssueTracker.ts` | Nuevo — doble en memoria que registra las llamadas y permite simular fallo. Espeja `packages/api/src/repositories/mocks/MockIngredientRepository.ts`. |
| `packages/api/src/services/bug-report.service.test.ts` | Nuevo — tests unitarios (vitest). |
| `packages/api/.env` | Nuevas variables `GH_TOKEN` y `GITHUB_REPO` (archivo ignorado por git; documentar en el README). |
| `packages/web-empleados/src/app/features/bug-reports/models/bug-report.model.ts` | Nuevo — `CreateBugReportDto`, `BugReportCreated`. |
| `packages/web-empleados/src/app/features/bug-reports/services/bug-report.service.ts` | Nuevo — `POST ${environment.apiUrl}/bug-reports`, misma forma que `features/orders/services/order.service.ts` (usa `environment.apiUrl`, no el token `API_URL`). |
| `packages/web-empleados/src/app/features/bug-reports/store/bug-report.store.ts` | Nuevo — store con signals (`loading`, `error`, `created`) y `firstValueFrom`, igual que `features/orders/store/order.store.ts`. |
| `packages/web-empleados/src/app/features/bug-reports/pages/report-bug/report-bug.component.{ts,html,css}` | Nuevo — formulario con `FormsModule` y `[(ngModel)]`, igual que `packages/web-admin/src/app/features/ingredients/pages/ingredient-form/ingredient-form.component.ts`. |
| `packages/web-empleados/src/app/app.routes.ts` | Nueva ruta hija `reportar-incidencia` dentro de `ShellComponent` con `loadComponent`. |
| `packages/web-empleados/src/app/core/layout/shell.component.html` | Nuevo `<a routerLink="/reportar-incidencia">` en `.sidebar-nav`, sin `@if` de rol (visible para todos). |
| `packages/web-empleados/src/app/app.config.ts` | Añadir los iconos `Bug`, `Send` y `CheckCircle` al `LucideAngularModule.pick({...})`. |
| `docs/arquitectura/arquitectura-api.md` | Documentar el endpoint nuevo, el mapeo `502` del `errorHandler` y las variables de entorno. |
| `docs/arquitectura/arquitectura-frontend.md` | Documentar la feature `bug-reports` de `web-empleados`. |

### Enfoque

**Backend — estilo por capas.** `bug-report` no es un bounded context hexagonal: va con la organización `models/` + `services/` + `controllers/` + `routes/` que ya usan `restaurant`, `dish`, `ingredient` y `order`, y el precedente concreto a copiar es la vertical de `ingredient` (`routes/ingredient.routes.ts` → `controllers/ingredient.controller.ts` → `services/ingredient.service.ts`). Como no hay persistencia, la capa `repositories/` se sustituye por `services/issue-tracker.client.ts`, que cumple el mismo papel de frontera inyectable: la interfaz `IssueTracker` permite testear `BugReportService` con `MockIssueTracker` sin ejecutar `gh`. Se descartó el contexto hexagonal (`contexts/bug-report/...`) porque no hay entidad con invariantes propias: es una llamada de salida con validación de entrada.

**Cliente de GitHub — `gh` por `execFile`.** Decisión del autor: en vez de `fetch` contra `api.github.com` o `@octokit/rest`, la API ejecuta el binario `gh` (v2.87 instalado en el entorno del curso). `GhCliIssueTracker` usa `execFile` de `node:child_process` promisificado con `promisify`, **nunca `exec` ni `shell: true`**: los argumentos van en array, de modo que la descripción escrita por el empleado no se interpreta nunca como shell (ver sección 8, Seguridad). Comando exacto:

```
gh issue create
  --repo   <GITHUB_REPO>
  --title  <título>
  --body   <cuerpo>
  --label  bug
  --label  proyecto:web-empleados
  --label  por-revisar
```

Opciones de `execFile`: `{ timeout: 15000, maxBuffer: 1024 * 1024, env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN } }`. `gh issue create` imprime en stdout la URL de la issue creada; el tracker la recorta con `trim()` y extrae el número con `/\/issues\/(\d+)\s*$/`. Si no hay match, o el comando sale con código ≠ 0, lanza `GithubIssueCreationError` tras registrar `stderr` con `console.error`.

**Etiquetas.** `bug`, `proyecto:web-empleados` y `enhancement`/`feature` ya existen en el repositorio; `por-revisar` **no existe** y `gh issue create` falla si se pasa una etiqueta inexistente, así que hay que crearla una vez antes de desplegar (sección 6, paso 1). La lista de etiquetas es una constante en `models/bug-report.model.ts`, no se recibe del cliente: el frontend solo manda `description`.

**Frontend.** La feature sigue la estructura `models/` + `pages/` + `services/` + `store/` que ya usa `features/orders` en `web-empleados`, con el componente hablando solo con el store. El formulario se hace con `FormsModule` y `[(ngModel)]` copiando `ingredient-form.component.ts` de `web-admin`, que es el único formulario del monorepo con ese patrón (`web-empleados` no tiene ninguno todavía).

### Modelo de datos / contratos

Sin cambios en el esquema SQLite (no se persiste nada).

**Petición** — `POST /api/v1/bug-reports`

```json
{ "description": "string, 10..5000 caracteres tras trim()" }
```

**Respuesta 201**

```json
{ "issueNumber": 42, "issueUrl": "https://github.com/angelisco1/curso-claude-resttek-1/issues/42" }
```

**Tipos (API)**

```ts
// models/bug-report.model.ts
export const BUG_REPORT_LABELS = ['bug', 'proyecto:web-empleados', 'por-revisar'] as const
export const MIN_DESCRIPTION_LENGTH = 10
export const MAX_DESCRIPTION_LENGTH = 5000

export interface BugReport {
    description: string        // ya validada y con trim()
    employeeId: string
    role: string
    restaurantId: string | null
    reportedAt: string         // ISO 8601
}

// services/issue-tracker.client.ts
export interface CreatedIssue { number: number; url: string }
export interface IssueTracker {
    createIssue(input: { title: string; body: string; labels: readonly string[] }): Promise<CreatedIssue>
}

// services/bug-report.service.ts
export interface CreateBugReportDTO {
    description: string
    employeeId: string
    role: string
    restaurantId: string | null
}
```

`employeeId`, `role` y `restaurantId` **no llegan en el body**: se leen de `req.user` (el payload del JWT que firma `BcryptAuthService.generateToken` es `{ id, role, restaurantId }`). El token no lleva nombre ni email, por eso el cuerpo de la issue identifica al empleado por su `id`.

**Título de la issue:** `[web-empleados] ` + primera línea de la descripción (`description.split('\n')[0].trim()`), recortada a 80 caracteres y con `…` final si se recortó.

**Tipos (frontend)**

```ts
export interface CreateBugReportDto { description: string }
export interface BugReportCreated { issueNumber: number; issueUrl: string }
```

**Variables de entorno (API)**

| Variable | Obligatoria | Descripción |
|---|---|---|
| `GH_TOKEN` | Sí | Token con permiso `issues: write` sobre el repositorio. Lo consume `gh` directamente. |
| `GITHUB_REPO` | No (por defecto `angelisco1/curso-claude-resttek-1`) | Valor de `--repo`. |

## 5. Casos borde y errores

| Situación | Comportamiento esperado |
|---|---|
| La etiqueta `por-revisar` no existe en el repositorio | `gh issue create` sale con código ≠ 0 → `502 GithubIssueCreationError`. El paso 1 del plan crea la etiqueta; el `stderr` de `gh` en los logs dice cuál falta. |
| El binario `gh` no está instalado en la máquina de la API | `execFile` rechaza con `ENOENT` → mismo `502 GithubIssueCreationError`, con el error original en `console.error`. |
| `GH_TOKEN` ausente o sin permiso `issues: write` | `gh` responde `HTTP 401`/`403` en stderr → `502`. El empleado ve el mensaje genérico de 3.2; el detalle solo va a los logs, nunca al cliente. |
| La descripción contiene comillas, backticks, `$(...)`, `;` o saltos de línea | Se envía tal cual a GitHub. `execFile` con array de argumentos no invoca shell, así que no hay interpolación posible. |
| La descripción contiene Markdown (`#`, listas, bloques de código) | Se respeta: GitHub lo renderiza. No se escapa nada. |
| La descripción es una sola línea larguísima sin `\n` | El título se recorta a 80 caracteres + `…`; el cuerpo conserva el texto completo. |
| La descripción son solo espacios o saltos de línea | `trim()` la deja vacía → `400 BugReportDescriptionRequiredError`. |
| El empleado no tiene restaurante asignado (`restaurantId: null`) | El shell de `web-empleados` ya bloquea toda la navegación en ese caso (`hasRestaurant()` en `shell.component.html`), así que no puede llegar a la página. Si la petición llega igualmente por API, se acepta y el cuerpo de la issue pone `Restaurante: sin asignar`. |
| Doble clic en "Enviar reporte" | El botón queda `[disabled]="loading()"` mientras la petición está en vuelo; no se crean dos issues por el mismo clic. |
| El empleado envía el mismo texto dos veces a propósito | Se crean dos issues. La deduplicación es parte del triaje manual que habilita `por-revisar`; no se detecta en la API. |
| El token expira (8 h) mientras la página está abierta | La petición devuelve `401`, `errorInterceptor` limpia la sesión y redirige a `/login`. El texto escrito se pierde (limitación conocida, ver sección 9). |
| `gh` tarda más de 15 s | `execFile` mata el proceso por timeout → `502`. Riesgo asumido: si GitHub había creado ya la issue, quedará huérfana sin que el empleado lo sepa. |

## 6. Plan de implementación

1. [ ] Crear la etiqueta `por-revisar` en el repositorio: `gh label create por-revisar --description "Reporte automático pendiente de triaje" --color "d4c5f9"`. Sin esto, todos los reportes fallan con `502`.
2. [ ] API — dominio y errores: `models/bug-report.model.ts`, nuevas clases en `errors/DomainErrors.ts`, lista `BAD_GATEWAY_ERRORS` en `contexts/shared/infrastructure/http/errorHandler.ts`.
3. [ ] API — cliente de GitHub: `services/issue-tracker.client.ts` (`IssueTracker` + `GhCliIssueTracker`) y `services/mocks/MockIssueTracker.ts`.
4. [ ] API — servicio: `services/bug-report.service.ts` con validación, composición de título/cuerpo y llamada al tracker.
5. [ ] API — HTTP: `controllers/bug-report.controller.ts`, `routes/bug-report.routes.ts` y registro en `app.ts`. Añadir `GH_TOKEN`/`GITHUB_REPO` a `packages/api/.env`.
6. [ ] Frontend — feature: `features/bug-reports/{models,services,store,pages/report-bug}` en `web-empleados`.
7. [ ] Frontend — navegación: ruta `reportar-incidencia` en `app.routes.ts`, entrada en `shell.component.html`, iconos `Bug`/`Send`/`CheckCircle` en `app.config.ts`.
8. [ ] Tests: `services/bug-report.service.test.ts` (ver 7).
9. [ ] Documentación: endpoint y `502` en `docs/arquitectura/arquitectura-api.md`; feature `bug-reports` en `docs/arquitectura/arquitectura-frontend.md`; variables de entorno en el `README.md`.

## 7. Criterios de aceptación

- [ ] `POST /api/v1/bug-reports` con token válido de rol `cocinero` y `{ "description": "<10 caracteres o más>" }` responde `201` con `issueNumber` (número) e `issueUrl` (string), y en GitHub existe una issue con ese número.
- [ ] La issue creada tiene exactamente las etiquetas `bug`, `proyecto:web-empleados` y `por-revisar`.
- [ ] El título de la issue empieza por `[web-empleados] ` y mide como máximo 96 caracteres (`[web-empleados] ` + 80).
- [ ] El cuerpo de la issue contiene la descripción íntegra y, tras un separador `---`, el `employeeId`, el rol, el `restaurantId` y la fecha ISO.
- [ ] `description` ausente, no-string o vacía tras `trim()` → `400` con `error: "BugReportDescriptionRequiredError"`.
- [ ] `description` de 9 caracteres tras `trim()` → `400` con `error: "BugReportDescriptionTooShortError"`; de 10 caracteres → `201`.
- [ ] `description` de 5001 caracteres → `400` con `error: "BugReportDescriptionTooLongError"`; de 5000 → `201`.
- [ ] Petición sin cabecera `Authorization` → `401`. Petición con token de rol `cliente` → `403`.
- [ ] Si el `IssueTracker` lanza, la respuesta es `502` con `error: "GithubIssueCreationError"` y el cuerpo **no** incluye el stderr de `gh`.
- [ ] Una descripción con `"; rm -rf /` o `$(whoami)` crea la issue con ese texto literal en el cuerpo y no ejecuta nada.
- [ ] En `web-empleados`, el menú lateral muestra "Reportar incidencia" para los roles `cocinero`, `camarero` y `manager`, y `/reportar-incidencia` renderiza el textarea.
- [ ] Con el textarea vacío, el botón "Enviar reporte" está deshabilitado.
- [ ] Tras un envío correcto, la página muestra el mensaje de éxito con el número de issue y un enlace a `issueUrl`.
- [ ] Tras un `502`, la página muestra la alerta de error y el texto sigue en el textarea.
- [ ] `npm test` pasa y `npm run build -w @resttek/web-empleados` compila (ambos los ejecuta `.github/workflows/pr-checks.yml`).

### Tests

- **Unitarios** (`packages/api/src/services/bug-report.service.test.ts`, vitest, mismo estilo que `services/ingredient.service.test.ts` con un mock en `services/mocks/`):
  - `create()` con descripción válida llama a `IssueTracker.createIssue` una vez con `labels = ['bug', 'proyecto:web-empleados', 'por-revisar']`.
  - Título: prefijo `[web-empleados] `, se queda con la primera línea, recorta a 80 caracteres y añade `…`.
  - Cuerpo: contiene la descripción, el `employeeId`, el rol, el `restaurantId` (y `sin asignar` cuando es `null`) y una fecha ISO.
  - Validación: vacía / solo espacios / no-string → `BugReportDescriptionRequiredError`; 9 caracteres → `BugReportDescriptionTooShortError`; 5001 → `BugReportDescriptionTooLongError`; y en los tres casos `createIssue` **no** se llama.
  - Con el mock configurado para fallar, `create()` propaga `GithubIssueCreationError`.
  - `GhCliIssueTracker`: parseo de la URL de stdout → `{ number, url }`, y stdout sin `/issues/<n>` → `GithubIssueCreationError`. Se prueba inyectando un ejecutor falso; no se lanza `gh` de verdad en los tests.
- **Integración / E2E:** no aplica en automático. El repositorio no tiene tests HTTP (`supertest` está declarado pero sin usar) ni tests de frontend, así que la verificación de los criterios de UI y del `201` end-to-end es manual: arrancar `npm run dev:api` + `npm run dev:empleados`, entrar con un usuario `cocinero` del seed y enviar un reporte real contra el repositorio.

## 8. Impacto y riesgos

- **Retrocompatibilidad:** no rompe nada. Endpoint nuevo, ruta nueva, sin cambios de esquema ni de contratos existentes. El único cambio en código compartido es añadir una lista en `errorHandler.ts`, que no altera el mapeo de los errores actuales. No hace falta feature flag ni migración.
- **Rendimiento:** cada reporte lanza un proceso hijo (`gh`) y una llamada de red a GitHub, con un coste de cientos de ms a varios segundos. La petición HTTP queda bloqueada mientras tanto (hasta 15 s en el peor caso). Es aceptable por el volumen esperado (unos pocos reportes al día), pero es el primer punto del proyecto donde una petición depende de un servicio externo.
- **Seguridad:**
  - *Inyección de comandos*: el texto del empleado llega a un proceso del sistema. Mitigación obligatoria: `execFile` con array de argumentos, sin `shell: true` y sin `exec`. Es el punto que hay que revisar con más cuidado en el PR.
  - *Fuga de información*: el stderr de `gh` puede contener el token o detalles del repositorio; solo va a `console.error`, nunca a la respuesta HTTP.
  - *Secretos*: `GH_TOKEN` vive en `packages/api/.env`, que está en `.gitignore`. Usar un token de alcance mínimo (solo `issues: write` sobre este repositorio).
  - *Abuso*: cualquier empleado autenticado puede crear issues públicas sin límite. No se implementa rate limiting en esta entrega; si el repositorio es público, el contenido del reporte también lo será. Conviene avisarlo en el propio formulario con un texto del estilo `No incluyas datos de clientes ni contraseñas: el reporte se publica en un repositorio público.`
- **Operación:** la máquina que ejecute la API necesita `gh` instalado y `GH_TOKEN` en el entorno; si no, la funcionalidad falla en caliente con `502` y el resto de la API sigue funcionando. Añadir ambos requisitos al README. Nuevos logs: un `console.error` por fallo de creación. Sin métricas nuevas.

## 9. Suposiciones y preguntas abiertas

**Suposiciones** — decididas sin confirmar, revisar antes de implementar.

- La ruta se llama `/reportar-incidencia` y la entrada del menú "Reportar incidencia" (la issue no da nombre).
- La entrada del menú es visible para **todos** los roles que entran al shell, sin un `canSee...` nuevo en `shell.component.ts`.
- Roles autorizados en la API: `cocinero`, `camarero`, `manager` y `admin`. Se incluye `admin` por coherencia con el resto de rutas; se excluye `cliente`.
- Límites de longitud: mínimo 10 y máximo 5000 caracteres. Elegidos para filtrar reportes inútiles ("no va") sin cortar descripciones largas.
- El cuerpo de la issue identifica al empleado por `id` y rol, no por nombre ni email: el JWT no los lleva y no se quiere añadir una consulta a `employees` en este flujo.
- Se responde `502` (y no `500`) cuando falla GitHub, porque el fallo es de un servicio externo. Requiere ampliar `errorHandler`.
- El repositorio destino por defecto es `angelisco1/curso-claude-resttek-1`, configurable con `GITHUB_REPO`.

**Preguntas abiertas** — pendientes de decidir.

- ¿La etiqueta `por-revisar` la crea el autor de la issue en GitHub, o se deja el paso 1 del plan como tarea del implementador? (Afecta a quién necesita permisos de admin del repositorio.)
- ¿Con qué cuenta se publican las issues? Con un PAT personal todas aparecerán a nombre de esa persona; si se quiere una identidad distinta ("resttek-bot"), hay que crear la cuenta o una GitHub App antes de desplegar.
- ¿Hace falta rate limiting desde el principio (p. ej. 5 reportes por empleado y hora)? Hoy queda fuera de alcance.
- Si el repositorio es público, ¿conviene que los reportes vayan a un repositorio privado distinto en lugar de a este? Cambiaría solo el valor de `GITHUB_REPO`.
