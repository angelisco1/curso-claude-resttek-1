# Tokens del workflow de PR

Guía para dejar funcionando [`.github/workflows/pr-checks.yml`](../../.github/workflows/pr-checks.yml).

El workflow usa tres credenciales. **Solo una hay que crearla a mano.**

| Credencial | ¿Hay que crearla? | Para qué sirve |
|---|---|---|
| `secrets.GITHUB_TOKEN` | No, automática | Permite que el job comente en el PR con `gh pr comment` |
| Token OIDC (`id-token: write`) | No, automática | `claude-code-action` lo canjea por un token de su GitHub App |
| `secrets.CLAUDE_CODE_OAUTH_TOKEN` | **Sí, manual** | Autentica a Claude contra la API de Anthropic |

---

## 1. `GITHUB_TOKEN` — no se crea, se autoriza

GitHub Actions lo inyecta en cada ejecución. Lo único que hace falta es darle permisos en el YAML, que ya están puestos:

```yaml
permissions:
  contents: read         # leer el código del repo
  pull-requests: write   # publicar el comentario de review
  id-token: write        # (en el job de Claude) pedir el token OIDC
```

**Por qué es necesario:** sin `pull-requests: write` el paso `gh pr comment` falla con `403 Resource not accessible by integration`.

**Comprobación adicional (solo si falla el comentario):**
`Settings` → `Actions` → `General` → `Workflow permissions` → debe estar en **Read and write permissions**.

---

## 2. Token OIDC — no se crea, solo se habilita

`id-token: write` hace que GitHub exponga la variable `ACTIONS_ID_TOKEN_REQUEST_URL` dentro del job. La acción de Claude la usa para identificarse ante la GitHub App de Anthropic.

**Por qué es necesario:** sin esa línea el job aborta antes de arrancar con:

```
Unable to get ACTIONS_ID_TOKEN_REQUEST_URL env variable
```

No hay nada que configurar en GitHub: basta con que la clave esté en el bloque `permissions` del job (ya lo está).

---

## 3. `CLAUDE_CODE_OAUTH_TOKEN` — este sí hay que generarlo

**Por qué es necesario:** es la credencial de facturación/autenticación de Claude. Sin ella, el job de review no puede llamar al modelo y falla con un error de autenticación.

Requisito: una suscripción **Claude Pro o Max** y el CLI de Claude Code instalado.

### Paso 1 — Generar el token en tu máquina

```bash
claude setup-token
```

- Se abre el navegador para que inicies sesión con tu cuenta de Anthropic.
- Al terminar, la terminal imprime un token que empieza por `sk-ant-oat01-...`.
- Cópialo entero. **No se vuelve a mostrar**; si lo pierdes, ejecuta el comando otra vez.

> No lo pegues nunca en el código ni en el YAML: solo va en los secrets de GitHub.

> ⚠️ **Cópialo sin saltos de línea.** El token son ~110 caracteres en una sola línea. Si la terminal lo muestra partido en dos y seleccionas con el ratón, te llevas un `\n` invisible en medio. GitHub lo guarda tal cual y el job falla. Es el error más fácil de cometer aquí — ver [Fallo por salto de línea](#fallo-por-salto-de-línea-en-el-secret).

### Paso 2 — Añadirlo como secret del repositorio

1. Abre el repositorio en GitHub.
2. `Settings` (pestaña superior del repo, no la de tu perfil).
3. Menú lateral: `Secrets and variables` → `Actions`.
4. Pestaña `Secrets` → botón **`New repository secret`**.
5. Rellena:
   - **Name:** `CLAUDE_CODE_OAUTH_TOKEN` (exacto, respeta mayúsculas)
   - **Secret:** el token `sk-ant-oat01-...` que copiaste, **en una sola línea**
6. **`Add secret`**.

Antes de pulsar `Add secret`, comprueba en el cuadro de texto que el token ocupa una única línea y que no hay un salto ni espacios al final.

Debe quedar listado como `CLAUDE_CODE_OAUTH_TOKEN` en *Repository secrets*. Su valor ya no se puede leer, solo reemplazar.

### Paso 3 — Verificar

Abre un Pull Request cualquiera contra `main`. En la pestaña `Actions` deben aparecer los dos jobs:

1. `Build & Test`
2. `Claude — Docs Consistency Review` (se ejecuta solo si el primero pasa)

Si todo va bien, Claude publica **un** comentario en el PR con el veredicto sobre la documentación.

---

## Alternativa: usar una API key en vez de OAuth

Si no tienes Pro/Max pero sí crédito en la API de Anthropic:

1. Entra en <https://console.anthropic.com> → `API Keys` → `Create Key` y copia la clave (`sk-ant-api03-...`).
2. Añádela como secret con el nombre `ANTHROPIC_API_KEY` (mismos pasos del Paso 2).
3. Cambia esta línea en el workflow:

```diff
-          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
+          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Este método se factura por uso de API, no por suscripción.

---

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `Unable to get ACTIONS_ID_TOKEN_REQUEST_URL` | Falta `id-token: write` | Añadirlo a `permissions` del job |
| `403 Resource not accessible by integration` | Falta `pull-requests: write` o los permisos globales están en *read-only* | Revisar pasos 1 y su comprobación adicional |
| `401 OAuth access token is invalid` | El secret no existe, está mal escrito o el token caducó | Regenerar con `claude setup-token` y actualizar el secret |
| `is_error:true` con `num_turns: 1`, `total_cost_usd: 0` y `modelUsage: {}` en menos de ~300 ms | Secret malformado (normalmente un salto de línea al pegarlo): el CLI rechaza la cabecera antes de llamar a la API | Ver [Fallo por salto de línea](#fallo-por-salto-de-línea-en-el-secret) |
| El job de Claude no se ejecuta | `Build & Test` falló (`needs: build-and-test`) | Arreglar build/tests primero |
| PR desde un **fork**: no hay token | GitHub no expone secrets a PRs de forks | Trabajar con ramas del propio repo |

## Los cambios en el workflow no hacen efecto hasta que se mergean

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

### Cómo verlo

El texto del error está oculto por defecto; la acción solo imprime `is_error:true`.

1. Añade `show_full_output: true` al paso de la acción.
2. Relanza el job y busca el campo `"result"` del JSON final:
   - Menciona `line break`, `Invalid Authorization header` o `401` → **es el secret**. Vuelve a crearlo en una sola línea (ver [Rotación](#rotación)).
   - No aparece ningún texto de error → entonces sí puede ser [claude-code-action#1720](https://github.com/anthropics/claude-code-action/issues/1720) / [#1759](https://github.com/anthropics/claude-code-action/issues/1759), un bug del SDK con esta misma firma y sin arreglo desde aquí.
3. Quita `show_full_output` después: el repo es público y ese flag vuelca toda la salida a los logs.

El job lleva `continue-on-error: true` para que un fallo de la revisión no bloquee los PR.

## Rotación

El token OAuth caduca. Para renovarlo: `claude setup-token` de nuevo → `Settings` → `Secrets and variables` → `Actions` → clic en `CLAUDE_CODE_OAUTH_TOKEN` → `Update secret` → pegar el nuevo valor **en una sola línea**.

Truco para no arrastrar saltos de línea ni espacios: copia el token al portapapeles sin pasar por la selección del ratón.

```bash
claude setup-token | tr -d '\n' | pbcopy   # macOS
```

Después pega con `Cmd+V` en el campo del secret.
