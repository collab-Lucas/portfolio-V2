# Portfolio Lucas Bonneau - Version 2

## 📋 Description

Projet test de portfolio développé avec Angular et Three.js, visant à expérimenter l’intégration de scènes 3D avec Bootstrap. Déployé sur Vercel, ce projet sert aussi de terrain d’expérimentation pour tester Copilot et comparer différentes IA — ce qui a finalement eu tendance à complexifier le projet plus qu’à le simplifier.

## 🚀 Technologies Utilisées

### Frontend
- **Angular 19** - Framework principal avec standalone components
- **TypeScript** - Langage de développement typé
- **Three.js** - Animations et graphiques 3D
- **Bootstrap 5** - Framework CSS responsive
- **Tailwind CSS** - Utilitaires CSS personnalisés
- **AOS (Animate On Scroll)** - Animations au scroll

### Outils de Développement
- **Node.js** - Environnement d'exécution
- **Webpack** - Bundler et optimisation
- **PostCSS** - Traitement CSS avancé
- **ESLint** - Linting du code
- **Prettier** - Formatage du code

### Optimisations
- **Service Workers** - Cache et performance
- **Lazy Loading** - Chargement différé des composants
- **Compression** - Gzip et Brotli
- **Minification** - CSS et JavaScript
- **Optimisation d'images** - WebP et AVIF

## 📁 Structure du Projet

```
src/
├── app/
│   ├── components/          # Composants de l'interface
│   │   ├── navbar/         # Navigation
│   │   ├── about/          # Section À propos
│   │   ├── skills/         # Compétences techniques
│   │   ├── contact-form/   # Formulaire de contact
│   │   └── background/     # Arrière-plan 3D
│   ├── services/           # Services Angular
│   │   ├── three.service.ts         # Gestion Three.js
│   │   ├── color.service.ts         # Gestion des couleurs
│   │   └── performance-orchestrator.service.ts
│   └── workers/            # Web Workers
├── assets/                 # Ressources statiques
│   ├── models/            # Modèles 3D
│   ├── textures/          # Textures
│   └── img/               # Images optimisées
└── styles/                # Feuilles de style
```

## 🛠️ Installation et Développement

### Prérequis
- Node.js 18+ et npm
- Angular CLI 19+

### Installation
```bash
# Cloner le repository
git clone https://github.com/collab-Lucas/portfolio-V2.git
cd portfolio-V2

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm start
```

### Scripts Disponibles
```bash
npm start              # Serveur de développement (port 4200)
npm run build          # Build de production
npm run build:prod     # Build optimisé avec compression
npm run serve:prod     # Serveur de production
npm run lint           # Vérification du code
npm run compress       # Compression des assets
npm run optimize       # Optimisation complète
```

## 🎯 Fonctionnalités

### Interface Utilisateur
- **Design Responsive** - Compatible mobile, tablette, desktop
- **Animations Fluides** - Transitions CSS et Three.js
- **Mode Sombre/Clair** - Changement de thème dynamique
- **Navigation Smooth** - Scroll fluide entre sections

### Arrière-plan 3D Interactif
- **Particules Animées** - Système de particules avec Three.js
- **Interactions Souris** - Effet de parallaxe et suivi curseur
- **Performance Optimisée** - Web Workers pour les calculs intensifs
- **Responsive** - Adaptation automatique à la taille d'écran

### Optimisations Performances
- **Score Lighthouse 90+** - Performance, accessibilité, SEO
- **Temps de Chargement < 2s** - Optimisation aggressive
- **Lazy Loading** - Chargement différé des composants
- **Cache Intelligent** - Service Workers et stratégies de cache

## 🚀 Déploiement

### Production Build
```bash
# Build optimisé
npm run build:prod

# Les fichiers sont générés dans dist/
```

### Serveur de Production
```bash
# Utiliser le serveur Express optimisé
npm run serve:prod
```

### Plateformes Supportées
- **Vercel** - Déploiement automatique ✅
- **Netlify** - Configuration incluse
- **GitHub Pages** - Script de déploiement
- **Railway** - Configuration Docker
- **Serveur Personnel** - Express.js optimisé

## 📊 Performances

### Métriques Lighthouse
- **Performance** : 70+
- **Accessibilité** : 95+
- **Bonnes Pratiques** : 100
- **SEO** : 100

### Optimisations Appliquées
- Compression Gzip/Brotli (réduction 70-80%)
- Minification CSS/JS
- Optimisation images (WebP, AVIF)
- Lazy loading des composants
- Service Workers pour le cache
- Preload des ressources critiques

## 🎨 Sections du Portfolio

