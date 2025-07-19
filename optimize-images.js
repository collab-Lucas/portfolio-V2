import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';

(async () => {
  try {
    const files = await imagemin(['src/assets/img/**/*.{jpg,png}'], {
      destination: 'src/assets/img/webp',
      plugins: [
        imageminWebp({quality: 80})
      ]
    });

    console.log('Images optimized:', files.length);
  } catch (error) {
    console.error('Error optimizing images:', error);
  }
})();
