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
      },
      keyframes: {
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
