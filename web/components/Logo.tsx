export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="solrelay-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      
      {/* Rounded square background */}
      <rect width="40" height="40" rx="8" fill="url(#solrelay-gradient)" />
      
      {/* Relay arrows - left to right */}
      <path 
        d="M10 20 L18 20 M16 17 L19 20 L16 23" 
        stroke="white" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Relay arrows - right to left (offset vertically) */}
      <path 
        d="M30 20 L22 20 M24 17 L21 20 L24 23" 
        stroke="white" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  )
}
