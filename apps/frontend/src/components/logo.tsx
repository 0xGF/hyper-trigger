import Image from 'next/image'

export function Logo() {
  return (
    <div className="flex items-center justify-center gap-1">
      <svg 
        viewBox="0 0 24 24" 
        fill="hsl(172, 47%, 51%)" 
        className="w-6 h-6"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      <Image 
        src="/logo.png" 
        alt="Logo" 
        width={150} 
        height={24} 
        className="brightness-0 invert"
      />
    </div>
  )
}