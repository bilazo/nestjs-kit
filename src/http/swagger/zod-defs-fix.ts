import { SwaggerModule } from '@nestjs/swagger'

import type { OpenAPIObject } from '@nestjs/swagger'

/**
 * Zod's `z.toJSONSchema()` emits recursive types using a local `$defs`
 * block plus `$ref: "#/$defs/X"`. But in OpenAPI/JSON Schema, `#/...`
 * always resolves against the **document root**, not the local node.
 * When we embed the schema inside an `ApiResponse`, the `$defs` block
 * ends up nested deep inside `paths/.../responses/.../schema/...` and
 * the refs become dangling. `openapi-typescript`, Swagger UI, and
 * other consumers fail to resolve them.
 *
 * This post-processor walks the generated document, hoists any `$defs`
 * block to `components.schemas`, and rewrites the dangling refs to
 * `#/components/schemas/X`. Name collisions with existing component
 * schemas are resolved by suffixing `_1`, `_2`, ... only when the
 * definitions actually differ.
 */
function hoistZodDefs(doc: OpenAPIObject): void {
  const components = ((doc as any).components ??= {})
  const schemas = ((components as any).schemas ??= {}) as Record<string, unknown>
  const rewrites = new Map<string, string>()

  // ---- 1. collect every $defs block -------------------------------
  function collect(node: unknown): void {
    if (!node || typeof node !== 'object') return

    const obj = node as Record<string, unknown>

    if (obj.$defs && typeof obj.$defs === 'object') {
      for (const [name, def] of Object.entries(obj.$defs as Record<string, unknown>)) {
        let target = name
        let i = 1
        while (
          schemas[target] !== undefined &&
          JSON.stringify(schemas[target]) !== JSON.stringify(def)
        ) {
          target = `${name}_${i++}`
        }
        schemas[target] = def
        rewrites.set(`#/$defs/${name}`, `#/components/schemas/${target}`)
        collect(def)
      }
      delete obj.$defs
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key !== '$ref') collect(value)
    }
  }

  // ---- 2. rewrite every dangling ref ------------------------------
  function rewrite(node: unknown): void {
    if (!node || typeof node !== 'object') return

    const obj = node as Record<string, unknown>
    if (typeof obj.$ref === 'string' && rewrites.has(obj.$ref)) {
      obj.$ref = rewrites.get(obj.$ref)!
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key !== '$ref') rewrite(value)
    }
  }

  collect(doc)
  rewrite(doc)
}

let installed = false

/**
 * Monkey-patches `SwaggerModule.createDocument` so that any
 * Zod-generated `$defs` are hoisted to `components.schemas` and the
 * corresponding `$ref`s are fixed.
 *
 * Idempotent — calling it multiple times is a no-op.
 *
 * This is invoked automatically when `HttpKitModule` is imported, so
 * consuming apps do NOT need to change their `main.ts`.
 */
export function installZodDefsSwaggerFix(): void {
  if (installed) return
  installed = true

  const original = SwaggerModule.createDocument
  SwaggerModule.createDocument = function patched(
    this: typeof SwaggerModule,
    ...args: Parameters<typeof original>
  ): ReturnType<typeof original> {
    const doc = original.apply(this, args)
    hoistZodDefs(doc)
    return doc
  } as typeof SwaggerModule.createDocument
}
