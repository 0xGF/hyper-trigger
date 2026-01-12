import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Proxy] Forwarding request to HyperLiquid:', body)
    
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Proxy] HyperLiquid API error:', response.status, errorText)
      return NextResponse.json({ 
        error: `HyperLiquid API error: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('[Proxy] Successfully forwarded request, received', Array.isArray(data) ? data.length : 'non-array', 'items')
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Proxy] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 