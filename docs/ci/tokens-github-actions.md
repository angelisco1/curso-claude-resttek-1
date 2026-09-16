# Configurar la revisión automática de docs

Guía para dejar funcionando el job `Claude — Docs Consistency Review` de [`.github/workflows/pr-checks.yml`](../../.github/workflows/pr-checks.yml).

Qué hace: en cada Pull Request, Claude lee el diff, lo compara con lo que dicen los ficheros de [`docs/`](../) y publica un comentario si la documentación se ha quedado desactualizada.

## Antes de empezar

- Ser **administrador** del repositorio (hace falta para instalar la app y crear secrets).
- Una suscripción **Claude Pro o Max**.
- El CLI de Claude Code instalado: comprueba con `claude --version`.

## Las tres piezas

| Pieza | Qué autoriza | Dónde se configura |
|---|---|---|
| **GitHub App "Claude"** | Que Claude lea el repo y escriba el comentario con identidad propia (`claude[bot]`) | Paso 1, una vez por repo |
| **Secret `CLAUDE_CODE_OAUTH_TOKEN`** | Que Claude pueda usar el modelo, con cargo a tu cuenta de Anthropic | Pasos 2 y 3 |
| **Bloque `permissions:`** | Que el job pueda pedir el token OIDC y comentar en el PR | Paso 4, ya está en el YAML |

Las dos primeras son credenciales **distintas** y fallan de forma distinta. La app responde a *"¿puedo escribir en este repo?"*; el secret, a *"¿puedo usar el modelo?"*. Tener una no implica tener la otra.

---

## Paso 1 — Instalar la GitHub App de Claude

**Por qué es necesaria:** la acción no usa un token genérico de GitHub. Pide un token OIDC al runner y lo canjea por un token de instalación de la app. Si la app no está instalada en el repo, no hay nada contra lo que canjear y el job no llega a arrancar.

### Opción A (recomendada): desde el CLI

En una terminal, dentro del repo:

```bash
claude
```

Y dentro de Claude Code:

```
/install-github-app
```

Te guía por el navegador para instalar la app y crear el secret del Paso 3 de una vez.

### Opción B: manual desde GitHub

1. Abre <https://github.com/apps/claude>.
2. Pulsa **`Install`** (o `Configure` si ya la tenías).
3. Elige la cuenta donde vive el repo: tu usuario o la organización.
4. Marca **`Only select repositories`** y selecciona este repositorio.
   - Evita `All repositories` salvo que quieras la app en todos.
5. Pulsa **`Install`** y acepta los permisos (Contents, Issues y Pull Requests, en lectura y escritura: son los que la acción necesita para leer el código y comentar).

### Comprobar que quedó bien

En `Settings` → `GitHub Apps` (menú `Integrations`) debe aparecer **Claude** con este repo en la lista.

La prueba definitiva está en el log del job, en el paso de Claude:

```
Requesting OIDC token...
OIDC token successfully obtained
Exchanging OIDC token for app token...
App token successfully obtained
```

Si no llegas a `App token successfully obtained`, la app no está instalada en este repositorio.

---

## Paso 2 — Generar el token de Claude

```bash
claude setup-token | tr -d '\n' | pbcopy
```

- Se abre el navegador para que inicies sesión con tu cuenta de Anthropic.
- El token (`sk-ant-oat01-...`, ~110 caracteres) queda copiado al portapapeles.
- **No se vuelve a mostrar.** Si lo pierdes, repite el comando.

