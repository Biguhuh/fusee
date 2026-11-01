---
description: Fin de session — met à jour ETAT.md d'après le travail de la session et le code actuel
---

Fin de session : mets à jour `ETAT.md` à la racine du projet.

1. Relis `ETAT.md` en entier.
2. Regarde ce qui a changé : ce qu'on a fait pendant cette session, `git status`, `git log --oneline -20`, et la branche en cours (fusionnée dans `main` ou non).
3. Mets à jour chaque section, sans en ajouter ni en retirer :
   - « Dernière mise à jour » : la date du jour.
   - « En une phrase » : où en est le projet.
   - « Fait » : ajoute ce qui a été terminé pendant la session (une ligne par point).
   - « En cours » : ce qui est commencé mais pas fini, avec le fichier concerné et la branche si elle n'est pas fusionnée. « Rien. » sinon.
   - « À faire, dans l'ordre » : retire ce qui est fait, ajoute ce qui a été demandé ou décidé.
   - « Bugs connus de la bêta » : ajoute ceux trouvés, retire ceux corrigés. Format : bug : fichier probable : piste.
   - « Décisions prises » : celles de la session, avec le pourquoi en une ligne.
   - « Pièges » : ce qui a fait perdre du temps, à ne pas refaire.
   - « Carte des fichiers importants » : ajoute les nouveaux fichiers, corrige les rôles qui ont changé.
4. Reste court : une ligne par point, pas de détail d'implémentation qui se lit dans le code.
5. Si `CLAUDE.md` n'est plus à jour (commande, convention, structure), corrige-le aussi.
6. Commit sur la branche en cours (`ETAT.md : fin de session du …`), puis push. Ne fusionne pas dans `main` sans qu'Edouard le demande.
7. Termine par un résumé en trois lignes : fait, en cours, prochaine étape.
