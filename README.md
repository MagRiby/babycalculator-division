# 🌸 Kawaii Division ! (Tutora Div Game)

Une application web éducative et **Kawaii** pour apprendre et maîtriser les tables de division de **1 à 12**, spécialement pensée pour **iPad** (en portrait comme en paysage) et inspirée de [babycalculator](https://github.com/MagRiby/babycalculator).

## ✨ Fonctionnalités

- **Style Pastel Kawaii** : Mascotte lapin animée (qui réagit aux bonnes et mauvaises réponses), couleurs pastel douces, confettis kawaii et effets sonores synthétisés via Web Audio API.
- **Tables de 1 à 12** :
  - **Mode Classique** : Choisis les tables jusqu'à 5, 10 ou 12, en séries de 10 ou 20 questions avec chronomètre global et par question.
  - **Mode Défi (÷ 1 à ÷ 12)** : Choisis une table spécifique à maîtriser (les 12 divisions de la table). Débloque le badge **👑 DIVISION MASTER** une fois les 12 divisions réussies !
- **Révision intelligente (`🎯 À revoir`)** : Les divisions ratées sont ajoutées à la liste des défis et reproposées automatiquement (30 % de chance) jusqu'à ce qu'elles soient maîtrisées.
- **Suivi & Historique (`📊`)** : Affiche les scores récents, les tables les plus difficiles et les divisions les plus ratées (sauvegarde locale `localStorage` + synchronisation Firebase optionnelle).
- **Optimisé iPad / PWA** : Ajoutable sur l'écran d'accueil de l'iPad (`Ajouter à l'écran d'accueil` dans Safari) pour un mode plein écran sans zoom involontaire.
