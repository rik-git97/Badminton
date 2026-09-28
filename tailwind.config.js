/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#050B08', surface: '#0B1410', surface2: '#12201A', line: '#1E3129',
        ink: '#EAF5EE', mute: '#86A094', lime: '#CCFF33', volt: '#FFE14A', danger: '#FF5F5F', court: '#0E2A1F'
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      }
    }
  },
  plugins: []
};
