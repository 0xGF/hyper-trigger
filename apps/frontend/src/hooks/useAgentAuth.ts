'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { type Hex } from 'viem'
import { toast } from 'sonner'
import { formatErrorMessage, isUserRejection } from '@/lib/errors'
import { logger } from '@/lib/logger'

// Worker address that needs to be authorized as an agent
const WORKER_ADDRESS = process.env.NEXT_PUBLIC_WORKER_ADDRESS || '0x0000000000000000000000000000000000000000'

// Builder address for fee collection (same as worker by default)
const BUILDER_ADDRESS = process.env.NEXT_PUBLIC_BUILDER_ADDRESS || WORKER_ADDRESS

// Builder fee in basis points (0.04% = 4 bps)
const BUILDER_FEE_BPS = 4

// Network configuration
const IS_TESTNET = process.env.NEXT_PUBLIC_NETWORK === 'testnet'
const HL_API_URL = IS_TESTNET ? 'https://api.hyperliquid-testnet.xyz' : 'https://api.hyperliquid.xyz'
const HL_CHAIN_NAME = IS_TESTNET ? 'Testnet' : 'Mainnet'

// HyperEVM chain IDs
const HYPEREVM_TESTNET_CHAIN_ID = 998
const HYPEREVM_MAINNET_CHAIN_ID = 999
const EXPECTED_CHAIN_ID = IS_TESTNET ? HYPEREVM_TESTNET_CHAIN_ID : HYPEREVM_MAINNET_CHAIN_ID

// Helper to get chain ID in hex
function toHexChainId(chainId: number): `0x${string}` {
  return `0x${chainId.toString(16)}` as `0x${string}`
}

// EIP-712 types for agent approval - must match Hyperliquid's expected format
const AGENT_TYPES = {
  'HyperliquidTransaction:ApproveAgent': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'agentAddress', type: 'address' },
    { name: 'agentName', type: 'string' },
    { name: 'nonce', type: 'uint64' },
  ],
}

// EIP-712 types for builder fee approval
const BUILDER_FEE_TYPES = {
  'HyperliquidTransaction:ApproveBuilderFee': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'maxFeeRate', type: 'string' },
    { name: 'builder', type: 'address' },
    { name: 'nonce', type: 'uint64' },
  ],
}

// Parse signature into r, s, v components
function parseSignature(signature: Hex): { r: Hex; s: Hex; v: 27 | 28 } {
  const sig = signature.slice(2) // Remove 0x prefix
  const r = `0x${sig.slice(0, 64)}` as Hex
  const s = `0x${sig.slice(64, 128)}` as Hex
  const vRaw = parseInt(sig.slice(128, 130), 16)
  // Handle both standard (27/28) and EIP-155 recovery values
  const v = (vRaw < 27 ? vRaw + 27 : vRaw) as 27 | 28
  return { r, s, v }
}

export interface AgentAuthState {
  isAuthorized: boolean
  isBuilderApproved: boolean
  isFullyEnabled: boolean  // Both agent authorized AND builder approved
  isChecking: boolean
  isPending: boolean
  error: string | null
  workerAddress: string
  builderAddress: string
  existingAgents: string[]  // Other agents the user has authorized
}

