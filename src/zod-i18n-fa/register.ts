import { z } from 'zod'

import { persianZodErrorMap } from './error-map.js'

export function registerPersianZod(): void {
  z.config({ customError: persianZodErrorMap })
}
