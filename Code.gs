/**
 * =================================================================================
 * CONFIGURATION CENTRALE
 * =================================================================================
 */
const CONFIG = {
  SHEETS: {
    LOGS: 'Historique_Actions',
    BLOG: 'Blog',
    COMMENTS: 'Blog_Commentaires',
    EVENTS: 'Evenements',
    PRAYER: 'Demandes_Priere',
    CONTACT: 'Contact_Submissions',
    NEEDS: 'Besoins',
    PARTICIPATIONS: 'Participations'
  },
  ALLOWED_ORIGINS: [
    'https://eed.abmcy.com',
    'https://eed1.abmcy.com',
    'http://127.0.0.1:5500' // Pour les tests en local
  ]
};

/**
 * =================================================================================
 * GESTIONNAIRES DE REQUÊTES (doGet, doPost, doOptions)
 * =================================================================================
 */

/**
 * Gère les requêtes GET.
 * Renvoie un message simple pour indiquer que l'API est en ligne.
 * @param {Object} e - L'objet événement de la requête.
 * @returns {ContentService.TextOutput} Une réponse JSON.
 */
function doGet(e) {
  // Renvoie une réponse simple pour les tests de connectivité.
  return ContentService
    .createTextOutput(JSON.stringify({ status: "success", message: "API en ligne." }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Gère les requêtes HTTP POST. C'est le point d'entrée principal pour toutes les actions.
 * Il agit comme un routeur qui appelle la bonne fonction en fonction du paramètre 'action'.
 * @param {Object} e - L'objet événement de la requête.
 * @returns {ContentService.TextOutput} Une réponse JSON formatée avec les en-têtes CORS.
 */
function doPost(e) {
  try {
    let data;
    // Gère les requêtes envoyées avec Content-Type 'text/plain' ou 'application/json'
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      // Gère les requêtes envoyées en 'application/x-www-form-urlencoded' (ancienne méthode)
      data = e.parameter;
    }
    const action = data.action;
    const payload = data.payload || data; // Le payload peut être à la racine ou dans une clé 'payload'
    let result;

    // Initialisation de la feuille de calcul pour les fonctions qui en ont besoin
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Aiguillage (switch) pour appeler la fonction correspondante à l'action demandée.
    switch (action) {
      // Actions liées au contenu (Blog, Événements, Besoins)
      case 'getBlogPosts': result = getBlogPosts(); break;
      case 'getBlogPostById': result = getBlogPostById(payload.id); break;
      case 'getEvents': result = getEvents(); break; // Conserve getEvents pour la page événements
      case 'getUpcomingEvents': result = getUpcomingEvents(); break; // Nouvelle action pour les 3 prochains événements
      case 'getNeeds': result = getNeeds(); break;
      case 'getNeedById': result = getNeedById(payload.id); break;

      // Actions interactives (Commentaires, Participations, Formulaires)
      case 'getComments': result = getComments(payload.articleId); break;
      case 'postComment': result = postComment(payload); break;
      case 'participateToNeed': result = participateToNeed(payload, ss); break;
      case 'handlePrayerRequest': result = handlePrayerRequest(payload); break;
      case 'handleContactForm': result = handleContactForm(payload); break;

      // Cas par défaut si l'action n'est pas reconnue.
      default:
        result = { success: false, error: 'Action POST non reconnue.' };
        break;
    }

    // Enregistre l'action réussie dans l'historique.
    logAction('Back-End', action, 'SUCCESS', `Action POST '${action}' exécutée avec succès.`);
    // Renvoie le résultat au client, formaté en JSON avec les en-têtes CORS. (e.parameter.origin n'est pas standard pour POST)
    return corsify(result, e);

  } catch (err) {
    // En cas d'erreur globale, on l'enregistre et on renvoie une réponse d'erreur générique.
    const actionName = (e && e.parameter && e.parameter.action) || (e && e.postData && e.postData.contents && JSON.parse(e.postData.contents).action) || 'unknown';
    const errorMessage = `Erreur dans l'action POST '${actionName}': ${err.message}`;
    logAction('Back-End', actionName, 'ERROR', errorMessage, 'anonyme', 'Vérifiez les données envoyées et la structure des feuilles Google Sheets.');
    return corsify({ error: "Une erreur interne est survenue. L'incident a été enregistré." });
  }
}

/**
 * Gère les requêtes "preflight" CORS envoyées par les navigateurs.
 */
function doOptions(e) {
  // Construit et renvoie une réponse vide avec les en-têtes CORS nécessaires.
  // La méthode correcte est de retourner un objet TextOutput avec les headers.
  // Google Apps Script ne fournit pas de méthode setHeaders ou addHeader.
  // La plateforme gère les en-têtes CORS pour les Web Apps.
  // Cette fonction est un placeholder pour la gestion de preflight.
  return ContentService.createTextOutput();
}

/**
 * =================================================================================
 * FONCTION UTILITAIRE CORS
 * =================================================================================
 */

/**
 * Ajoute les en-têtes CORS nécessaires à une réponse.
 * @param {Object|null} data - L'objet de données à renvoyer.
 * @param {Object} e - L'objet événement de la requête pour récupérer l'origine.
 * @param {boolean} [isOptions=false] - S'il s'agit d'une requête OPTIONS.
 * @returns {ContentService.TextOutput} La réponse formatée.
 */
function corsify(data, e, isOptions = false) {
  // Pour une Web App, Google Apps Script gère les en-têtes CORS.
  // Il suffit de retourner un objet TextOutput avec le bon type MIME.
  return ContentService
    .createTextOutput(JSON.stringify(data || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * =================================================================================
 * FONCTIONS UTILITAIRES POUR GOOGLE SHEETS
 * =================================================================================
 */

/**
 * Convertit les données d'une feuille de calcul en un tableau d'objets.
 * @param {Sheet} sheet - L'objet feuille de calcul.
 * @returns {Array<Object>} Un tableau d'objets représentant les lignes.
 */
function sheetToObjects(sheet) {
  if (!sheet || sheet.getLastRow() < 1) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data.shift().map(h => String(h || '').trim());
  if (!headers || headers.length === 0) return [];

  return data.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * =================================================================================
 * LOGIQUE DE L'APPLICATION
 * =================================================================================
 */

/**
 * Se déclenche à l'ouverture de la feuille de calcul.
 * Ajoute un menu personnalisé "Admin" à l'interface de Google Sheets
 * pour un accès facile aux fonctions d'administration.
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Admin Église')
      .addItem('1. Vérifier/Réparer la Structure', 'verifyAndFixSheetStructure') // Pour réparer les feuilles existantes
      .addItem('2. Initialiser les feuilles (si vides)', 'setupSpreadsheet') // Pour une première installation
      .addItem('3. Remplir avec données de test', 'initializeWithSeedData') // Pour le développement
      .addToUi();
}

const seedData = {
  blog: [
    ['1', 'La Joie de Servir', 'Pasteur Jean', new Date('2024-05-28'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Découvrez le bonheur profond et la satisfaction que procure le service désintéressé au sein de notre communauté et pour l\'œuvre de Dieu. Cet article explore les bénédictions cachées du don de soi.', 'Réflexions', 'Publié'],
    ['2', 'L\'Importance de la Prière Quotidienne', 'Soeur Marie', new Date('2024-05-25'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Un guide pratique pour développer une vie de prière plus riche et plus constante. Apprenez à faire de la prière une conversation quotidienne avec Dieu, une source de force et de paix.', 'Enseignements', 'Publié'],
    ['3', 'La Foi en Action : Témoignage de Frère David', 'Frère David', new Date('2024-05-20'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Lisez le témoignage touchant de Frère David, qui partage comment sa foi a été mise à l\'épreuve et renforcée à travers les défis de la vie. Une histoire d\'espérance et de persévérance.', 'Témoignages', 'Publié'],
    ['4', 'Comprendre la Grâce : Un Don Immérité', 'Équipe Pastorale', new Date('2024-05-15'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Qu\'est-ce que la grâce ? Cet enseignement approfondi explore la nature du don gratuit de Dieu, son impact sur notre salut et notre vie de tous les jours. Un concept fondamental de notre foi.', 'Enseignements', 'Publié'],
    ['5', 'La Communauté : Notre Ancre dans la Tempête', 'Pasteur Moussa', new Date('2024-05-10'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Dans les moments difficiles, la communauté de l\'église est un refuge. Cet article met en lumière l\'importance des liens fraternels, du soutien mutuel et de l\'amour partagé.', 'Vie d\'Église', 'Publié'],
    ['6', 'Vivre le Pardon au Quotidien', 'Soeur Hélène', new Date('2024-05-05'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Le pardon est un chemin de libération. Découvrez des clés pratiques pour pardonner aux autres comme nous avons été pardonnés, et pour vivre libéré du poids du ressentiment.', 'Spiritualité', 'Publié'],
    ['7', 'Annonce : Prochaine Retraite des Jeunes', 'Comité des Jeunes', new Date('2024-06-01'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Ne manquez pas notre retraite annuelle pour les jeunes ! Un week-end de partage, de louange et d\'activités pour grandir ensemble dans la foi. Inscriptions ouvertes !', 'Annonces', 'Publié'],
    ['8', 'Étude Biblique : Les Paraboles de Jésus', 'Dr. Alain Dubois', new Date('2024-04-28'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Plongez au cœur des enseignements de Jésus à travers ses paraboles. Cette étude révèle les trésors de sagesse cachés dans ces histoires intemporelles.', 'Études Bibliques', 'Publié']
  ],
  blog_comments: [
    ['1', 'Visiteur Anonyme', 'Merci pour cet article édifiant !', new Date(), 'Approuvé'],
    ['2', 'Lecteur Fidèle', 'Amen ! La prière est vraiment notre force.', new Date(), 'Approuvé'],
    ['1', 'Sophie B.', 'Très inspirant, cela me motive à m\'engager davantage.', new Date(), 'Approuvé'],
    ['3', 'Marc T.', 'Quel témoignage puissant ! Merci pour ce partage.', new Date(), 'Approuvé'],
    ['5', 'Anonyme', 'J\'ai vraiment ressenti le soutien de la communauté récemment. Cet article est si vrai.', new Date(), 'Approuvé'],
    ['2', 'Jeanne D.', 'De très bons conseils pratiques, je vais les appliquer dès aujourd\'hui.', new Date(), 'Approuvé']
  ],
  events: [
    ['evt01', 'Conférence sur la Famille Chrétienne', new Date('2024-06-15'), '10:00', 'Salle des Fêtes', 'Une journée pour renforcer les liens familiaux et découvrir des outils bibliques pour une vie de famille harmonieuse.', 'https://i.postimg.cc/nc96NVts/LOGO.png', 'https://example.com/conference'],
    ['evt02', 'Soirée d\'Adoration et de Louange', new Date('2024-06-22'), '19:00', 'Sanctuaire Principal', 'Un moment de louange et d\'adoration intense pour se connecter profondément avec Dieu.', 'https://i.postimg.cc/nc96NVts/LOGO.png', ''],
    ['evt03', 'Retraite Spirituelle "Source de Vie"', new Date('2024-07-05'), '09:00', 'Centre de Retraite "Le Repos"', 'Un week-end complet pour se ressourcer spirituellement, loin du tumulte quotidien. Places limitées.', 'https://i.postimg.cc/nc96NVts/LOGO.png', 'https://example.com/retraite'],
    ['evt04', 'Atelier sur l\'Évangélisation', new Date('2024-06-29'), '14:00', 'Salle Annexe', 'Apprenez des méthodes pratiques et bienveillantes pour partager votre foi avec assurance et amour.', 'https://i.postimg.cc/nc96NVts/LOGO.png', ''],
    ['evt05', 'Concert de Gospel', new Date('2024-05-18'), '20:00', 'Grand Temple', 'Un événement passé pour tester l\'archivage. La chorale "Voix Célestes" a animé la soirée.', 'https://i.postimg.cc/nc96NVts/LOGO.png', ''],
    ['evt06', 'Journée Portes Ouvertes', new Date('2024-07-13'), '10:00', 'Toute l\'Église', 'Invitez vos amis et votre famille à découvrir notre communauté, nos activités et nos ministères.', 'https://i.postimg.cc/nc96NVts/LOGO.png', '']
  ],
  prayer_requests: [
    [new Date(), 'Anonyme', 'anonyme@email.com', 'Sénégal', 'Sénégalaise', '', 'Je demande la prière pour la guérison de ma mère.', 'Oui'],
    [new Date(), 'Fatou K.', 'fatou@email.com', 'France', 'Française', '0612345678', 'Prière pour trouver un emploi et pour la paix dans ma famille.', 'Non'],
    [new Date(), 'Moussa', '', 'Mali', 'Malienne', '', 'Que Dieu protège mon voyage et bénisse mon projet.', 'Non']
  ],
  contact_submissions: [
    [new Date(), 'Jean Dupont', 'jean.dupont@email.com', 'Question sur les horaires', 'Bonjour, pourriez-vous me donner les horaires des cultes du dimanche ? Merci.'],
    [new Date(), 'Aïssatou Diallo', 'a.diallo@email.com', 'Demande d\'information', 'J\'aimerais savoir comment rejoindre un groupe de maison. Merci d\'avance.'],
    [new Date(), 'Paul Martin', 'paul.m@email.com', 'Bénévolat', 'Je suis nouveau dans la communauté et je souhaiterais savoir où je peux servir en tant que bénévole.']
  ],
  needs: [
    ['need01', 'Rénovation du Toit de l\'Église', 'Aidez-nous à réparer le toit de notre lieu de culte.', 'Le toit actuel fuit et cause des dommages importants au bâtiment, menaçant nos activités...', 'Nous organisons une collecte de fonds et recherchons des bénévoles pour les travaux.', 'https://i.postimg.cc/nc96NVts/LOGO.png', 10000000, 3500000, 'Construction', 'Actif'],
    ['need02', 'Fournitures Scolaires pour la Rentrée', 'Offrons une bonne rentrée à 100 enfants défavorisés.', 'De nombreuses familles de notre quartier n\'ont pas les moyens d\'acheter les fournitures nécessaires pour leurs enfants...', 'Nous collectons des dons financiers et matériels (cahiers, stylos, etc.).', 'https://i.postimg.cc/nc96NVts/LOGO.png', 5000000, 2000000, 'Social', 'Actif'],
    ['need03', 'Soutien à la Famille Ndiaye', 'Aidons une famille de notre communauté après un incendie.', 'La famille Ndiaye a tout perdu dans l\'incendie de leur maison. Ils ont besoin de notre soutien pour se reconstruire.', 'Une collecte spéciale est organisée pour les aider à trouver un nouveau logement et des biens de première nécessité.', 'https://i.postimg.cc/nc96NVts/LOGO.png', 2500000, 2650000, 'Urgence', 'Terminé'],
    ['need04', 'Nouveau Système de Sonorisation', 'Améliorons la qualité sonore de nos cultes.', 'Notre système de sonorisation actuel est vieillissant et ne permet pas une diffusion claire de la Parole et de la louange.', 'Nous souhaitons investir dans un équipement moderne et plus performant.', 'https://i.postimg.cc/nc96NVts/LOGO.png', 7500000, 1200000, 'Équipement', 'Actif']
  ],
  participations: [
    ['need01', 'Donateur Généreux', 'donateur@email.com', 50000, new Date()],
    ['need02', 'Marie S.', 'marie.s@email.com', 25000, new Date()],
    ['need01', 'Anonyme', '', 100000, new Date()],
    ['need03', 'Collecte du Dimanche', '', 1500000, new Date()],
    ['need04', 'Frère Jacques', 'j.m@email.com', 75000, new Date()]
  ]
};

/**
 * Remplit les feuilles 'Blog', 'Evenements' et 'Besoins' avec des données d'exemple.
 * Utile pour tester l'application sans avoir à entrer des données manuellement.
 */
function initializeWithSeedData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const response = ui.alert('Confirmation', 'Cette action va effacer les données actuelles des feuilles Blog, Evenements et Besoins, et les remplacer par des données de test. Voulez-vous continuer ?', ui.ButtonSet.YES_NO);

  if (response == ui.Button.YES) {
    try {
      // Association entre les clés de seedData et les noms des feuilles
      const sheetMapping = {
        blog: CONFIG.SHEETS.BLOG,
        blog_comments: CONFIG.SHEETS.COMMENTS,
        events: CONFIG.SHEETS.EVENTS,
        prayer_requests: CONFIG.SHEETS.PRAYER,
        contact_submissions: CONFIG.SHEETS.CONTACT,
        needs: CONFIG.SHEETS.NEEDS,
        participations: CONFIG.SHEETS.PARTICIPATIONS
      };

      // Boucle sur chaque jeu de données pour remplir la feuille correspondante
      for (const key in sheetMapping) {
        const sheetName = sheetMapping[key];
        const data = seedData[key];
        const sheet = ss.getSheetByName(sheetName);

        if (sheet && data && data.length > 0) {
          // Vider la feuille (sauf la ligne d'en-tête)
          if (sheet.getLastRow() > 1) {
            sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
          }
          // Insérer les nouvelles données
          sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
          Logger.log(`Feuille "${sheetName}" remplie avec des données de test.`);
        }
      }
      ui.alert('Initialisation terminée', 'Les données de test ont été ajoutées avec succès.', ui.ButtonSet.OK);
    } catch (e) {
      Logger.log(`Erreur lors de l'initialisation des données: ${e.message}`);
      ui.alert('Erreur', `Une erreur est survenue: ${e.message}`, ui.ButtonSet.OK);
    }
  }
}

/**
 * Crée les feuilles de calcul nécessaires avec leurs en-têtes si elles n'existent pas.
 * C'est la fonction qui initialise la structure de données.
 */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Définition de la structure de chaque feuille de calcul nécessaire à l'application.
  const sheetsToCreate = [    
    { name: CONFIG.SHEETS.LOGS, headers: ['Timestamp', 'Origine', 'Action', 'Statut', 'Message', 'Email', 'Suggestion'] },
    { name: CONFIG.SHEETS.BLOG, headers: ['ID', 'Titre', 'Auteur', 'Date', 'ImageURL', 'Contenu', 'Categorie', 'Statut'] },
    { name: CONFIG.SHEETS.COMMENTS, headers: ['ID_Article', 'Auteur', 'Commentaire', 'Timestamp', 'Statut'] },
    { name: CONFIG.SHEETS.EVENTS, headers: ['ID', 'Titre', 'Date', 'Heure', 'Lieu', 'Description', 'ImageURL', 'LienInscription'] },
    { name: CONFIG.SHEETS.PRAYER, headers: ['Timestamp', 'Nom', 'Email', 'Pays', 'Nationalite', 'Telephone', 'Demande', 'Confidentialite'] },
    { name: CONFIG.SHEETS.CONTACT, headers: ['Timestamp', 'Nom', 'Email', 'Sujet', 'Message'] },
    { name: CONFIG.SHEETS.NEEDS, headers: ['ID', 'Titre', 'DescriptionCourte', 'Raison', 'Moyens', 'ImageURL', 'MontantObjectif', 'MontantActuel', 'Categorie', 'Statut'] },
    { name: CONFIG.SHEETS.PARTICIPATIONS, headers: ['ID_Besoin', 'Nom', 'Email', 'Montant', 'Date'] },
  ];

  sheetsToCreate.forEach(sheetInfo => {
    let sheet = ss.getSheetByName(sheetInfo.name);
    if (!sheet) {
      sheet = ss.insertSheet(sheetInfo.name);
      sheet.getRange(1, 1, 1, sheetInfo.headers.length).setValues([sheetInfo.headers]).setFontWeight('bold');
      SpreadsheetApp.flush(); // Applique les changements
      Logger.log(`Feuille "${sheetInfo.name}" créée.`);
    } else {
      Logger.log(`La feuille "${sheetInfo.name}" existe déjà.`);
    }
  });
  
  SpreadsheetApp.getUi().alert('Initialisation terminée ! Les feuilles de calcul sont prêtes.');
}

/**
 * Vérifie que toutes les feuilles et colonnes nécessaires existent, et les crée si elles sont manquantes.
 * C'est une fonction de "migration" ou de "réparation" de la base de données.
 */
function verifyAndFixSheetStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  let corrections = [];

  // Liste des feuilles et de leurs colonnes requises.
  const requiredSheets = [    
    { name: CONFIG.SHEETS.LOGS, headers: ['Timestamp', 'Origine', 'Action', 'Statut', 'Message', 'Email', 'Suggestion'] },
    { name: CONFIG.SHEETS.BLOG, headers: ['ID', 'Titre', 'Auteur', 'Date', 'ImageURL', 'Contenu', 'Categorie', 'Statut'] },
    { name: CONFIG.SHEETS.COMMENTS, headers: ['ID_Article', 'Auteur', 'Commentaire', 'Timestamp', 'Statut'] },
    { name: CONFIG.SHEETS.EVENTS, headers: ['ID', 'Titre', 'Date', 'Heure', 'Lieu', 'Description', 'ImageURL', 'LienInscription'] },
    { name: CONFIG.SHEETS.PRAYER, headers: ['Timestamp', 'Nom', 'Email', 'Pays', 'Nationalite', 'Telephone', 'Demande', 'Confidentialite'] },
    { name: CONFIG.SHEETS.CONTACT, headers: ['Timestamp', 'Nom', 'Email', 'Sujet', 'Message'] },
    { name: CONFIG.SHEETS.NEEDS, headers: ['ID', 'Titre', 'DescriptionCourte', 'Raison', 'Moyens', 'ImageURL', 'MontantObjectif', 'MontantActuel', 'Categorie', 'Statut'] },
    { name: CONFIG.SHEETS.PARTICIPATIONS, headers: ['ID_Besoin', 'Nom', 'Email', 'Montant', 'Date'] },
  ];

  requiredSheets.forEach(sheetInfo => {
    let sheet = ss.getSheetByName(sheetInfo.name);
    if (!sheet) {
      // La feuille n'existe pas, on la crée complètement.
      sheet = ss.insertSheet(sheetInfo.name);
      sheet.getRange(1, 1, 1, sheetInfo.headers.length).setValues([sheetInfo.headers]).setFontWeight('bold');
      corrections.push(`Feuille "${sheetInfo.name}" créée.`);
    } else {
      // La feuille existe, on vérifie les colonnes.
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      sheetInfo.headers.forEach(requiredHeader => {
        if (!currentHeaders.includes(requiredHeader)) {
          // La colonne est manquante, on l'ajoute à la fin.
          sheet.getRange(1, sheet.getLastColumn() + 1).setValue(requiredHeader).setFontWeight('bold');
          corrections.push(`Colonne "${requiredHeader}" ajoutée à la feuille "${sheetInfo.name}".`);
        }
      });
    }
  });

  if (corrections.length > 0) {
    ui.alert('Vérification terminée', 'Les corrections suivantes ont été apportées :\n- ' + corrections.join('\n- '), ui.ButtonSet.OK);
  } else {
    ui.alert('Vérification terminée', 'Aucune correction nécessaire. Votre structure est à jour.', ui.ButtonSet.OK);
  }
}

/**
 * Enregistre une action ou une erreur dans la feuille 'Historique_Actions'.
 * @param {string} origin - 'Front-End' ou 'Back-End'.
 * @param {string} action - Le nom de l'action effectuée (ex: 'saveProfile').
 * @param {string} status - 'SUCCESS' ou 'ERROR'.
 * @param {string} message - Le message détaillé de l'événement.
 * @param {string} [userEmail='anonyme'] - L'email de l'utilisateur effectuant l'action.
 * @param {string} [suggestion=''] - Une suggestion de correction en cas d'erreur.
 */
function logAction(origin, action, status, message, email = 'anonyme', suggestion = '') {
  try {
    const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.LOGS);
    if (logSheet) {
      logSheet.appendRow([new Date(), origin, action, status, message, email, suggestion]);
    }
  } catch (e) {
    Logger.log(`Impossible d'écrire dans la feuille d'historique: ${e.message}`);
  }
}

/**
 * =================================================================================
 * NOUVELLES FONCTIONS POUR LE CONTENU DYNAMIQUE
 * =================================================================================
 */

/**
 * Récupère tous les articles de blog publiés depuis la feuille 'Blog'.
 * @returns {Object} Un objet contenant les articles ou une erreur.
 */
function getBlogPosts() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.BLOG);
    if (!sheet) throw new Error(`La feuille '${CONFIG.SHEETS.BLOG}' est introuvable.`);
    
    const posts = sheetToObjects(sheet)
      .filter(post => post.Statut === 'Publié'); // On ne récupère que les articles publiés

    posts.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return { success: true, posts: posts };
  } catch (e) {
    logAction('Back-End', 'getBlogPosts', 'ERROR', e.message, 'API', "Vérifiez que la feuille 'Blog' existe et que sa structure est correcte.");
    return { success: false, error: "Impossible de récupérer les articles." };
  }
}

