import { EIP1193Provider } from 'viem'

declare global {
  interface Window {
    ethereum?: EIP1193Provider & {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

export {}

