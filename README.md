# 🍽️ Lunch Ordering App

Application web de commande de repas avec gestion administrative complète.

## **✨ Fonctionnalités**

### **Pour les Utilisateurs**
- 🔐 Connexion via Google OAuth
- 📅 Consultation des menus de la semaine
- 🛒 Commande de repas avec options diététiques
- 📍 Gestion des adresses de livraison
- 📜 Historique des commandes
- ⚙️ Préférences personnalisées

### **Pour les Administrateurs**
- 📊 Dashboard avec statistiques en temps réel
- 🍴 Gestion des menus et plats
- 📦 Gestion des commandes avec workflow complet
- 🚚 Planification des livraisons avec routing optimal
- 📈 Récapitulatifs détaillés par jour

## **🛠️ Technologies Utilisées**

- **Framework** : Next.js 14 (App Router)
- **UI** : Mantine UI
- **Base de données** : PostgreSQL avec Prisma ORM
- **Authentification** : NextAuth.js
- **Styling** : CSS Modules
- **Déploiement** : Vercel (recommandé)

## **🚀 Démarrage Rapide**

### **Prérequis**
- Node.js 18+ 
- PostgreSQL
- Compte Google Cloud (pour OAuth)

### **Installation**

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/lunch-ordering-app.git
cd lunch-ordering-app
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Puis éditer `.env` avec vos valeurs.

4. **Initialiser la base de données**
```bash
npx prisma migrate dev
npx prisma db seed  # Optionnel
```

5. **Lancer le serveur de développement**
```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## **📁 Structure du Projet**

```
lunch-ordering-app/
├── app/                    # Next.js App Router
│   ├── admin/             # Pages admin
│   │   ├── delivery/      # Planification livraisons
│   │   ├── menus/         # Gestion menus
│   │   └── orders/        # Gestion commandes
│   ├── menu/              # Consultation menus
│   ├── order/             # Passage de commande
│   ├── orders/            # Historique commandes
│   └── preferences/       # Préférences utilisateur
├── lib/                   # Utilitaires
│   ├── auth.ts           # Configuration NextAuth
│   └── prisma.ts         # Client Prisma
├── prisma/               # Schéma et migrations
│   ├── schema.prisma     # Modèle de données
│   └── migrations/       # Migrations SQL
└── scripts/              # Scripts utilitaires
    ├── backup-db.js      # Sauvegarde BDD
    └── restore-db.js     # Restauration BDD
```

## **🔑 Configuration Google OAuth**

1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un nouveau projet
3. Activer Google+ API
4. Créer des identifiants OAuth 2.0
5. Configurer les URI de redirection :
   - Dev : `http://localhost:3000/api/auth/callback/google`
   - Prod : `https://votre-domaine.com/api/auth/callback/google`

## **📦 Scripts Disponibles**

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm start            # Serveur de production
npm run lint         # Linter
npx prisma studio    # Interface BDD
npx prisma migrate   # Migrations
```

## **🗄️ Gestion de la Base de Données**

### **Sauvegarder**
```bash
node scripts/backup-db.js
```

### **Restaurer**
```bash
node scripts/restore-db.js backups/backup-[timestamp].json
```

## **🚀 Déploiement**

Voir le guide complet : [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

**Résumé rapide** :
1. Créer une base PostgreSQL (Neon, Supabase, Railway)
2. Pousser le code sur GitHub
3. Déployer sur Vercel
4. Configurer les variables d'environnement
5. Exécuter les migrations
6. Créer le premier admin

## **👤 Créer un Administrateur**

Après déploiement, créez manuellement le premier admin :

```sql
INSERT INTO "User" (id, email, role, "createdAt", "updatedAt")
VALUES (
  'admin-' || gen_random_uuid()::text,
  'votre-email@gmail.com',
  'ADMIN',
  NOW(),
  NOW()
);
```

## **📚 Documentation**

- [Guide de Déploiement](./DEPLOYMENT-GUIDE.md)
- [Guide de Migration](./MIGRATION-README.md)
- [Intégration Email](./EMAIL-INTEGRATION-GUIDE.md)
- [Spécifications Liste de Courses](./SHOPPING-LIST-SPEC.md)

## **🔄 Workflow des Commandes**

1. **PENDING** - Prise en compte
2. **IN_KITCHEN** - En préparation
3. **IN_DELIVERY** - En livraison
4. **DELIVERED** - Livrée (attente paiement)
5. **PAID** - Livrée et payée
6. **CANCELLED** - Annulée

## **🤝 Contribution**

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## **📄 Licence**

MIT

## **🆘 Support**

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation dans `/docs`

---

**Développé avec ❤️ pour simplifier la gestion des commandes de repas**
