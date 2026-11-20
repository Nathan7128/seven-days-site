# CLAUDE.md

Ce fichier guide Claude Code (claude.ai/code) pour travailler dans ce dépôt.

## Projet

Site vitrine + commande à emporter du fast food **Seven Days** (6 rue d'Assas, Clermont-Ferrand).
Site 100 % statique : HTML/CSS/JS vanilla, **aucune dépendance, aucun build, aucun framework**. Tout le contenu de `public/` est servi tel quel par Cloudflare Workers (Static Assets, voir `wrangler.jsonc`). Ne pas introduire de bundler, de `package.json` ni de librairie sans demande explicite.

Le propriétaire n'est pas forcément développeur : `README.md` documente les modifications courantes en français simple. Le garder à jour si on change la façon de modifier la carte, les horaires ou les photos.

## Commandes

- Serveur local : `npx wrangler dev` → http://localhost:8787 (nécessite Node.js)
- Déploiement : `npx wrangler deploy` (déclenché automatiquement par Cloudflare à chaque push sur la branche de prod)
- Pas de tests, pas de lint. Vérifier `menu.json` après édition : `python3 -m json.tool public/menu.json > /dev/null`

## Architecture

- `public/index.html` — page unique en sections plein écran « aimantées » (scroll-snap) : `#accueil`, `#crousty`, `#tacos`, `#carte`, `#infos`. Contient aussi le JSON-LD (`openingHoursSpecification`), les deux `<dialog>` vides (`#dlgItem`, `#dlgCart`) remplis par le JS, et la barre mobile `.mbar`.
- `public/js/app.js` — une seule IIFE, découpée en blocs commentés `/* ---------- … ---------- */` :
  - **Horaires** : constante `HOURS` (jour 0 = dimanche → `[ouverture, fermeture]` en heures, 24 = minuit), calculs toujours en heure de Paris via `Intl` (`paris()`). `PREP` (20 min) et `STEP` (15 min) génèrent les créneaux de retrait.
  - **Carte** : `fetch('menu.json')` puis `prepare()` résout les groupes d'options et `renderCarte()` génère chips + sections. Une catégorie dont ≥ 3 produits partagent la même image est rendue en liste (`.rows`) avec bannière, sinon en cartes (`.cards`).
  - **Personnalisation** : état `cur = { it, cfg, bad }` ; `renderItem()` re-génère tout le dialog à chaque clic en préservant scroll et focus via les attributs `data-k`. Délégation d'événements sur `data-act`.
  - **Panier** : `localStorage['sd-cart']`, lignes fusionnées par clé `id|résumé`. Au chargement, les lignes dont l'`id` n'existe plus dans `menu.json` sont supprimées.
  - **Commande** : étapes `cart → checkout → done`. Le ticket final est une **démo** : rien n'est envoyé nulle part.
  - Tout élément hors dialog avec `data-open="<id>"` ouvre la fiche produit ; `data-variant` présélectionne une variante, `data-direct` ajoute directement au panier si le produit n'a aucune option.
- `public/menu.json` — **source unique de la carte**. Structure : `groups` (options réutilisables) + `categories[].items[]`.
- `public/css/style.css` — design tokens dans `:root` (fond noir chaud, rouge `--red` en accent unique, jaune `--yellow` réservé aux prix/détails ; polices Bebas Neue / Barlow / Barlow Condensed / Courier Prime via Google Fonts).
- `public/_headers` — cache Cloudflare (images 30 j `immutable`, `menu.json` 5 min) et en-têtes de sécurité.

## Schéma de `menu.json`

- Produit : `id` (unique, utilisé par le panier et `data-open`), `name`, `price` **ou** `variants: { label, choices: [{ id, label, price }] }`, `img` (nom sans extension → `img/<img>.png`), `desc`, `badge`.
- Options d'un produit = `extraOpts` + (`opts` du produit, sinon `opts` de la catégorie).
- Une option est soit une chaîne (nom d'un groupe), soit `{ "use": "<groupe>", …surcharges }`, soit un groupe inline.
- Types de groupe :
  - `pick` : `min`, `max` (nombre ou objet indexé par id de variante), `preselect`, `hint`.
  - `count` : `total` (nombre ou objet par variante) — quantités par choix (ex. viandes du tacos).
  - `toggle` : `price` ou `priceBy` (par variante ; variante absente = indisponible, libellé `off`), `choose` (nom d'un groupe → sous-choix).
- `choices` : chaîne (gratuite) ou `{ label, price, id? }` ; l'id est sinon dérivé du label via `slug()`.
- Prix en nombres décimaux (`7.5` = 7,50 €), affichés via `toLocaleString('fr-FR')`.

## Conventions

- Tout le texte visible est en **français**, en tutoiement (« Choisis… », « Ton panier »).
- JS : style compact existant (helpers `$`, `$$`, `esc`, `euro`, `slug`, `r2`). Toute donnée injectée dans du HTML passe par `esc()`. Arrondir les montants avec `r2()`.
- Accessibilité soignée à préserver : rôles ARIA (`tablist`, `switch`, `aria-pressed`, `aria-current`), `:focus-visible`, `prefers-reduced-motion`.
- Les horaires sont dupliqués : `HOURS` dans `app.js` **et** `openingHoursSpecification` dans le JSON-LD de `index.html` — modifier les deux.
- Les ids de variantes utilisés dans `index.html` (`data-variant="M"`, `"moyen"`, …) doivent exister dans `menu.json`.
