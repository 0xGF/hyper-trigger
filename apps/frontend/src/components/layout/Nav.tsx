'use client'

import Link from 'next/link'
import { Logo } from '../logo'
import { WalletButton } from '../wallet/WalletButton'

export function Nav() {
  return (
    <header className="shrink-0 flex items-center mt-1 mx-1 px-3 py-2 bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between w-full">
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
        <WalletButton />
      </div>
    </header>
  )
}

