# InvestTrack — Plateforme de gestion de portefeuille boursier

Application web full-stack pour gérer et visualiser un portefeuille d'investissement (ETF, actions) via comptes PEA et CTO.

## Stack technique

- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend** : Next.js API Routes
- **Base de données** : PostgreSQL + Prisma ORM
- **Auth** : NextAuth.js (email/password)
- **Charts** : Recharts
- **Design** : Dark mode Bloomberg-inspired, accents vert (#00C896) / rouge (#FF4757)

## Installation

### Prérequis

- Node.js 18+
- PostgreSQL

### Setup

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos identifiants PostgreSQL

# 3. Générer le client Prisma et créer les tables
npx prisma generate
npx prisma db push

# 4. Seeder la base avec les données de démo
npx prisma db seed

# 5. Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `NEXTAUTH_SECRET` | Clé secrète pour NextAuth (générer avec `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL de l'application (ex: `http://localhost:3000`) |

## Compte démo

- **Email** : `demo@investtrack.fr`
- **Mot de passe** : `demo123`

Contient :
- 1 PEA Fortuneo : CW8.PA, EWLD.PA, PAEEM.PA
- 1 CTO Boursobank : MC.PA (LVMH), TTE.PA (TotalEnergies)
- Transactions historiques sur 18 mois
- Dividendes TotalEnergies

## Pages

| Route | Description |
|---|---|
| `/auth` | Connexion / Inscription |
| `/dashboard` | Tableau de bord avec métriques, fiscalité PEA/CTO |
| `/portfolios` | Gestion multi-comptes, ajout de lignes, import CSV |
| `/analytics` | Analyse de diversification géographique et sectorielle |
| `/simulator` | Simulateur de projection multi-scénarios |
| `/dividends` | Calendrier des dividendes, YoC, projection DRIP |
| `/earnings` | Calendrier des publications de résultats |
| `/settings` | Profil, préférences fiscales, export CSV |

## Déploiement

Compatible Vercel + Supabase (PostgreSQL) :

1. Créer un projet Supabase et récupérer l'URL de connexion
2. Déployer sur Vercel avec les variables d'environnement
3. Exécuter `npx prisma db push` et `npx prisma db seed` en post-deploy

## Structure du projet

```
src/
├── app/
│   ├── (app)/           # Pages authentifiées (avec sidebar)
│   │   ├── dashboard/
│   │   ├── portfolios/
│   │   ├── analytics/
│   │   ├── simulator/
│   │   ├── dividends/
│   │   ├── earnings/
│   │   └── settings/
│   ├── api/             # API Routes
│   └── auth/            # Page de connexion
├── components/
│   ├── ui/              # Composants réutilisables
│   └── sidebar.tsx
└── lib/
    ├── auth.ts          # Configuration NextAuth
    ├── calculations.ts  # Calculs financiers
    ├── parsers.ts       # Import CSV
    ├── prisma.ts        # Client Prisma
    ├── utils.ts         # Utilitaires
    └── yahoo-finance.ts # API Yahoo Finance
prisma/
├── schema.prisma        # Modèles de données
└── seed.ts              # Données de démo
```
