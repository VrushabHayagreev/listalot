/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        xs: "450px",

        sm: "575px",

        md: "768px",

        lg: "992px",

        xl: "1200px",

        xxl: "1500px",
      },
      fontWeight: {
        thin: '100',
        hairline: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        'extra-bold': '800',
        black: '900',
      },
      fontFamily: {

        'roboto': ['Roboto', 'sans-serif'],
        'blackOpsOne': ['blackOpsOne', 'sans-serif'],
      },
      colors: {
      
        darkprimary: "#111827",
        primary: "#00ADB5",
        secondary : '#AFAEB2',
        back:'#e6e1e2',
        textsec :'#4A4459',
        bcolor : '#65558f',
        bcolordark:'#49454F',
        line : '#CDCDCF',
        c1: '#dc2626',
        c2:'#facc15',
        c3 : '#22c55e'
      },
      fontSize: {
        base: '14px',  // Set the default base font size to 18px
      
    
      },
    },
  },
  plugins: [require("tailwind-scrollbar-hide")],
};
