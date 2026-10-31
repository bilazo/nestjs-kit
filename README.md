# @bilazo/nestjs-kit

Shared NestJS infrastructure for internal projects.

## Install

```sh
pnpm add @bilazo/nestjs-kit
```

## Usage

### Exceptions

```ts
import { TooManyRequestsException } from '@bilazo/nestjs-kit/http'

throw new TooManyRequestsException({
  code: 'RATE_LIMITED',
  message: 'Too many requests, slow down.',
})
```

## License

MIT
