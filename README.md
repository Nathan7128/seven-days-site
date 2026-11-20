# Seven Days · site web

Site du fast food Seven Days, 6 rue d'Assas, Clermont-Ferrand.
HTML, CSS et JavaScript simples : aucune dépendance, aucune étape de build.

## Organisation

```
seven-days-site/
├─ public/                  ← tout ce dossier est mis en ligne tel quel
│  ├─ index.html            ← structure et textes de la page
│  ├─ css/style.css         ← apparence (couleurs et polices en haut, dans :root)
│  ├─ js/app.js             ← horaires, carte, personnalisation, panier, commande
│  ├─ menu.json             ← LA CARTE : produits, prix, options
│  ├─ img/                  ← logo, photos produits (png), favicon
│  └─ _headers              ← cache des images, en-têtes de sécurité
├─ wrangler.jsonc           ← configuration Cloudflare
├─ .gitignore
└─ README.md
```

## Modifications courantes

| Je veux…                         | Fichier                | Comment |
|----------------------------------|------------------------|---------|
| Changer un prix                  | `public/menu.json`     | Modifier le nombre après `"price"` (7.5 = 7,50 €) |
| Ajouter / retirer un produit     | `public/menu.json`     | Copier ou supprimer un bloc `{ "id": … }` |
| Remplacer une photo              | `public/img/`          | Même nom de fichier, format png, ~800 px de large |
| Changer les horaires             | `public/js/app.js`     | Constante `HOURS` en haut du fichier, et le tableau `openingHoursSpecification` dans `index.html` |
| Changer un texte                 | `public/index.html`    | |

Chaque modification poussée sur la branche `master` est mise en ligne en 1 à 2 minutes.

## Tester sur son PC

    npx wrangler dev

puis ouvrir http://localhost:8787. (Nécessite Node.js.)

## Mise en ligne

Connexion GitHub ↔ Cloudflare, une seule fois :
1. Cloudflare › Workers & Pages › Create › Import a repository › choisir ce dépôt.
2. Build command : vide. Deploy command : `npx wrangler deploy`.
3. Save and Deploy. Le site est en ligne sur `seven-days.<compte>.workers.dev`.
4. Domaine : Workers › seven-days › Settings › Domains & Routes › Add custom domain.

## Avant le lancement
- Retirer `<meta name="robots" content="noindex">` dans `index.html`.
- Brancher la commande (le ticket final est une démo : rien n'est transmis).
- Mettre les vrais liens TikTok, Instagram, Facebook, Uber Eats.
- `og:image` : mettre l'adresse complète (`https://<domaine>/img/og.jpg`).
- Rédiger mentions légales et confidentialité ; publier la liste des allergènes.