El `tr -d '\n'` no es un adorno: evita el fallo más común de esta guía. Si copias el token seleccionando con el ratón y la terminal lo ha partido en dos líneas, te llevas un salto de línea invisible, GitHub lo guarda tal cual y el job falla ([detalle abajo](#fallo-por-salto-de-línea-en-el-secret)).

En Linux, sustituye `pbcopy` por `xclip -selection clipboard`.

> No pegues nunca el token en el código ni en el YAML: solo va en los secrets de GitHub.

---

## Paso 3 — Guardarlo como secret

1. Abre el repositorio en GitHub.
2. `Settings` (la pestaña del repo, no la de tu perfil).
3. Menú lateral: `Secrets and variables` → `Actions`.
4. Pestaña `Secrets` → botón **`New repository secret`**.
5. Rellena:
   - **Name:** `CLAUDE_CODE_OAUTH_TOKEN` (exacto, respeta mayúsculas)
   - **Secret:** pega con `Cmd+V`
6. Antes de guardar, mira el cuadro de texto: el token debe ocupar **una sola línea**, sin espacios al final.
7. **`Add secret`**.

Debe quedar listado como `CLAUDE_CODE_OAUTH_TOKEN` en *Repository secrets*. Su valor ya no se puede leer, solo reemplazar.

---

## Paso 4 — Revisar los permisos del workflow

Ya están en el fichero; esto es para entender qué hace cada línea:

```yaml
permissions:
  contents: read         # leer el código del repo
  pull-requests: write   # publicar el comentario de review
  id-token: write        # pedir el token OIDC que se canjea por el de la app
```

`id-token: write` es el que más se olvida. Sin él, GitHub no expone la variable `ACTIONS_ID_TOKEN_REQUEST_URL` dentro del job y la acción aborta antes de empezar:

```
Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable
```

Si el comentario falla con `403`, comprueba además `Settings` → `Actions` → `General` → `Workflow permissions` → **Read and write permissions**.

---

## Paso 5 — Comprobar que funciona

Abre un Pull Request contra `main` que **no** toque `.github/workflows/` (si lo toca, la acción se salta a sí misma; ver [más abajo](#los-cambios-en-el-workflow-no-hacen-efecto-hasta-mergearlos)).

En la pestaña `Actions` verás dos jobs:

1. `Build & Test`
2. `Claude — Docs Consistency Review`, que solo arranca si el primero pasa (`needs: build-and-test`)

Señales de que fue bien:

- El job tarda **decenas de segundos**, no 9 segundos (eso sería un auto-skip) ni menos de 1 segundo (eso sería un fallo de credenciales).
- Aparece **un** comentario en el PR firmado por `claude[bot]` con el veredicto: *"Docs look up to date"* o *"Possible doc drift found"*.

---

## Cómo encaja todo en una ejecución

1. Abres un PR → GitHub lanza `Build & Test`.
2. Si pasa, arranca el job de Claude.
3. La acción pide un **token OIDC** al runner (gracias a `id-token: write`).
4. Lo canjea por un **token de la GitHub App** → con eso lee el repo y podrá comentar.
5. Arranca el CLI de Claude Code, que se autentica en la API de Anthropic con **`CLAUDE_CODE_OAUTH_TOKEN`**.
6. Claude ejecuta el prompt del workflow: `git diff` contra la base, lee los docs relevantes y compara.
7. Publica el comentario con `gh pr comment`.

Los pasos 3-4 dependen de la app; el 5, del secret. Saber en cuál se rompió te dice dónde mirar.

---

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| No llega a `App token successfully obtained` | La GitHub App no está instalada en este repo | Paso 1 |
| `Unable to get ACTIONS_ID_TOKEN_REQUEST_URL` | Falta `id-token: write` | Paso 4 |
| `403 Resource not accessible by integration` | Falta `pull-requests: write`, o los permisos globales están en *read-only* | Paso 4 |
| `401 OAuth access token is invalid` | El secret no existe, está mal escrito o el token caducó | [Rotación](#rotación-del-token) |
| `is_error:true` con `num_turns: 1`, `total_cost_usd: 0` y `modelUsage: {}` en menos de ~300 ms | Secret malformado, normalmente un salto de línea al pegarlo | [Fallo por salto de línea](#fallo-por-salto-de-línea-en-el-secret) |
| El job de Claude ni aparece | `Build & Test` falló (`needs: build-and-test`) | Arreglar build/tests primero |
| El job pasa en 9 segundos sin comentar | Auto-skip por validación de workflow | [Más abajo](#los-cambios-en-el-workflow-no-hacen-efecto-hasta-mergearlos) |
| PR desde un **fork**: no hay token | GitHub no expone secrets a PRs de forks | Trabajar con ramas del propio repo |

---

## Los cambios en el workflow no hacen efecto hasta mergearlos

La acción compara el fichero del workflow con el de la rama por defecto. Si no son idénticos, **se salta y reporta `success`**:

```
Skipping action due to workflow validation: Workflow validation failed.
The workflow file must exist and have identical content to the version
on the repository's default branch.
```

Dos consecuencias prácticas:

1. Un PR que toca `pr-checks.yml` **nunca ejecuta** la revisión. Sale el check en verde, pero en 9 segundos y sin hacer nada: es un falso positivo, no una prueba de que el cambio funcione.
2. Cualquier cambio en el job de Claude solo empieza a aplicarse **después de mergear a `main`**.

Para comprobar de verdad un cambio del workflow: mergéalo a `main` y abre luego un PR que *no* toque el fichero.

---

## Fallo por salto de línea en el secret

Si el job de Claude falla así:

```json
{"type":"result","subtype":"success","is_error":true,"duration_ms":102,
 "num_turns":1,"total_cost_usd":0,"permission_denials_count":0,"modelUsage":{}}
```

Coste 0, `modelUsage` vacío y menos de ~300 ms significan que el CLI abortó *antes* de llamar a la API. **La causa más probable es un secret malformado**, y ya ha pasado en este repo: el token se pegó partido en dos líneas y el CLI rechazó la cabecera HTTP en local, sin llegar a la red:

```
Invalid auth token · Invalid Authorization header value from CLAUDE_CODE_OAUTH_TOKEN:
it contains a line break at character 80 (110 characters on 2 lines).
```

Cuidado con la intuición fácil: que falle en 100 ms **no** descarta el token. Un token que el servidor rechaza sí tarda ~2 s y devuelve `401`, pero uno malformado ni siquiera sale de la máquina.

### Cómo ver el error real

El texto está oculto por defecto; la acción solo imprime `is_error:true`.

1. Añade `show_full_output: true` al paso de la acción.
2. Relanza el job y busca el campo `"result"` del JSON final:
   - Menciona `line break`, `Invalid Authorization header` o `401` → **es el secret**. Vuelve a crearlo en una sola línea ([Rotación](#rotación-del-token)).
   - No aparece ningún texto de error → entonces sí puede ser [claude-code-action#1720](https://github.com/anthropics/claude-code-action/issues/1720) / [#1759](https://github.com/anthropics/claude-code-action/issues/1759), un bug del SDK con esta misma firma y sin arreglo desde aquí.
3. Quita `show_full_output` después: el repo es público y ese flag vuelca toda la salida a los logs.

El job lleva `continue-on-error: true` para que un fallo de la revisión no bloquee los PR.

---

## Rotación del token

El token OAuth caduca. Para renovarlo:

1. `claude setup-token | tr -d '\n' | pbcopy`
2. `Settings` → `Secrets and variables` → `Actions`
3. Clic en `CLAUDE_CODE_OAUTH_TOKEN` → `Update secret`
4. Pega con `Cmd+V` y guarda

La GitHub App no caduca: se instala una vez y ya está.
