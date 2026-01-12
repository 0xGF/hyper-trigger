import { defineConfig } from 'orval'

export default defineConfig({
  hypertrigger: {
    input: {
      // Use NestJS-generated OpenAPI spec (run `pnpm dev:api` first to generate)
      target: './apps/api/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './packages/api-client/src/generated',
      schemas: './packages/api-client/src/generated/schemas',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: './packages/api-client/src/fetcher.ts',
          name: 'customFetcher',
        },
        query: {
          useQuery: true,
          useMutation: true,
          useInfinite: true,
          useInfiniteQueryParam: 'offset',
          options: {
            staleTime: 10000,
          },
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
  // Alternative: vanilla fetch client (no React Query)
  vanilla: {
    input: {
      target: './apps/api/openapi.json',
    },
    output: {
      mode: 'single',
      target: './packages/api-client/src/vanilla/client.ts',
      client: 'fetch',
      httpClient: 'fetch',
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: './packages/api-client/src/fetcher.ts',
          name: 'customFetcher',
        },
      },
    },
  },
})