function getBlogPostById(id) {
  try {
    if (!id) throw new Error("Aucun ID d'article fourni.");
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.BLOG);
    if (!sheet) throw new Error(`La feuille '${CONFIG.SHEETS.BLOG}' est introuvable.`);
    
    const posts = sheetToObjects(sheet);
    const post = posts.find(p => String(p.ID) === String(id));

    if (!post) {
      return { success: false, error: "Article non trouvé." };
    }

    return { success: true, post: post };
  } catch (e) {
    logAction('Back-End', 'getBlogPostById', 'ERROR', e.message, 'API', "Vérifiez l'ID fourni et la structure de la feuille 'Blog'.");
    return { success: false, error: "Impossible de récupérer l'article." };
  }
}

/**
 * Récupère tous les événements à venir depuis la feuille 'Evenements'.
 * @returns {Object} Un objet contenant les événements ou une erreur.
 */
function getEvents() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.EVENTS);
    if (!sheet) throw new Error(`La feuille '${CONFIG.SHEETS.EVENTS}' est introuvable.`);

    const events = sheetToObjects(sheet)
      .filter(event => new Date(event.Date) >= new Date()); // Uniquement les événements futurs

    return { success: true, events: events };
  } catch (e) {
    logAction('Back-End', 'getEvents', 'ERROR', e.message, 'API', "Vérifiez que la feuille 'Evenements' existe.");
    return { success: false, error: "Impossible de récupérer les événements." };
  }
}

