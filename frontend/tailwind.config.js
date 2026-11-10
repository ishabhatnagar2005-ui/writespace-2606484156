/** Define the warm paper/ink foundation inside Tailwind, not a custom stylesheet. */
import plugin from 'tailwindcss/plugin.js';

const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const lightness = [0.985, 0.95, 0.88, 0.79, 0.68, 0.57, 0.46, 0.37, 0.29, 0.22, 0.16];
/** Build a perceptually spaced ramp with softened chroma at the extremes.
 * Args:
 *   hue: Palette hue angle.
 *   chroma: Peak saturation at the middle of the ramp.
 * Returns:
 *   A complete numeric color scale.
 */
function ramp(hue, chroma) {
  return Object.fromEntries(steps.map((step, index) => [
    step, `oklch(${lightness[index]} ${chroma * (1 - Math.abs(index - 5) / 7)} ${hue})`,
  ]));
}

const primary = { ...ramp(277, 0.15), 600: '#4338ca', 700: '#3730a3' };
const neutral = ramp(80, 0.014);
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary,
        secondary: neutral,
        neutral,
        background: '#faf9f6',
        surface: '#fffefa',
        'surface-raised': '#f0eee8',
        foreground: '#25241f',
        'foreground-muted': '#625f56',
        border: '#d8d4ca',
        ring: '#4338ca',
        'on-primary': '#ffffff',
        success: { DEFAULT: '#346538', foreground: '#346538', light: '#edf3ec' },
        warning: { DEFAULT: '#805600', foreground: '#805600', light: '#fbf3db' },
        error: { DEFAULT: '#9f2f2d', foreground: '#9f2f2d', light: '#fdebec' },
        info: { DEFAULT: '#1f6c9f', foreground: '#1f6c9f', light: '#e1f3fe' },
        'card-indigo': '#4f46e5',
        'card-violet': '#7c3aed',
        'card-pink': '#db2777',
        'card-teal': '#0d9488',
        'avatar-admin': '#6d28d9',
        'avatar-admin-bg': '#f1eafa',
        'avatar-user': '#4338ca',
        'avatar-user-bg': '#eeedfa',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Candara', '"Trebuchet MS"', 'sans-serif'],
        display: ['Georgia', '"Times New Roman"', 'serif'],
        mono: ['"Courier New"', 'monospace'],
      },
      fontSize: {
        xs: ['0.8rem', { lineHeight: '1.5' }],
        sm: ['0.9rem', { lineHeight: '1.5' }],
        base: ['1rem', { lineHeight: '1.6' }],
        lg: ['1.25rem', { lineHeight: '1.6' }],
        xl: ['1.563rem', { lineHeight: '1.3' }],
        '2xl': ['1.953rem', { lineHeight: '1.2' }],
        '3xl': ['2.441rem', { lineHeight: '1.2' }],
        '4xl': ['3.052rem', { lineHeight: '1.1' }],
        '5xl': ['3.815rem', { lineHeight: '1.1' }],
      },
      borderRadius: { sm: '4px', DEFAULT: '6px', md: '8px' },
      boxShadow: { overlay: '0 8px 24px rgb(37 36 31 / 0.12)' },
      transitionDuration: { quick: '150ms' },
      transitionTimingFunction: { quiet: 'cubic-bezier(0, 0, 0.2, 1)' },
      keyframes: { float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } } },
      animation: { float: 'float 7s ease-in-out infinite' },
    },
  },
  plugins: [plugin(({ addBase, addComponents, theme }) => {
    addBase({
      body: { margin: '0', backgroundColor: theme('colors.background'), color: theme('colors.foreground'), fontFamily: theme('fontFamily.sans') },
      'h1, h2, h3, h4': { fontFamily: theme('fontFamily.display'), fontWeight: '400' },
      'a, button, input, select, textarea': { touchAction: 'manipulation' },
      ':focus-visible': { outline: `2px solid ${theme('colors.ring')}`, outlineOffset: '4px' },
      '::selection': { backgroundColor: theme('colors.avatar-user-bg'), color: theme('colors.foreground') },
      'input, select, textarea': { border: `1px solid ${theme('colors.border')}`, borderRadius: theme('borderRadius.DEFAULT'), padding: theme('spacing.3'), backgroundColor: theme('colors.surface') },
      '@media (prefers-reduced-motion: reduce)': { '*, *::before, *::after': { animation: 'none !important', transitionDuration: '0s !important', scrollBehavior: 'auto !important' } },
    });
    addComponents({
      '.page-container': { width: '100%', maxWidth: '1100px', marginLeft: 'auto', marginRight: 'auto', paddingLeft: theme('spacing.6'), paddingRight: theme('spacing.6') },
      '.button-primary': { display: 'inline-flex', justifyContent: 'center', alignItems: 'center', minHeight: '44px', padding: '10px 20px', borderRadius: theme('borderRadius.DEFAULT'), backgroundColor: theme('colors.primary.600'), color: theme('colors.on-primary'), fontWeight: '600', transitionProperty: 'background-color', transitionDuration: theme('transitionDuration.quick'), '&:hover': { backgroundColor: theme('colors.primary.700') } },
      '.button-secondary': { display: 'inline-flex', justifyContent: 'center', alignItems: 'center', minHeight: '44px', padding: '10px 20px', borderRadius: theme('borderRadius.DEFAULT'), border: `1px solid ${theme('colors.border')}`, '&:hover': { backgroundColor: theme('colors.surface-raised') } },
      '.text-link': { textUnderlineOffset: '4px', '&:hover': { textDecorationLine: 'underline' } },
    });
  })],
};
