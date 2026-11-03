import { z } from 'zod'

interface FieldMeta {
  title?: string
  unit?: string
}

function readMeta(issue: z.core.$ZodRawIssue): FieldMeta {
  const schema = (issue as { schema?: z.ZodType }).schema
  if (schema) {
    const meta = z.globalRegistry.get(schema) as FieldMeta | undefined
    if (meta?.title) return meta
  }

  // Fallback
  const first = issue.path?.[0]
  return { title: typeof first === 'string' ? first : 'فیلد' }
}

function getOrigin(issue: z.core.$ZodRawIssue): string | undefined {
  const origin = (issue as { origin?: unknown }).origin
  return typeof origin === 'string' ? origin : undefined
}

function defaultUnit(origin: unknown): string {
  if (typeof origin !== 'string') return ''

  switch (origin) {
    case 'string':
      return 'کاراکتر'
    case 'array':
      return 'مورد'
    default:
      return ''
  }
}

export function persianZodErrorMap(issue: z.core.$ZodRawIssue): string | undefined {
  const meta = readMeta(issue)
  const title = meta.title ?? 'فیلد'
  const unit = meta.unit ?? defaultUnit(getOrigin(issue))

  switch (issue.code) {
    case 'invalid_type': {
      if (issue.input === undefined) return `${title} الزامی است`
      return `${title} باید از نوع صحیح باشد`
    }

    case 'too_small': {
      const n = issue.minimum
      if (issue.exact) return `${title} باید ${n}${unit ? ' ' + unit : ''} باشد`
      return `${title} باید حداقل ${n}${unit ? ' ' + unit : ''} باشد`
    }

    case 'too_big': {
      const n = issue.maximum
      if (issue.exact) return `${title} باید ${n}${unit ? ' ' + unit : ''} باشد`
      return `${title} باید حداکثر ${n}${unit ? ' ' + unit : ''} باشد`
    }

    case 'invalid_format':
      return `${title} معتبر نیست`

    case 'unrecognized_keys':
      return `فیلد(های) ناشناخته: ${issue.keys.join('، ')}`

    case 'not_multiple_of':
      return `${title} باید مضربی از ${issue.divisor} باشد`

    case 'invalid_value':
      return `${title} باید یکی از مقادیر مجاز باشد`

    case 'invalid_union':
      return `${title} با هیچ‌کدام از حالت‌های مجاز تطابق ندارد`

    case 'invalid_key':
    case 'invalid_element':
    case 'custom':
      return `${title} معتبر نیست`

    // fall back to zod default messages
    default:
      return undefined
  }
}
