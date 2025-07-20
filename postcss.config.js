export default {
  plugins: {
    autoprefixer: {},
    '@fullhuman/postcss-purgecss': {
      content: [
        './src/**/*.{html,ts,js}',
        './src/**/*.component.ts',
        './src/**/*.component.html'
      ],
      defaultExtractor: content => {
        // Extraction améliorée pour Angular
        const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
        const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
        return broadMatches.concat(innerMatches);
      },
      safelist: [
        // Bootstrap classes critiques
        /^btn/,
        /^navbar/,
        /^nav-/,
        /^collapse/,
        /^show$/,
        /^hide$/,
        /^fade/,
        /^modal/,
        /^dropdown/,
        /^carousel/,
        /^alert/,
        /^card/,
        /^container/,
        /^row$/,
        /^col/,
        /^d-/,
        /^flex/,
        /^justify/,
        /^align/,
        /^text/,
        /^bg-/,
        /^border/,
        /^rounded/,
        /^shadow/,
        /^position/,
        /^fixed/,
        /^absolute/,
        /^relative/,
        /^z-/,
        /^w-/,
        /^h-/,
        /^m[trblxy]?-/,
        /^p[trblxy]?-/,
        
        // Three.js et canvas
        /canvas/,
        /webgl/,
        /threejs/,
        
        // Classes dynamiques Angular
        /^ng-/,
        /active$/,
        /disabled$/,
        /open$/,
        /closed$/,
        
        // Animations et transitions
        /transition/,
        /transform/,
        /animate/,
        /keyframes/,
        
        // Classes spécifiques à votre site
        'navbar-brand',
        'navbar-toggler',
        'navbar-nav',
        'nav-link',
        'scroll-indicator',
        'light-control',
        'intensity-input',
        'canvas-container',
        'background-canvas'
      ],
      variables: true, // Garde les variables CSS
      keyframes: true, // Garde les animations
      fontFace: true   // Garde les fonts
    }
  }
};