export function useAgentAuth() {
  const { address, isConnected, connector } = useAccount()
  
  const [state, setState] = useState<AgentAuthState>({
    isAuthorized: false,
    isBuilderApproved: false,
    isFullyEnabled: false,
    isChecking: true,
    isPending: false,
    error: null,
    workerAddress: WORKER_ADDRESS,
    builderAddress: BUILDER_ADDRESS,
    existingAgents: [],
  })

  // Check if user has already authorized the worker and approved builder fee
  const checkAuthorization = useCallback(async () => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, isChecking: false, isAuthorized: false, isBuilderApproved: false, isFullyEnabled: false }))
      return
    }

    setState(prev => ({ ...prev, isChecking: true, error: null }))

    try {
      // Check both agent authorization and builder fee approval in parallel
      const [agentsResponse, builderResponse] = await Promise.all([
        // Get list of authorized agents
        fetch(`${HL_API_URL}/info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'extraAgents',
            user: address,
          }),
        }),
        // Get approved builder fees
        fetch(`${HL_API_URL}/info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'approvedBuilders',
            user: address,
          }),
        }),
      ])

      let isAuthorized = false
      let existingAgents: string[] = []
      let isBuilderApproved = false

      // Check agent authorization
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        const agents: string[] = Array.isArray(agentsData) 
          ? agentsData.map((agent: { address: string }) => agent.address)
          : []
        
        logger.debug('Found agents for user', { agents })
        
        isAuthorized = agents.some(
          (agent: string) => agent.toLowerCase() === WORKER_ADDRESS.toLowerCase()
        )
        
        existingAgents = agents.filter(
          (agent: string) => agent.toLowerCase() !== WORKER_ADDRESS.toLowerCase()
        )
      }

      // Check builder fee approval
      if (builderResponse.ok) {
        const builderData = await builderResponse.json()
        // approvedBuilders returns an array of { builder: string, maxFeeRate: string }
        const approvedBuilders: Array<{ builder: string; maxFeeRate: string }> = Array.isArray(builderData) ? builderData : []
        
        logger.debug('Found approved builders for user', { approvedBuilders })
        
        isBuilderApproved = approvedBuilders.some(
          (b) => b.builder.toLowerCase() === BUILDER_ADDRESS.toLowerCase()
        )
      }

      setState(prev => ({
        ...prev,
        isChecking: false,
        isAuthorized,
        isBuilderApproved,
        isFullyEnabled: isAuthorized && isBuilderApproved,
        existingAgents,
      }))
    } catch (err) {
      logger.warn('Error checking authorization', err)
      setState(prev => ({
        ...prev,
        isChecking: false,
        isAuthorized: false,
        isBuilderApproved: false,
        isFullyEnabled: false,
      }))
    }
  }, [address, isConnected])

  // Sign typed data using raw eth_signTypedData_v4 to bypass chain validation
  const signTypedDataRaw = useCallback(async (typedData: object): Promise<Hex> => {
    if (!connector) throw new Error('No connector available')
    
    logger.debug('Getting provider from connector...')
    const provider = await connector.getProvider()
    if (!provider) throw new Error('No provider available from connector')
    
    logger.debug('Signing typed data', { typedData, address })
    
    try {
      // Use eth_signTypedData_v4 directly - bypasses viem's chain validation
      const signature = await (provider as { request: (args: { method: string; params: unknown[] }) => Promise<Hex> }).request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(typedData)],
      })
      
      logger.debug('Signature received', { signature })
      return signature
    } catch (signError) {
      logger.warn('Signing failed', signError)
      // Re-throw with more context
      if (signError && typeof signError === 'object' && 'code' in signError) {
        const err = signError as { code: number; message?: string }
        if (err.code === 4001) {
          throw new Error('User rejected the signature request')
        }
        throw new Error(err.message || `Wallet error code: ${err.code}`)
      }
      throw signError
    }
  }, [address, connector])

  // Authorize the worker as an agent
  const authorizeAgent = useCallback(async () => {
    if (!address || !isConnected) {
      toast.error('Wallet not connected')
      return false
    }

    if (!connector) {
      toast.error('No wallet connector available')
      return false
    }

    setState(prev => ({ ...prev, isPending: true, error: null }))

    try {
      const nonce = Date.now()
      
      // Get the wallet's current chain ID
      const provider = await connector.getProvider()
      let walletChainId = EXPECTED_CHAIN_ID
      try {
        const chainIdHex = await (provider as { request: (args: { method: string }) => Promise<string> }).request({
          method: 'eth_chainId',
        })
        walletChainId = parseInt(chainIdHex, 16)
      } catch {
        // Fallback to expected chain ID
      }
      
      const signatureChainIdHex = toHexChainId(walletChainId)
      
      // Show which address and chain we're using
      toast.info(`Authorizing ${address?.slice(0, 6)}...${address?.slice(-4)} on chain ${walletChainId}`)

      // Build EIP-712 domain with the wallet's chain ID
      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: walletChainId,
        verifyingContract: '0x0000000000000000000000000000000000000000',
      }

      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          ...AGENT_TYPES,
        },
        primaryType: 'HyperliquidTransaction:ApproveAgent',
        domain,
        message: {
          hyperliquidChain: HL_CHAIN_NAME,
          agentAddress: WORKER_ADDRESS,
          agentName: 'HyperTrigger Bot',
          nonce: nonce,
        },
      }

      toast.info('Please sign the message in your wallet...')
      const rawSignature = await signTypedDataRaw(typedData)
      
      // Parse signature into r, s, v components as required by Hyperliquid API
      const signature = parseSignature(rawSignature)

      toast.info('Submitting to Hyperliquid...')
      const response = await fetch(`${HL_API_URL}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            type: 'approveAgent',
            signatureChainId: signatureChainIdHex,
            hyperliquidChain: HL_CHAIN_NAME,
            agentAddress: WORKER_ADDRESS,
            agentName: 'HyperTrigger Bot',
            nonce,
          },
          nonce,
          signature,
        }),
      })

      const responseText = await response.text()
      
      if (!response.ok) {
        let errorMessage = 'Failed to authorize agent'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch {
          if (responseText) errorMessage = responseText
        }
        throw new Error(errorMessage)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        throw new Error(`Invalid response: ${responseText}`)
      }
      
      if (result.status === 'ok') {
        setState(prev => ({
          ...prev,
          isPending: false,
          isAuthorized: true,
          isFullyEnabled: prev.isBuilderApproved, // Only fully enabled if builder also approved
        }))
        toast.success('Agent authorized successfully!')
        return true
      } else {
        const errorMsg = result.response?.error || result.response || 'Authorization failed'
        // Provide helpful message for "Extra agent already used" error
        if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('extra agent already used')) {
          throw new Error('You already have an agent authorized. Please revoke it first before authorizing HyperTrigger.')
        }
        throw new Error(errorMsg)
      }
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        isPending: false,
        error: null,
      }))
      // Only show toast if not a user rejection (no console error to avoid error overlay)
      if (!isUserRejection(error)) {
        toast.error(formatErrorMessage(error))
      }
      return false
    }
  }, [address, isConnected, connector, signTypedDataRaw])

  // Approve builder fee (0.04%)
  const approveBuilderFee = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) {
      toast.error('Wallet not connected')
      return false
    }

    if (!connector) {
      toast.error('No wallet connector available')
      return false
    }

    setState(prev => ({ ...prev, isPending: true, error: null }))

    try {
      const nonce = Date.now()
      
      const provider = await connector.getProvider()
      let walletChainId = EXPECTED_CHAIN_ID
      try {
        const chainIdHex = await (provider as { request: (args: { method: string }) => Promise<string> }).request({
          method: 'eth_chainId',
        })
        walletChainId = parseInt(chainIdHex, 16)
      } catch {
        // Fallback to expected chain ID
      }
      
      const signatureChainIdHex = toHexChainId(walletChainId)
      
      // Fee rate as string with % sign (e.g., "0.04%" for 4 bps)
      const feeRateStr = `${BUILDER_FEE_BPS / 100}%`
      
      toast.info(`Approving ${feeRateStr} builder fee...`)

      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: walletChainId,
        verifyingContract: '0x0000000000000000000000000000000000000000',
      }

      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          ...BUILDER_FEE_TYPES,
        },
        primaryType: 'HyperliquidTransaction:ApproveBuilderFee',
        domain,
        message: {
          hyperliquidChain: HL_CHAIN_NAME,
          maxFeeRate: feeRateStr,
          builder: BUILDER_ADDRESS,
          nonce: nonce,
        },
      }

      toast.info('Please sign the builder fee approval...')
      const rawSignature = await signTypedDataRaw(typedData)
      const signature = parseSignature(rawSignature)

      toast.info('Submitting to Hyperliquid...')
      const response = await fetch(`${HL_API_URL}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            type: 'approveBuilderFee',
            signatureChainId: signatureChainIdHex,
            hyperliquidChain: HL_CHAIN_NAME,
            maxFeeRate: feeRateStr,
            builder: BUILDER_ADDRESS,
            nonce,
          },
          nonce,
          signature,
        }),
      })

      const responseText = await response.text()
      
      if (!response.ok) {
        let errorMessage = 'Failed to approve builder fee'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch {
          if (responseText) errorMessage = responseText
        }
        throw new Error(errorMessage)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch {
        throw new Error(`Invalid response: ${responseText}`)
      }
      
      if (result.status === 'ok') {
        setState(prev => ({
          ...prev,
          isPending: false,
          isBuilderApproved: true,
          isFullyEnabled: prev.isAuthorized, // Only fully enabled if agent also authorized
        }))
        toast.success('Builder fee approved!')
        return true
      } else {
        throw new Error(result.response?.error || result.response || 'Approval failed')
      }
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        isPending: false,
        error: null,
      }))
      if (!isUserRejection(error)) {
        toast.error(formatErrorMessage(error))
      }
      return false
    }
  }, [address, isConnected, connector, signTypedDataRaw])

  // Enable trading - authorize agent AND approve builder fee
  const enableTrading = useCallback(async (): Promise<boolean> => {
    // Step 1: Authorize agent if needed
    if (!state.isAuthorized) {
      const agentResult = await authorizeAgent()
      if (!agentResult) return false
    }

    // Step 2: Approve builder fee if needed
    if (!state.isBuilderApproved) {
      const builderResult = await approveBuilderFee()
      if (!builderResult) return false
    }

    toast.success('Trading enabled!')
    return true
  }, [state.isAuthorized, state.isBuilderApproved, authorizeAgent, approveBuilderFee])

  // Revoke a specific agent by address
  const revokeAgentByAddress = useCallback(async (agentAddressToRevoke: string): Promise<boolean> => {
    if (!address || !isConnected) {
      toast.error('Wallet not connected')
      return false
    }

    if (!connector) {
      toast.error('No wallet connector available')
      return false
    }

    setState(prev => ({ ...prev, isPending: true, error: null }))

    try {
      const nonce = Date.now()
      
      // Get the wallet's current chain ID
      const provider = await connector.getProvider()
      let walletChainId = EXPECTED_CHAIN_ID
      try {
        const chainIdHex = await (provider as { request: (args: { method: string }) => Promise<string> }).request({
          method: 'eth_chainId',
        })
        walletChainId = parseInt(chainIdHex, 16)
      } catch {
        // Fallback to expected chain ID
      }
      
      const signatureChainIdHex = toHexChainId(walletChainId)
      
      const domain = {
        name: 'HyperliquidSignTransaction',
        version: '1',
        chainId: walletChainId,
        verifyingContract: '0x0000000000000000000000000000000000000000',
      }

      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          ...AGENT_TYPES,
        },
        primaryType: 'HyperliquidTransaction:ApproveAgent',
        domain,
        message: {
          hyperliquidChain: HL_CHAIN_NAME,
          agentAddress: agentAddressToRevoke,
          agentName: '',
          nonce: nonce,
        },
      }

      toast.info('Please sign to revoke the agent...')
      const rawSignature = await signTypedDataRaw(typedData)
      const signature = parseSignature(rawSignature)

      const response = await fetch(`${HL_API_URL}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: {
            type: 'approveAgent',
            signatureChainId: signatureChainIdHex,
            hyperliquidChain: HL_CHAIN_NAME,
            agentAddress: agentAddressToRevoke,
            agentName: null,
            nonce,
          },
          nonce,
          signature,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to revoke agent')
      }

      // Update state
      setState(prev => ({
        ...prev,
        isPending: false,
        isAuthorized: agentAddressToRevoke.toLowerCase() === WORKER_ADDRESS.toLowerCase() ? false : prev.isAuthorized,
        existingAgents: prev.existingAgents.filter(a => a.toLowerCase() !== agentAddressToRevoke.toLowerCase()),
      }))
      
      toast.success('Agent revoked successfully!')
      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        isPending: false,
      }))
      if (!isUserRejection(error)) {
        toast.error(formatErrorMessage(error))
      }
      return false
    }
  }, [address, isConnected, connector, signTypedDataRaw])

  // Revoke worker agent authorization
  const revokeAgent = useCallback(async () => {
    return revokeAgentByAddress(WORKER_ADDRESS)
  }, [revokeAgentByAddress])

  // Check authorization on mount and when address changes
  useEffect(() => {
    checkAuthorization()
  }, [checkAuthorization])

  return {
    ...state,
    isWalletReady: isConnected && !!connector,
    hasExistingAgent: state.existingAgents.length > 0,
    authorizeAgent,
    approveBuilderFee,
    enableTrading,  // Combined function: authorize agent + approve builder fee
    revokeAgent,
    revokeAgentByAddress,
    checkAuthorization,
  }
}