/**
 * Récupère les 3 prochains événements à venir depuis la feuille 'Evenements'.
 * @returns {Object} Un objet contenant les 3 prochains événements ou une erreur.
 */
function getUpcomingEvents() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.EVENTS);
    if (!sheet) throw new Error(`La feuille '${CONFIG.SHEETS.EVENTS}' est introuvable.`);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Pour inclure les événements du jour même.

    const events = sheetToObjects(sheet)
      .filter(event => new Date(event.Date) >= today) // Filtre pour les événements futurs ou d'aujourd'hui.
      .sort((a, b) => new Date(a.Date) - new Date(b.Date)) // Trie par date, du plus proche au plus lointain.
      .slice(0, 3); // Ne garde que les 3 premiers.

    return { success: true, events: events };
  } catch (e) {
    logAction('Back-End', 'getUpcomingEvents', 'ERROR', e.message, 'API', "Vérifiez que la feuille 'Evenements' existe.");
    return { success: false, error: "Impossible de récupérer les prochains événements." };
  }
}

/**
 * Gère la soumission d'une demande de prière depuis le site.
 * @param {Object} payload - Les données du formulaire (name, email, request, isConfidential).
 * @returns {Object} Un objet indiquant le succès ou l'échec.
 */
function handlePrayerRequest(payload) {
  try {
    if (!payload || !payload.request) throw new Error("Le contenu de la demande (payload.request) est manquant.");
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.PRAYER);
    if (!sheet) throw new Error(`La feuille '${CONFIG.SHEETS.PRAYER}' est introuvable.`);

    const name = payload.name || 'Anonyme';
    const email = payload.email || 'Non fourni';
    const country = payload.country || '';
    const nationality = payload.nationality || '';
    const phone = payload.phone || '';
    const isConfidential = payload.isConfidential ? 'Oui' : 'Non';

    sheet.appendRow([new Date(), name, email, country, nationality, phone, payload.request, isConfidential]);
    return { success: true, message: 'Votre demande de prière a bien été envoyée.' };
  } catch (e) {
    const userEmail = (payload && payload.email) || 'anonyme';
    logAction('Front-End', 'handlePrayerRequest', 'ERROR', e.message, userEmail, "Vérifiez les données envoyées par le formulaire et l'existence de la feuille 'Demandes_Priere'.");
    return { success: false, error: "Impossible d'enregistrer la demande de prière." };
  }
}

