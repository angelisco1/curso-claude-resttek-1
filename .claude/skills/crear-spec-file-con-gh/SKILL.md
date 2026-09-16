---
name: crear-spec-file-con-gh
description: Tienes que cargar esta skill cuando te pidan crear un archivo de especificación para una feature o cambio en el proyecto.
---


# Especificación técnica a partir de una issue de GitHub

Escribe la spec. No implementes el código, salvo que el usuario lo pida después.

## Paso 1 — Lee la issue entera

El usuario te da el número o la URL. Si te da la URL, extrae el número del final.

```bash
gh issue view <numero> --json number,title,body,url,state,author,labels,assignees,milestone,comments
```

Lee también los comentarios: ahí suelen estar las decisiones finales. Si un comentario contradice el cuerpo de la issue, manda el comentario más reciente y anótalo en la sección 1 de la spec.

Si la issue enlaza otras issues o PRs, ábrelos con `gh issue view` / `gh pr view`.

## Paso 2 — Investiga el repositorio

Busca en el código antes de escribir nada. Obtén tres cosas:

1. **Los archivos a modificar.** Búscalos con `rg` o `grep`. No los adivines.
2. **Un precedente.** Algo parecido ya implementado (otro endpoint, comando o componente). Marca su estilo como el que hay que seguir.
3. **Las convenciones.** Revisa `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`, configuración de linters y test****istentes.

Escribe rutas y símbolos***actos: `src/api/users.ts:createUser`. Nunca "la capa de servicios".

## Paso 3 — Pregunta lo que no puedas deducir

Si el repositorio no responde una duda y esa duda cambia la implementación, pregunta antes de escribir.

Agrupa todas las dudas en un solo mensaje. Máximo 4. Formato: la pregunta, las opciones y tu recomendación.

> En la issue no se dice qué pasa si el usuario ya tiene sesión activa. Opciones: (a) invalidar la anterior, (b) permitir varias, (c) rechazar el login. En `auth/session.ts` ya se invalida la anterior, así que propongo (a). ¿Te encaja?

Las dudas menores no las preguntes: decide y apúntalas en la sección 9 (Suposiciones).

## Paso 4 — Escribe el documento

Copia la estructura de `templates/plantilla-spec.md`. No reordenes ni renombres secciones.

Reglas:

- Sección que no aplica: déjala y escribe `No aplica` con el motivo en una línea. No la borres.
- Escribe la spec en el idioma de la issue.
- Describe comportamiento observable: "devuelve 409 con `code: DUPLICATE_EMAIL`", no "gestiona los duplicados".
- Cita archivos reales en la sección 4.

Guarda el archivo así:

- Si el repo ya tiene `docs/specs/`, `specs/`, `.github/specs/` o `rfcs/`, usa ese directorio y su formato de nombre.
- Si no, crea `docs/specs/<numero>-<slug-del-titulo>.md`. Ejemplo: `docs/specs/123-login-con-google.md`.

## Paso 5 — Revisa antes de entregar

Comprueba estos cinco puntos. Si alguno falla, corrige la spec y vuelve a revisar.

- [ ] Añade información que no estaba en la issue.
- [ ] Nombra al menos un archivo real del repositorio.
- [ ] Los criterios de aceptación se pueden convertir en un test.
- [ ] Dice qué queda fuera de alcance.
- [ ] Los casos borde son del dominio concreto, no genéricos.

Pregunta guía: ¿podría implementarla alguien que no ha leído la issue, sin preguntar nada?

## Paso 6 — Cierra

Resume en el chat: ruta del archivo, alcance en 2-3 líneas, decisiones que tomaste tú y preguntas abiertas.

Ofrece estas dos acciones. Ejecútalas solo si el usuario dice que sí:

```bash
# Publicar la spec en la issue
gh issue comment <numero> --body-file docs/specs/<archivo>.md

# Crear la rama para implementar
gh issue develop <numero> --checkout
```

## Paso 7 - Avisar al humano

Cuando ya hayas creado el archivo de spec avisa por el canal general de slack que has terminado y les poner un resumen para que ellos puedan ir a revisar la especificación.

## Recursos

- `templates/plantilla-spec.md` — la plantilla. Léela antes del paso 4.
- `references/gh-comandos.md` — comandos `gh` adicionales. Léelo si necesitas algo más que `gh issue view`.

## Si `gh` falla

Ejecuta `gh auth status`. Si no está autenticado, pide al usuario que ejecute `gh auth login`. No intentes rodearlo con llamadas a la API web.