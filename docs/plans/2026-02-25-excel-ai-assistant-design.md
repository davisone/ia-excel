# Design — Assistant IA pour Excel (Cabinets comptables)

**Date** : 2026-02-25
**Statut** : Validé

## Contexte

Développer un chatbot IA intégré à Excel sous forme d'add-in Office, destiné aux cabinets d'experts-comptables. L'assistant aide les comptables en répondant à des questions de comptabilité et en analysant les données du fichier Excel ouvert.

**Objectif** : MVP fonctionnel pour un premier cabinet, avec une architecture pensée pour évoluer en SaaS multi-cabinets.

## Architecture générale

```
Excel (Desktop/Online)
  └─ Task Pane (iframe)
       └─ React App (chat UI + office.js)
              │
              │ HTTPS
              ▼
       Vercel (Next.js)
         ├─ /taskpane — Interface chat (React)
         ├─ /api/chat — Endpoint streaming OpenAI
         ├─ /api/conversations — CRUD conversations
         ├─ /api/auth — Microsoft SSO (NextAuth.js)
         └─ Vercel Postgres — Stockage users/conversations/messages
              │
              ▼
       OpenAI API (GPT-4o)
```

### Flux utilisateur

1. Le comptable ouvre Excel → l'add-in charge le task pane
2. Redirigé vers le login Microsoft si pas connecté
3. Une fois authentifié, il voit ses conversations passées + bouton "Nouvelle conversation"
4. Il pose une question dans le chat
5. Office.js lit les données de la feuille active + la sélection courante
6. Le frontend envoie message + données Excel à `/api/chat`
7. Le backend construit un prompt avec le contexte Excel + la question
8. OpenAI répond en streaming → affiché en temps réel dans le chat
9. Le message est sauvegardé en base de données

## Stack technique

- **Framework** : Next.js (App Router)
- **Langage** : TypeScript (strict)
- **Styling** : Tailwind CSS
- **IA** : OpenAI API (GPT-4o) avec streaming
- **Excel** : @microsoft/office-js
- **Auth** : NextAuth.js + provider Azure AD (Microsoft SSO)
- **Base de données** : Vercel Postgres
- **Hébergement** : Vercel
- **Package manager** : npm

## Structure du projet

```
ia-excel/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Landing page / docs
│   │   ├── taskpane/
│   │   │   └── page.tsx                # Interface chat (chargée dans Excel)
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       │   └── route.ts            # Auth Microsoft SSO
│   │       ├── chat/
│   │       │   └── route.ts            # Endpoint streaming OpenAI
│   │       └── conversations/
│   │           └── route.ts            # CRUD conversations
│   ├── components/
│   │   ├── ui/
│   │   │   ├── chat-input.tsx
│   │   │   ├── chat-message.tsx
│   │   │   └── loading-dots.tsx
│   │   └── sections/
│   │       ├── chat-container.tsx
│   │       └── conversation-list.tsx
│   ├── lib/
│   │   ├── openai.ts                   # Client OpenAI + construction prompt
│   │   ├── excel.ts                    # Helpers office.js
│   │   ├── db.ts                       # Client base de données
│   │   └── system-prompt.ts            # Prompt système expert-comptable
│   ├── hooks/
│   │   ├── use-chat.ts                 # État du chat + streaming
│   │   └── use-excel-data.ts           # Récupération données Excel
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── globals.css
├── public/
│   ├── manifest.xml                    # Manifeste Office Add-in
│   └── assets/
│       └── icon-*.png
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local
```

## Gestion des données Excel

### Stratégie d'envoi

- **Toujours envoyer la feuille active complète** à chaque requête
- La sélection courante est envoyée en complément comme indication de focus
- Métadonnées du classeur (noms des feuilles, dimensions) incluses

### Format de données

```json
{
  "activeSheet": {
    "name": "Journal Ventes",
    "headers": ["Compte", "Libellé", "Débit", "Crédit"],
    "rows": [["411000", "Client X", "1200.00", ""], ...]
  },
  "selection": {
    "range": "A1:D15"
  },
  "workbookSheets": ["Journal Ventes", "Journal Achats", "Bilan"]
}
```

### Limites de tokens

- Si la feuille dépasse ~4000 lignes, découpage en chunks
- Résumé des parties non-sélectionnées pour les très gros fichiers
- Estimation du nombre de tokens avant envoi à OpenAI

## Authentification

- **Microsoft SSO** via NextAuth.js + provider Azure AD
- Connexion quasi transparente (le comptable est déjà connecté dans Excel)
- Chaque utilisateur identifié par son `microsoft_id`

## Base de données

### Tables

**users**
- `id` (uuid, PK)
- `email` (string, unique)
- `name` (string)
- `microsoft_id` (string, unique)
- `created_at` (timestamp)

**conversations**
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `title` (string)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**messages**
- `id` (uuid, PK)
- `conversation_id` (uuid, FK → conversations)
- `role` (enum: user, assistant)
- `content` (text)
- `excel_data` (jsonb, nullable)
- `created_at` (timestamp)

## System prompt

**Rôle** : Assistant expert-comptable français spécialisé dans l'analyse de fichiers Excel.

**Compétences** :
- Plan comptable général (PCG) français
- Règles fiscales courantes (TVA, IS, BIC, etc.)
- Normes comptables françaises
- Vérification de cohérence (équilibre débit/crédit, totaux, anomalies)

**Comportement** :
- Répond toujours en français
- Analyse les données Excel avant de répondre
- Signale les anomalies détectées
- Reste prudent ("je recommande de vérifier avec..." — responsabilité professionnelle)

## Déploiement et distribution

### MVP

- Déploiement sur Vercel (push sur `main` → déploiement auto)
- Distribution par **sideloading** : fichier `manifest.xml` fourni au cabinet
- Chargement dans Excel : Insertion → Mes compléments → Charger un complément

### SaaS (futur)

- Publication sur le Microsoft AppSource
- Authentification par cabinet (tenant Microsoft)
- Système d'abonnement / facturation

## Scalabilité

- Chaque comptable a sa propre session indépendante
- Les requêtes sont stateless côté backend (serverless)
- Pas de collision entre utilisateurs simultanés
- Rate limit OpenAI (~500 req/min tier payant) largement suffisant