/**
 * Récupère tous les besoins actifs depuis la feuille 'Besoins'.
 * @returns {Object} Un objet contenant les besoins ou une erreur.
 */
function getNeeds() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.NEEDS);
    if (!sheet) throw new Error(`La feuille '${CONFIG.SHEETS.NEEDS}' est introuvable.`);
    
    const needs = sheetToObjects(sheet)
      .filter(need => need.Statut === 'Actif');

    return { success: true, needs: needs };
  } catch (e) {
    logAction('Back-End', 'getNeeds', 'ERROR', e.message, 'API', "Vérifiez l'existence de la feuille 'Besoins'.");
    return { success: false, error: "Impossible de récupérer les besoins." };
  }
}

/**
 * Récupère un besoin spécifique par son ID.
 * @param {string} id - L'ID du besoin à récupérer.
 * @returns {Object} Un objet contenant le besoin ou une erreur.
 */
function getNeedById(id) {
  try {
    if (!id) throw new Error("Aucun ID de besoin fourni.");
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.NEEDS);
    if (!sheet) throw new Error(`La feuille '${CONFIG.SHEETS.NEEDS}' est introuvable.`);
    
    const needs = sheetToObjects(sheet);
    const need = needs.find(n => String(n.ID) === String(id));

    if (!need) {
      return { success: false, error: "Besoin non trouvé." };
    }

    return { success: true, need: need };
  } catch (e) {
    logAction('Back-End', 'getNeedById', 'ERROR', e.message, 'API', "Vérifiez l'ID fourni et l'existence de la feuille 'Besoins'.");
    return { success: false, error: "Impossible de récupérer le besoin." };
  }
}

