# 📂 PHASE 6 - RÉORGANISATION ARCHITECTURE

## 🎯 Plan de Réorganisation des Services

### 📁 **Structure Actuelle** (Problématique)
```
src/app/services/
├── core/                    # Partiellement utilisé
├── features/               # Services métier mélangés
├── utils/                  # Utilitaires et services mélangés
├── threejs/                # Services Three.js dupliqués
├── interfaces/             # Types et interfaces
├── Services racine (éparpillés)
└── Fichiers de test/documentation
```

### 🎯 **Nouvelle Structure** (Optimisée)
```
src/app/services/
├── core/                   # Services fondamentaux
│   ├── three-core.service.ts
│   ├── memory-management.service.ts
│   └── resize.service.ts
├── features/               # Services métier spécialisés
│   ├── three/              # Sous-module Three.js
│   │   ├── navbar-three.service.ts
│   │   ├── background-three.service.ts
│   │   ├── light.service.ts
│   │   └── animation.service.ts
│   ├── ui/                 # Sous-module UI
│   │   ├── color.service.ts
│   │   ├── navbar-effects.service.ts
│   │   └── contact.service.ts
│   └── index.ts            # Barrel exports
├── shared/                 # Utilitaires partagés
│   ├── utils/
│   │   ├── auto-unsubscribe.decorator.ts
│   │   └── common-three.service.ts
│   ├── interfaces/
│   └── types/
└── index.ts                # Export principal
```

---

## 🔧 **Migrations à Effectuer**

### 1. **Services Core** ✅
- [x] three-core.service.ts → core/
- [x] memory-management.service.ts → core/
- [ ] resize.service.ts → core/

### 2. **Services Features/Three** 📦
- [ ] navbar-three.service.ts → features/three/
- [ ] background-three.service.ts → features/three/
- [ ] Nettoyer les doublons threejs/

### 3. **Services Features/UI** 🎨
- [ ] color.service.ts → features/ui/
- [ ] navbar-effects.service.ts → features/ui/
- [ ] contact.service.ts → features/ui/

### 4. **Utilitaires Shared** 🛠️
- [x] auto-unsubscribe.decorator.ts → shared/utils/
- [ ] common-three.service.ts → shared/utils/
- [ ] Interfaces → shared/interfaces/

### 5. **Nettoyage** 🧹
- [ ] Supprimer doublons
- [ ] Mettre à jour imports
- [ ] Créer barrel exports
- [ ] Tests de validation

---

## 📋 **Actions Détaillées**

### Phase 1: Création Structure
1. Créer dossiers manquants
2. Déplacer services core
3. Créer barrel exports

### Phase 2: Migration Features  
1. Organiser services par domaine
2. Nettoyer doublons threejs/
3. Mettre à jour imports

### Phase 3: Finalisation
1. Nettoyer ancienne structure
2. Valider imports
3. Tests fonctionnels

---

*Plan d'exécution - Portfolio V2 Architecture Optimization*