1. **Accueil** - Introduction avec arrière-plan 3D
2. **À Propos** - Présentation personnelle
3. **Compétences** - Technologies maîtrisées
4. **Projets** - Réalisations avec liens GitHub
5. **Contact** - Formulaire et informations

## 🔧 Configuration

### Variables d'Environnement
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  enableThreeJs: true,
  enableAnimations: true
};
```

### Personnalisation
- Couleurs : `src/styles/variables.css`
- Animations : `src/styles/animations.css`
- Three.js : `src/app/services/three.service.ts`

## 📱 Responsive Design

- **Mobile** : < 768px
- **Tablette** : 768px - 1024px
- **Desktop** : > 1024px

Breakpoints Bootstrap personnalisés avec optimisations spécifiques.

## 🐛 Dépannage

### Problèmes Courants
1. **Three.js ne charge pas** : Vérifier WebGL dans le navigateur
2. **Animations lentes** : Réduire la complexité des particules
3. **Build échoue** : Vérifier les versions Node.js/Angular

### Performance
- Utiliser Chrome DevTools pour profiling
- Activer les Web Workers en production
- Réduire le nombre de particules sur mobile

## 📄 Licence

Projet personnel - Tous droits réservés

## 👨‍💻 Auteur

**Lucas Bonneau**
- Portfolio : https://lucas-bonneau-portfolio-nhl46plwm-lucas-bonneaus-projects.vercel.app
- LinkedIn : [lucas-bonneau-8396bb144](https://www.linkedin.com/in/lucas-bonneau-8396bb144/)
- GitHub : [collab-Lucas](https://github.com/collab-Lucas)
- Email : lucasbonneau9@gmail.com

## 🔗 Liens et Ressources

### Three.js
- [Documentation Three.js](https://threejs.org/docs/)
- [Demo Scroll Animation](https://github.com/fireship-io/threejs-scroll-animation-demo/blob/main/main.js)
- [Tutoriel YouTube](https://www.youtube.com/watch?v=Q7AOvWpIVHU)

### Angular
- [JavaScript Objects - OpenClassrooms](https://openclassrooms.com/fr/courses/7696886-apprenez-a-programmer-avec-javascript-1/8204834-structurez-des-donnees-grace-aux-objets)
- [Angular Débutant - OpenClassrooms](https://openclassrooms.com/fr/courses/7471261-debutez-avec-angular/7549436-construisez-une-application-angular-avec-le-cli)
- [Application Angular Complète](https://www.ganatan.com/tutorials/creer-application-web-complete-avec-angular)
- [Tutoriel Angular 1](https://www.youtube.com/watch?v=3qVbO45ucoA)
- [Tutoriel Angular 2](https://www.youtube.com/watch?v=TjS39N11O7U)

### Développement
- **Aide, optimisation, conseils et réparation des erreurs :** GitHub Copilot

## 📝 Notes de Développement Personnel

### Processus de Création
Ce projet a été créé avec Angular, Bootstrap et Three.js. Les objets 3D ont été modélisés sous Blender, et l'apparence Bootstrap a été réalisée avec Bootstrap Studio. GitHub Copilot a été utilisé pour donner des conseils sur les étapes à suivre pour la création du projet. Le mode agent a également été utilisé pour aider à corriger les erreurs, notamment celles liées à Three.js.

### Retour d'Expérience sur les Outils IA

**⚠️ Conseil important :** Ne pas utiliser le mode agent, peu importe l'IA choisie (Claude Sonnet, ChatGPT, etc.). Ces outils ont tendance à compliquer le projet, peinent à comprendre les questions même avec de la documentation, et génèrent autant de bugs qu'ils n'en corrigent.

**Problèmes rencontrés :** J'ai déjà passé plusieurs heures à essayer de comprendre ce que l'IA avait modifié, juste pour pouvoir corriger ses erreurs.

### Exemples d'Erreurs IA Rencontrées
- Au lieu d'une simple fonction get de 5 lignes avec deux entrées, génération de dix fonctions get différentes, une pour chaque lumière de la scène Three.js
- Difficulté à comprendre que le site devait être autonome (standalone)
- Complexification inutile de l'architecture
- Introduction de bugs lors des "corrections"

### Recommandations d'Outils
- ✅ **GitHub Copilot** : Excellent pour l'autocomplétion et suggestions
- ⚠️ **Mode Agent** : À éviter pour les projets complexes
- 📚 **Documentation officielle** : Toujours privilégier pour la compréhension
- 🧠 **Logique personnelle** : Garder le contrôle de l'architecture

---

*Portfolio développé avec passion en Angular 19 et Three.js*

*This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.7.*
