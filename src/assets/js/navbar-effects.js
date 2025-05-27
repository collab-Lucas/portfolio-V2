//NAVBAR TEST 
// Sélectionne la navbar
const navbar = document.querySelector('.navbar');

// Ajoute un écouteur pour détecter le défilement
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('shrink-navbar');
    navbar.classList.remove('large-navbar');
  } else {
    navbar.classList.add('large-navbar');
    navbar.classList.remove('shrink-navbar');
  }
});