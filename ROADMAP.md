# 🗺️ Roadmap & Futures Évolutions

Ce document recense les fonctionnalités prévues, les idées d'amélioration et la dette technique à traiter pour l'application **DeliveryHappy**.

## **🚀 Fonctionnalités Prioritaires (Phase 2)**

### **1. Liste de Courses Automatisée (Shopping List)**
*Voir spécifications détaillées dans `SHOPPING-LIST-SPEC.md`*
- [ ] Vue détaillée par plat : Listing des ingrédients nécessaires par jour.
- [ ] Vue agrégée : Consolidation des quantités (ex: "5kg de tomates" total).
- [ ] Export PDF / CSV pour les achats.
- [ ] Gestion du stock / inventaire (optionnel futur).

### **2. Intégration Paiement (Stripe)**
- [ ] Finaliser l'intégration Stripe (actuellement en mode test/brouillon).
- [ ] Paiement en ligne obligatoire à la commande (ou optionnel).
- [ ] Gestion des webhooks Stripe pour passer la commande en `PAID` automatiquement.
- [ ] Gestion des remboursements en cas d'annulation.

### **3. Notifications & Emails (Resend)**
*Voir `EMAIL-INTEGRATION-GUIDE.md`*
- [ ] Email de confirmation de commande (reçu client).
- [ ] Email de notification aux admins pour chaque nouvelle commande.
- [ ] Email "Votre commande est en route" (changement de statut).
- [ ] Rappel quotidien pour commander avant l'heure limite.
- [ ] Notification "Dernière chance" : email/push automatique X minutes avant la deadline de commande.

---

## **💎 Améliorations Expérience Utilisateur (UX/UI)**

### **Côté Client**
- [ ] **Favoris** : Possibilité de sauvegarder ses plats préférés.
- [ ] **Filtres Avancés** : Filtrer le menu par allergènes (sans gluten, vege...) directement.
- [ ] **Feedback** : Permettre aux utilisateurs de noter les repas.
- [ ] **Profil Avancé** : Gestion de son solde / crédits repas (si système de portefeuille).
- [x] **Modification du mot de passe** : Disponible sur la page de préférences (connecté) et via "Mot de passe oublié ?" sur la page de connexion (email de réinitialisation via `/forgot-password` → `/reset-password`).
- [ ] **Commande récurrente** : "Recommander la même chose que la semaine dernière" en 1 clic.
- [ ] **Teaser prochain menu** : Aperçu/teaser du menu du lendemain ou de la semaine prochaine sur la page d'accueil.
- [ ] **Statut de commande en temps réel** : Page de suivi live (polling ou WebSocket) avec timeline visuelle PENDING → IN_KITCHEN → IN_DELIVERY → DELIVERED.
- [ ] **Choix de créneau horaire** : Sélection d'une heure de livraison parmi plusieurs créneaux disponibles.
- [ ] **Historique de dépenses** : Graphique mensuel côté user ("vous avez dépensé X€ ce mois-ci").

### **Côté Admin**
- [x] **Gestion des Utilisateurs** : Page admin complète listant tous les users avec modification des rôles, et leaderboard des commandes (total de commandes par user).
- [x] **Suppression page secrète `/admin-init`** : Remplacée par `/admin/users`, dossier supprimé.
- [ ] **Duplication de Menu** : Pouvoir cloner un menu d'une semaine passée pour gagner du temps.
- [ ] **Dashboard Amélioré** : Graphiques de ventes, plats les plus populaires, stats par zone de livraison.
- [ ] **Impression Ticket** : Format d'impression thermique pour coller sur les boîtes (Nom + Options).
- [ ] **Page Adresses v1** : Afficher sur la carte les adresses liées aux commandes d'un jour donné (filtre par date/menu) — visualiser la densité et répartition géographique pour affiner les zones de livraison.
- [ ] **Commentaires internes par commande** : Notes admin visibles uniquement en back-office (allergies spéciales, instructions particulières).
- [ ] **Export commandes par jour** : CSV/PDF de la liste complète pour la cuisine et la livraison.
- [ ] **Vue "Cuisine"** : Interface simplifiée (lecture seule, grand écran) pour que la cuisine voie les commandes du jour en temps réel, triées par plat.
- [ ] **Alerte stock automatique** : Bloquer un plat automatiquement (`blocked` existe déjà dans le schema) si la cuisine le signale plein, avec notification aux users concernés.
- [ ] **Logs d'activité admin** : Audit trail basique — qui a changé quoi et quand.

---

## **🚚 Logistique & Livraison**

- [ ] **Optimisation de tournée automatique** : Basé sur les adresses du jour, proposer un ordre de livraison optimal (Google Maps Directions API ou OSRM).
- [ ] **Lien de suivi public** : Page sans login avec le statut de la commande d'un user (lien envoyé par SMS/email).
- [ ] **Scan QR par livreur** : Marquer une commande comme DELIVERED depuis un mobile sans accès admin complet.

---

## **🎁 Fidélisation**

- [ ] **Système de points/tampons** : 10ème repas offert, fidélisation simple.
- [ ] **Codes promos / Réductions** : Codes de réduction à usage unique ou limité.
- [ ] **Système de parrainage** : Inviter un collègue = réduction pour les deux.
- [ ] **Abonnement mensuel "Cantine"** : Formule avec tarif préférentiel.

---

## **🛠️ Technique & Dette Technique**

### **Code & Qualité**
- [ ] **Nettoyage TypeScript** : Retirer les `any` temporaires (notamment dans `OrdersClient.tsx` et `MenuList.tsx`).
- [ ] **Tests** : Mettre en place des tests E2E (Playwright) pour le parcours critique (Commande).
- [ ] **Performance** : Optimiser le chargement des images (Cloudinary ou Vercel Blob ?) et le caching des menus.
- [ ] **Rate limiting** : Sur les actions critiques (commande, paiement) pour éviter les doublons et abus.

### **Infrastructure**
- [ ] **Backup Automatique** : Script CRON pour dumper la base de données régulièrement (via script existant `backup-db.js`).
- [ ] **Monitoring** : Ajouter Sentry pour tracker les erreurs clients/serveur en temps réel.
- [ ] **CI/CD** : Pipeline GitHub Actions pour lancer les tests avant déploiement.

---

## **📱 Mobile & PWA**
- [ ] **Responsive Design** : Vérification fine de toutes les pages sur mobile.
- [ ] **PWA** : Rendre l'app installable (manifest.json) pour avoir l'icône sur le téléphone.
- [ ] **Notifications Push** : Notifications natives sur mobile pour le suivi de commande.

---

## **💡 Idées en Vrac (Backlog)**
- Gestion multi-entreprises (si on livre plusieurs bureaux distincts).
- Gestion des tupperwares pour un profil.
- Un profil / une commande ou un profil / plusieurs commandes ?
- Amélioration de la page profil "Client" - ajout numéro de téléphone, mail.
