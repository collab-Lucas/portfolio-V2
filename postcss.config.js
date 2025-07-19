module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: [
        './src/**/*.html',
        './src/**/*.ts',
        './src/**/*.js'
      ],
      css: ['./src/**/*.css'],
      safelist: [
        // Préserver les classes Angular Material et Bootstrap
        /^mat-/,
        /^cdk-/,
        /^btn/,
        /^navbar/,
        /^container/,
        /^row/,
        /^col/,
        // Préserver les classes d'animation
        /^fade/,
        /^show/,
        /^hide/,
        // Préserver les classes personnalisées importantes
        'intro-section',
        'card-intro',
        'skill-category',
        'color-picker-container'
      ],
      // Ne pas purger les fichiers de développement
      rejected: false,
      printRejected: false
    })
  ]
};
