'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Wallet } from 'lucide-react'
import { Button } from '../ui/button'

interface ConnectButtonRenderProps {
  account?: {
    address: string
    displayName: string
    ensAvatar?: string
    ensName?: string
    hasPendingTransactions: boolean
  }
  chain?: {
    hasIcon: boolean
    iconUrl?: string
    id: number
    name?: string
    unsupported?: boolean
  }
  openAccountModal: () => void
  openChainModal: () => void
  openConnectModal: () => void
  authenticationStatus?: 'loading' | 'unauthenticated' | 'authenticated'
  mounted: boolean
}

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }: ConnectButtonRenderProps) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated')

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button
                    onClick={openConnectModal}
                    variant="secondary"
                    size="sm"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Connect
                  </Button>
                )
              }

              if (chain?.unsupported) {
                return (
                  <Button
                  onClick={openChainModal}
                  variant="secondary"
                  size="sm"
                >   
                    Wrong Network
                  </Button>
                )
              }

              return (
                <Button
                  onClick={openAccountModal}
                  variant="secondary"
                  size="sm"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  {account?.displayName}
                </Button>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
