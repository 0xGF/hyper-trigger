const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)',
  				background: 'var(--chart-background)',
  				text: 'var(--chart-text)',
  				grid: 'var(--chart-grid)',
  				crosshair: 'var(--chart-crosshair)',
  				border: 'var(--chart-border)',
  				candle: {
  					up: 'var(--chart-candle-up)',
  					down: 'var(--chart-candle-down)',
  					'up-wick': 'var(--chart-candle-up-wick)',
  					'down-wick': 'var(--chart-candle-down-wick)',
  					'up-border': 'var(--chart-candle-up-border)',
  					'down-border': 'var(--chart-candle-down-border)'
  				},
  				volume: {
  					up: 'var(--chart-volume-up)',
  					down: 'var(--chart-volume-down)',
  					neutral: 'var(--chart-volume-neutral)'
  				}
  			},
  			price: {
  				positive: 'var(--price-positive)',
  				negative: 'var(--price-negative)',
  				neutral: 'var(--price-neutral)'
  			},
  			orderbook: {
  				bid: 'var(--orderbook-bid)',
  				ask: 'var(--orderbook-ask)',
  				'bid-bg': 'var(--orderbook-bid-bg)',
  				'ask-bg': 'var(--orderbook-ask-bg)',
  				'bid-hover': 'var(--orderbook-bid-hover)',
  				'ask-hover': 'var(--orderbook-ask-hover)'
  			}
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  		},
  		gridTemplateColumns: {
  			'20': 'repeat(20, minmax(0, 1fr))',
  		},
  		gridTemplateRows: {
  			'12': 'repeat(12, minmax(0, 1fr))',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-sans)',
                    ...fontFamily.sans
                ],
  			mono: [
  				'var(--font-mono)',
                    ...fontFamily.mono
                ]
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: 0
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: 0
  				}
  			},
  			'slide-in': {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(0)'
  				}
  			},
  			'slide-out': {
  				'0%': {
  					transform: 'translateX(0)'
  				},
  				'100%': {
  					transform: 'translateX(-100%)'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: 0
  				},
  				'100%': {
  					opacity: 1
  				}
  			},
  			'fade-out': {
  				'0%': {
  					opacity: 1
  				},
  				'100%': {
  					opacity: 0
  				}
  			},
  			'pulse-price': {
  				'0%, 100%': {
  					transform: 'scale(1)'
  				},
  				'50%': {
  					transform: 'scale(1.05)'
  				}
  			},
  			'bounce-small': {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-10px)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'slide-in': 'slide-in 0.3s ease-out',
  			'slide-out': 'slide-out 0.3s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'fade-out': 'fade-out 0.3s ease-out',
  			'pulse-price': 'pulse-price 0.5s ease-in-out',
  			'bounce-small': 'bounce-small 0.5s ease-in-out'
  		},
  		backdropBlur: {
  			xs: '2px'
  		},
  		spacing: {
  			'18': '4.5rem',
  			'88': '22rem'
  		},
  		screens: {
  			xs: '475px'
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
} 