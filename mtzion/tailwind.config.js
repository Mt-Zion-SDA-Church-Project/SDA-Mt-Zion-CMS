/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#007f98',
      },
      animation: {
        'slide': 'slide 60s linear infinite',
        'shimmer': 'shimmer 8s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'bar-slide': 'barSlide 1.45s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'soft-breathe': 'softBreathe 2.5s ease-in-out infinite',
      },
      keyframes: {
        barSlide: {
          '0%': { transform: 'translateX(-120%)' },
          '55%': { transform: 'translateX(220%)' },
          '100%': { transform: 'translateX(-120%)' },
        },
        softBreathe: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        slide: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { 
            transform: 'translateY(0px) translateX(0px)',
            opacity: '0.3',
          },
          '25%': { 
            transform: 'translateY(-20px) translateX(10px)',
            opacity: '0.7',
          },
          '50%': { 
            transform: 'translateY(-10px) translateX(-5px)',
            opacity: '1',
          },
          '75%': { 
            transform: 'translateY(-25px) translateX(15px)',
            opacity: '0.5',
          },
        },
      },
    },
  },
  plugins: [],
};