/**
 * Enregistre une participation à une collecte.
 * @param {Object} payload - Les données de la participation (needId, name, email, amount).
 * @param {Spreadsheet} ss - L'objet Spreadsheet global.
 * @returns {Object} Un objet indiquant le succès ou l'échec.
 */
function participateToNeed(payload, ss) {
  try {
    if (!payload || !payload.needId || !payload.name || !payload.amount) {
      throw new Error("Données de participation incomplètes.");
    }

    const participationsSheet = ss.getSheetByName(CONFIG.SHEETS.PARTICIPATIONS) || ss.insertSheet(CONFIG.SHEETS.PARTICIPATIONS);
    participationsSheet.appendRow([payload.needId, payload.name, payload.email || 'Non fourni', payload.amount, new Date()]);

    // Met à jour le montant actuel dans la feuille "Besoins".
    const needsSheet = ss.getSheetByName(CONFIG.SHEETS.NEEDS);
    if (!needsSheet) throw new Error(`La feuille '${CONFIG.SHEETS.NEEDS}' est introuvable pour la mise à jour.`);

    const needsData = needsSheet.getDataRange().getValues();
    const headers = needsData[0];
    const idIndex = headers.indexOf("ID");
    const amountIndex = headers.indexOf("MontantActuel");

    for (let i = 1; i < needsData.length; i++) {
      if (needsData[i][idIndex] == payload.needId) {
        let currentAmount = parseFloat(needsData[i][amountIndex]) || 0;
        let newAmount = currentAmount + parseFloat(payload.amount);
        needsSheet.getRange(i + 1, amountIndex + 1).setValue(newAmount);
        break;
      }
    }

    return { success: true, message: "Participation enregistrée." };
  } catch (err) {
    const userEmail = (payload && payload.email) || 'anonyme';
    logAction('Front-End', 'participateToNeed', 'ERROR', err.message, userEmail, "Vérifiez les données du formulaire et l'existence des feuilles 'Participations' et 'Besoins'.");
    return { success: false, error: "Impossible d'enregistrer la participation." };
  }
}

