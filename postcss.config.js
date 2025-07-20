
import autoprefixer from 'autoprefixer';
import purgecssModule from '@fullhuman/postcss-purgecss';
const purgecss = purgecssModule.default || purgecssModule;

export default {
  plugins: [
    autoprefixer(),
    purgecss({
      content: [
        './src/**/*.html',
        './src/**/*.ts'
      ],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
      safelist: [
        /^btn/, /^navbar/, /^nav/, /^container/, /^row/, /^col/, /^show$/, /^active$/, /^collapse$/, /^fade$/, /^in$/
      ]
    })
  ]
};
