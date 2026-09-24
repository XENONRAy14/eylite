# Eylite — pilote fonctionnel

Application privée de gestion d'établissement, en français, construite à partir du cahier des charges Eylite v2 de septembre 2026.

## Démarrer

- Ouvrir l'application avec son compte ChatGPT.
- Charger les données fictives depuis l'écran d'accueil, ou commencer par créer les groupes puis les enseignants et élèves.
- `/demo` permet une visite en lecture seule avec des données fictives.
- Les modifications de l'espace principal sont sauvegardées dans D1, jamais dans localStorage.

## Fonctionnalités livrées

- Tableau de bord calculé à partir des dossiers, filtres de campus.
- Dossiers élèves, responsables et téléphone, statut actif/préinscrit/archivé.
- Groupes, programmes, capacité et enseignants.
- Séances datées, validation des horaires et conflits salle/professeur/groupe.
- Présences par élève et séance, six statuts, historique de modification.
- Évaluations, barème, coefficient, source explicite ; moyenne interne pondérée par élève.
- Cahier de textes, consignes, date limite.
- Suivi CNED par élève et matière, huit statuts, formule, échéance, correction /20. Pas d'accès aux comptes CNED.
- Échéances, règlements manuels DZD, solde, impayés, reçus imprimables en PDF depuis le navigateur.
- Pipeline admissions, annonces internes, activation de modules, export CSV.
- Journal des écritures, validations côté serveur, contrôle de version pour éviter les écrasements, protection de l'origine des requêtes.

## Architecture et limites

Cette version est un **pilote privé**, pas la totalité de la version commerciale décrite dans le cahier des charges.

Le choix d'exécution est React/TypeScript avec Vinext (API Next.js) et Cloudflare Workers/D1. La recommandation NestJS/PostgreSQL/Redis du document n'a pas été implémentée. Chaque compte est rattaché à une organisation ; les tables `organizations`, `memberships`, `campuses`, `school_years` et `invitations` fournissent la base relationnelle du partage, des campus et des rôles (`owner`, `admin`, `staff`, `viewer`). Les portails famille/enseignant dédiés restent à développer.

Les données métier restent temporairement des enregistrements JSON validés par type dans une table tenant-scoped, plus un journal append-only. La migration est progressive : élèves, séances et devoirs référencent désormais les groupes par identifiant immuable ; les séances référencent les enseignants par identifiant. Les anciennes valeurs par nom sont converties automatiquement lors de l'accès. Les paiements utilisent un contrôle atomique du solde en SQL ; les écritures API passent par des batches transactionnels. La pagination, le filtre par type, campus et recherche sont disponibles côté API. La détection de conflit de planning reste applicative et devra devenir une contrainte transactionnelle complète dans la phase de normalisation finale.

Les campus et années scolaires ont maintenant un référentiel relationnel, tout en restant affichés depuis les données existantes pour préserver la compatibilité. Les capacités des groupes sont indicatives. Les groupes ne sont pas encore des adhésions multiples. Une séance n'est pas récurrente ; les enseignants n'ont pas de moteur de disponibilités.

Les annonces sont des enregistrements internes : aucun SMS, email ou WhatsApp n'est envoyé. Les moyens de paiement sont des libellés pour des règlements saisis manuellement : aucune transaction bancaire réelle. Pas d'IA connectée.

Restent notamment à implémenter avant commercialisation : normalisation complète des tables métier, portails, import XLSX, pièces jointes/R2, bulletins structurés, remboursements, caisse, consentements et rétention, arabe/RTL, PWA hors ligne, QR/NFC, restauration supervisée à partir de l'export `GET /api/v1/data?backup=1`, monitoring externe et audit juridique/hébergement. Le pilote ne prétend pas assurer la conformité juridique ou les objectifs de disponibilité du document.

## Validation

`pnpm test` exécute 41 vérifications des handlers API et 10 vérifications du modèle : authentification, organisations, RBAC, invitations, isolation, pagination/filtres, migration des références, données fictives, paiements, concurrence optimiste, conflit planning, barèmes, appel, audit, sauvegarde et CSRF.

`pnpm typecheck` vérifie les types et `pnpm verify` exécute toute la chaîne de validation.

Les migrations Drizzle sont dans `drizzle/`. Ne pas modifier une migration déjà appliquée. Les ressources et l'accès authentifié sont fournis par Sites.

L'interface a été inspectée dans le navigateur en visite lecture seule. L'authentification de l'environnement d'aperçu ne permet pas de vérifier les écritures par navigateur ; les handlers ont été testés séparément. WebMCP est enregistré conditionnellement pour la navigation ; sa validation d'exécution était indisponible dans le navigateur d'aperçu.