/**
 * Récupère les commentaires approuvés pour un article de blog.
 * @param {string} articleId - L'ID de l'article de blog.
 * @returns {Object} Un objet contenant les commentaires.
 */
function getComments(articleId) {
  try {
    if (!articleId) {
      throw new Error("L'identifiant de l'article (articleId) est manquant.");
    }
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Blog_Commentaires');
    if (!sheet) throw new Error("La feuille 'Blog_Commentaires' est introuvable.");

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    if (!headers || headers.length === 0) return { success: true, comments: [] };
    const idIndex = headers.indexOf('ID_Article');
    const authorIndex = headers.indexOf('Auteur');
    const textIndex = headers.indexOf('Commentaire');
    const timestampIndex = headers.indexOf('Timestamp');
    const statusIndex = headers.indexOf('Statut');

    const comments = data
      .filter(row => String(row[idIndex]) === String(articleId) && row[statusIndex] === 'Approuvé') // Filtre par ID et statut
      .map(row => ({
        author: row[authorIndex],
        text: row[textIndex],
        timestamp: row[timestampIndex]
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Trie du plus récent au plus ancien

    return { success: true, comments: comments };

  } catch (e) {
    logAction('getComments', 'ERROR', e.message, 'API');
    return { success: false, error: e.message };
  }
}

/**
 * Enregistre un nouveau commentaire pour un article de blog.
 * @param {Object} payload - Les données du commentaire (articleId, author, commentText).
 * @returns {Object} Un objet indiquant le succès ou l'échec.
 */
function postComment(payload) {
  try {
    if (!payload || !payload.articleId || !payload.author || !payload.commentText) {
      throw new Error("Données de commentaire incomplètes.");
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.COMMENTS);
    if (!sheet) throw new Error(`La feuille '${CONFIG.SHEETS.COMMENTS}' est introuvable.`);

    // Ajoute le commentaire avec le statut "Approuvé" par défaut.
    // Pour un système de modération, changez 'Approuvé' par 'En attente'.
    sheet.appendRow([payload.articleId, payload.author, payload.commentText, new Date(), 'Approuvé']);

    return { success: true, message: "Commentaire soumis avec succès." };
  } catch (e) {
    logAction('Front-End', 'postComment', 'ERROR', e.message, 'anonyme', "Vérifiez les données du formulaire et l'existence de la feuille 'Blog_Commentaires'.");
    return { success: false, error: "Impossible de soumettre le commentaire." };
  }
}

/**
 * Gère la soumission du formulaire de contact principal.
 * @param {Object} payload - Les données du formulaire (name, email, subject, message).
 * @returns {Object} Un objet indiquant le succès ou l'échec.
 */
function handleContactForm(payload) {
  try {
    if (!payload || !payload.name || !payload.email || !payload.message) {
      throw new Error("Les champs nom, email et message sont requis.");
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.CONTACT);
    if (!sheet) throw new Error(`La feuille '${CONFIG.SHEETS.CONTACT}' est introuvable.`);

    sheet.appendRow([new Date(), payload.name, payload.email, payload.subject || 'Aucun sujet', payload.message]);
    return { success: true, message: 'Votre message a bien été envoyé. Nous vous répondrons bientôt.' };
  } catch (e) {
    const userEmail = (payload && payload.email) || 'anonyme';
    logAction('Front-End', 'handleContactForm', 'ERROR', e.message, userEmail, "Vérifiez les données du formulaire et l'existence de la feuille 'Contact_Submissions'.");
    return { success: false, error: "Impossible d'envoyer le message." };
  }
}