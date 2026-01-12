import Image from 'next/image'

export function Logo() {
  return (
    <div className="group flex items-center justify-center gap-1 cursor-pointer">
      <svg 
        width="16" 
        height="24" 
        viewBox="0 0 216 312" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-auto logo-icon-animate"
        shapeRendering="crispEdges"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0" y1="0" x2="216" y2="312" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5EECD5" />
            <stop offset="50%" stopColor="#48BDAD" />
            <stop offset="100%" stopColor="#2D9A8A" />
          </linearGradient>
        </defs>
        <path d="M0 288H24V312H0V288Z" fill="url(#logoGradient)"/>
        <path d="M24 264H48V288H24V264Z" fill="url(#logoGradient)"/>
        <path d="M24 240H48V264H24V240Z" fill="url(#logoGradient)"/>
        <path d="M48 240H72V264H48V240Z" fill="url(#logoGradient)"/>
        <path d="M48 216H72V240H48V216Z" fill="url(#logoGradient)"/>
        <path d="M48 192H72V216H48V192Z" fill="url(#logoGradient)"/>
        <path d="M72 216H96V240H72V216Z" fill="url(#logoGradient)"/>
        <path d="M72 192H96V216H72V192Z" fill="url(#logoGradient)"/>
        <path d="M72 168H96V192H72V168Z" fill="url(#logoGradient)"/>
        <path d="M72 144H96V168H72V144Z" fill="url(#logoGradient)"/>
        <path d="M72 120H96V144H72V120Z" fill="url(#logoGradient)"/>
        <path d="M72 96H96V120H72V96Z" fill="url(#logoGradient)"/>
        <path d="M96 192H120V216H96V192Z" fill="url(#logoGradient)"/>
        <path d="M96 168H120V192H96V168Z" fill="url(#logoGradient)"/>
        <path d="M96 144H120V168H96V144Z" fill="url(#logoGradient)"/>
        <path d="M144 144H168V168H144V144Z" fill="url(#logoGradient)"/>
        <path d="M144 120H168V144H144V120Z" fill="url(#logoGradient)"/>
        <path d="M120 168H144V192H120V168Z" fill="url(#logoGradient)"/>
        <path d="M120 144H144V168H120V144Z" fill="url(#logoGradient)"/>
        <path d="M96 120H120V144H96V120Z" fill="url(#logoGradient)"/>
        <path d="M96 96H120V120H96V96Z" fill="url(#logoGradient)"/>
        <path d="M72 72H96V96H72V72Z" fill="url(#logoGradient)"/>
        <path d="M72 48H96V72H72V48Z" fill="url(#logoGradient)"/>
        <path d="M72 24H96V48H72V24Z" fill="url(#logoGradient)"/>
        <path d="M48 120H72V144H48V120Z" fill="url(#logoGradient)"/>
        <path d="M48 96H72V120H48V96Z" fill="url(#logoGradient)"/>
        <path d="M48 72H72V96H48V72Z" fill="url(#logoGradient)"/>
        <path d="M24 120H48V144H24V120Z" fill="url(#logoGradient)"/>
        <path d="M0 120H24V144H0V120Z" fill="url(#logoGradient)"/>
        <path d="M120 120H144V144H120V120Z" fill="url(#logoGradient)"/>
        <path d="M24 96H48V120H24V96Z" fill="url(#logoGradient)"/>
        <path d="M24 72H48V96H24V72Z" fill="url(#logoGradient)"/>
        <path d="M48 48H72V72H48V48Z" fill="url(#logoGradient)"/>
        <path d="M48 24H72V48H48V24Z" fill="url(#logoGradient)"/>
        <path d="M72 0H96V24H72V0Z" fill="url(#logoGradient)"/>
        <path d="M96 72H120V96H96V72Z" fill="url(#logoGradient)"/>
        <path d="M96 48H120V72H96V48Z" fill="url(#logoGradient)"/>
        <path d="M96 24H120V48H96V24Z" fill="url(#logoGradient)"/>
        <path d="M96 0H120V24H96V0Z" fill="url(#logoGradient)"/>
        <path d="M120 72H144V96H120V72Z" fill="url(#logoGradient)"/>
        <path d="M120 48H144V72H120V48Z" fill="url(#logoGradient)"/>
        <path d="M120 24H144V48H120V24Z" fill="url(#logoGradient)"/>
        <path d="M120 0H144V24H120V0Z" fill="url(#logoGradient)"/>
        <path d="M144 48H168V72H144V48Z" fill="url(#logoGradient)"/>
        <path d="M144 24H168V48H144V24Z" fill="url(#logoGradient)"/>
        <path d="M144 0H168V24H144V0Z" fill="url(#logoGradient)"/>
        <path d="M168 24H192V48H168V24Z" fill="url(#logoGradient)"/>
        <path d="M168 0H192V24H168V0Z" fill="url(#logoGradient)"/>
        <path d="M192 0H216V24H192V0Z" fill="url(#logoGradient)"/>
        <path d="M168 120H192V144H168V120Z" fill="url(#logoGradient)"/>
      </svg>
      <Image 
        src="/logo.png" 
        alt="Logo" 
        width={150} 
        height={24} 
        className="brightness-0 invert logo-text-animate hidden sm:block"
      />
      <span className="font-bold text-lg tracking-tight logo-text-animate sm:hidden">
        HyperTrigger
      </span>
    </div>
  )
}
