/**
 * ==================================================================
 * GESTIONNAIRES DE REQUÊTES (doGet, doPost, doOptions)
 * ==================================================================
 */

/**
 * Gère les requêtes GET.
 * Renvoie un message simple pour indiquer que l'API est en ligne.
 * @param {Object} e - L'objet événement de la requête.
 * @returns {ContentService.TextOutput} Une réponse JSON.
 */
function doGet(e) {
  return corsify({ status: 'API en ligne', message: 'Veuillez utiliser des requêtes POST.' });
}

/**
 * Gère les requêtes HTTP POST. C'est le point d'entrée principal pour toutes les actions.
 * Il agit comme un routeur qui appelle la bonne fonction en fonction du paramètre 'action'.
 * @param {Object} e - L'objet événement de la requête, contenant les paramètres.
 * @returns {ContentService.TextOutput} Une réponse JSON formatée avec les en-têtes CORS.
 */
function doPost(e) {
  try {
    // Récupération de l'action et des données (payload) depuis la requête.
    const action = e.parameter.action;
    const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};
    let result;

    // Initialisation de la feuille de calcul pour la passer à certaines fonctions si nécessaire.
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Aiguillage (switch) pour appeler la fonction correspondante à l'action demandée.
    switch (action) {
      // Actions liées au contenu (Blog, Événements, Besoins)
      case 'getBlogPosts': result = getBlogPosts(); break;
      case 'getBlogPostById': result = getBlogPostById(e.parameter.id); break;
      case 'getEvents': result = getEvents(); break;
      case 'getUpcomingEvents': result = getUpcomingEvents(); break; // Nouvelle action pour les 3 prochains événements
      case 'getNeeds': result = getNeeds(); break;
      case 'getNeedById': result = getNeedById(e.parameter.id); break;

      // Actions interactives (Commentaires, Participations, Formulaires)
      case 'getComments': result = getComments(e.parameter.articleId); break;
      case 'postComment': result = postComment(payload); break;
      case 'participateToNeed': result = participateToNeed(payload, ss); break;
      case 'handlePrayerRequest': result = handlePrayerRequest(payload); break;
      case 'handleContactForm': result = handleContactForm(payload); break;

      // Cas par défaut si l'action n'est pas reconnue.
      default:
        result = { error: 'Action POST non reconnue.' };
        break;
    }

    // Enregistre l'action réussie dans l'historique.
    logAction(action, 'SUCCESS', `Action exécutée avec succès.`);
    // Renvoie le résultat au client, formaté en JSON avec les en-têtes CORS.
    return corsify(result);

  } catch (err) {
    // En cas d'erreur globale, on l'enregistre et on renvoie une réponse d'erreur générique.
    const errorMessage = `Erreur dans l'action '${e.parameter.action}': ${err.message} (Ligne: ${err.lineNumber})`;
    logAction(e.parameter.action, 'ERROR', errorMessage, 'anonyme', 'Vérifiez les données envoyées et la structure des feuilles Google Sheets.');
    return corsify({ error: "Une erreur interne est survenue. L'incident a été enregistré." });
  }
}

/**
 * Gère les requêtes "preflight" CORS envoyées par les navigateurs.
 */
function doOptions(e) {
  return corsify(null, true);
}

/**
 * ==================================================================
 * FONCTION UTILITAIRE CORS
 * ==================================================================
 */

/**
 * Ajoute les en-têtes CORS nécessaires à une réponse.
 * @param {Object|null} data - L'objet de données à renvoyer en JSON.
 * @param {boolean} [isOptions=false] - S'il s'agit d'une requête OPTIONS.
 * @returns {ContentService.TextOutput} La réponse formatée.
 */
function corsify(data, isOptions = false, reqOrigin = '') {
  const allowedOrigins = [
    'https://eed.abmcy.com',
    
  ];

  const origin = allowedOrigins.includes(reqOrigin) ? reqOrigin : 'null';

  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Content-Type': 'application/json'
  };

  if (isOptions) {
    headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(data)
  };
}


/**
 * ==================================================================
 * LOGIQUE DE L'APPLICATION
 * ==================================================================
 */

/**
 * Se déclenche à l'ouverture de la feuille de calcul.
 * Ajoute un menu personnalisé "Admin" à l'interface de Google Sheets
 * pour un accès facile aux fonctions d'administration.
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Admin Église')
      .addItem('Vérifier la Structure des Feuilles', 'verifyAndFixSheetStructure')
      .addItem('1. Initialiser les feuilles', 'setupSpreadsheet')
      .addToUi();
}

const seedData = {
  blog: [
    ['1', 'La Joie de Servir', 'Pasteur Jean', new Date('2024-05-28'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Un article inspirant sur le bonheur de s\'engager dans l\'œuvre de Dieu...', 'Réflexions', 'Publié'],
    ['2', 'L\'Importance de la Prière', 'Soeur Marie', new Date('2024-05-25'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Un guide pratique pour développer une vie de prière efficace et significative...', 'Enseignements', 'Publié'],
    ['3', 'La Foi en Action', 'Frère David', new Date('2024-05-20'), 'https://i.postimg.cc/nc96NVts/LOGO.png', 'Des exemples concrets de personnes qui ont manifesté leur foi à travers des actions concrètes...', 'Témoignages', 'Publié']
  ],
  blog_comments: [
    ['1', 'Visiteur Anonyme', 'Merci pour cet article édifiant !', new Date(), 'Approuvé'],
    ['2', 'Lecteur Fidele', 'Amen ! La prière est vraiment notre force.', new Date(), 'Approuvé']
  ],
  events: [
    ['1', 'Conférence sur la Famille', new Date('2024-06-15'), '10:00', 'Salle des Fêtes', 'Une journée pour renforcer les liens familiaux et découvrir des outils pour une vie harmonieuse.', 'https://i.postimg.cc/nc96NVts/LOGO.png', 'https://example.com/conference'],
    ['2', 'Soirée d\'Adoration', new Date('2024-06-22'), '19:00', 'Sanctuaire Principal', 'Un moment de louange et d\'adoration intense pour se connecter à Dieu.', 'https://i.postimg.cc/nc96NVts/LOGO.png', '']
  ],
  prayer_requests: [
    [new Date(), 'Anonyme', 'anonyme@email.com', 'Je demande la prière pour la guérison de ma mère.', 'Oui']
  ],
  contact_submissions: [
    [new Date(), 'Jean Dupont', 'jean.dupont@email.com', 'Question sur les horaires', 'Bonjour, pourriez-vous me donner les horaires des cultes du dimanche ? Merci.']
  ],
  needs: [
    ['1', 'Rénovation du Toit', 'Nous avons besoin de votre aide pour réparer le toit de l\'église.', 'Le toit actuel fuit et cause des dommages importants au bâtiment...', 'Nous organisons une collecte de fonds et recherchons des bénévoles...', 'https://i.postimg.cc/nc96NVts/LOGO.png', 10000000, 3500000, 'Construction', 'Actif'],
    ['2', 'Achat de Fournitures Scolaires', 'Aidez-nous à fournir des fournitures scolaires aux enfants défavorisés.', 'De nombreuses familles n\'ont pas les moyens d\'acheter les fournitures nécessaires...', 'Nous collectons des dons et organisons une distribution...', 'https://i.postimg.cc/nc96NVts/LOGO.png', 5000000, 2000000, 'Social', 'Actif']
  ],
  participations: [
    ['1', 'Donateur Généreux', 'donateur@email.com', 50000, new Date()]
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
        blog: 'Blog',
        blog_comments: 'Blog_Commentaires',
        events: 'Evenements',
        prayer_requests: 'Demandes_Priere',
        contact_submissions: 'Contact_Submissions',
        needs: 'Besoins',
        participations: 'Participations'
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
    { name: 'Historique_Actions', headers: ['Timestamp', 'Action', 'Statut', 'Message', 'Utilisateur_Email', 'Suggestion_Correction'] },
    { name: 'Blog', headers: ['ID', 'Titre', 'Auteur', 'Date', 'ImageURL', 'Contenu', 'Categorie', 'Statut'] },
    { name: 'Blog_Commentaires', headers: ['ID_Article', 'Auteur', 'Commentaire', 'Timestamp', 'Statut'] },
    { name: 'Evenements', headers: ['ID', 'Titre', 'Date', 'Heure', 'Lieu', 'Description', 'ImageURL', 'LienInscription'] },
    { name: 'Demandes_Priere', headers: ['Timestamp', 'Nom', 'Email', 'Pays', 'Nationalite', 'Telephone', 'Demande', 'Confidentialite'] },
    { name: 'Contact_Submissions', headers: ['Timestamp', 'Nom', 'Email', 'Sujet', 'Message'] },
    { name: 'Besoins', headers: ['ID', 'Titre', 'DescriptionCourte', 'Raison', 'Moyens', 'ImageURL', 'MontantObjectif', 'MontantActuel', 'Categorie', 'Statut'] },
    { name: 'Participations', headers: ['ID_Besoin', 'Nom', 'Email', 'Montant', 'Date'] },
  ];

  sheetsToCreate.forEach(sheetInfo => {
    let sheet = ss.getSheetByName(sheetInfo.name);
    if (!sheet) {
      sheet = ss.insertSheet(sheetInfo.name);
      sheet.getRange(1, 1, 1, sheetInfo.headers.length).setValues([sheetInfo.headers]).setFontWeight('bold');
      SpreadsheetApp.flush(); // Applique les changements
      Logger.log(`Feuille "${sheetInfo.name}" créée.`);
      
      // Ajout de données d'exemple pour les statistiques pour tester le graphique
      if (sheetInfo.name === 'Statistiques' && sheet.getLastRow() < 2) {
        const exampleData = [
          ['profil_test', new Date(), 'NFC'],
          ['profil_test', new Date(), 'NFC'],
          ['profil_test', new Date(), 'QR Code'],
          ['profil_test', new Date(), 'Lien'],
          ['profil_test', new Date(), 'NFC']
        ];
        sheet.getRange(2, 1, exampleData.length, exampleData[0].length).setValues(exampleData);
      }
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
    { name: 'Historique_Actions', headers: ['Timestamp', 'Action', 'Statut', 'Message', 'Utilisateur_Email', 'Suggestion_Correction'] },
    { name: 'Blog', headers: ['ID', 'Titre', 'Auteur', 'Date', 'ImageURL', 'Contenu', 'Categorie', 'Statut'] },
    { name: 'Blog_Commentaires', headers: ['ID_Article', 'Auteur', 'Commentaire', 'Timestamp', 'Statut'] },
    { name: 'Evenements', headers: ['ID', 'Titre', 'Date', 'Heure', 'Lieu', 'Description', 'ImageURL', 'LienInscription'] },
    { name: 'Demandes_Priere', headers: ['Timestamp', 'Nom', 'Email', 'Pays', 'Nationalite', 'Telephone', 'Demande', 'Confidentialite'] },
    { name: 'Contact_Submissions', headers: ['Timestamp', 'Nom', 'Email', 'Sujet', 'Message'] },
    { name: 'Besoins', headers: ['ID', 'Titre', 'DescriptionCourte', 'Raison', 'Moyens', 'ImageURL', 'MontantObjectif', 'MontantActuel', 'Categorie', 'Statut'] },
    { name: 'Participations', headers: ['ID_Besoin', 'Nom', 'Email', 'Montant', 'Date'] },
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
 * @param {string} action - Le nom de l'action effectuée (ex: 'saveProfile').
 * @param {string} status - 'SUCCESS' ou 'ERROR'.
 * @param {string} message - Le message détaillé de l'événement.
 * @param {string} [userEmail='anonyme'] - L'email de l'utilisateur effectuant l'action.
 * @param {string} [suggestion=''] - Une suggestion de correction en cas d'erreur.
 */
function logAction(action, status, message, userEmail = 'anonyme', suggestion = '') {
  try {
    const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Historique_Actions');
    if (logSheet) {
      logSheet.appendRow([new Date(), action, status, message, userEmail, suggestion]);
    }
  } catch (e) {
    Logger.log(`Impossible d'écrire dans la feuille d'historique: ${e.message}`);
  }
}

/**
 * ==================================================================
 * NOUVELLES FONCTIONS POUR LE CONTENU DYNAMIQUE
 * ==================================================================
 */

/**
 * Récupère tous les articles de blog publiés depuis la feuille 'Blog'.
 * @returns {Object} Un objet contenant les articles ou une erreur.
 */
function getBlogPosts() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Blog');
    if (!sheet) throw new Error("La feuille 'Blog' est introuvable.");
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    if (!headers || headers.length === 0) return { success: true, posts: [] }; // Feuille vide
    
    const posts = data.map(row => {
      const post = {};
      headers.forEach((header, index) => {
        post[header] = row[index];
      });
      return post;
    }).filter(post => post.Statut === 'Publié'); // On ne récupère que les articles publiés

    // Trie les articles par date, du plus récent au plus ancien.
    posts.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return { success: true, posts: posts };
  } catch (e) {
    logAction('getBlogPosts', 'ERROR', e.message, 'API');
    return { success: false, error: e.message };
  }
}

/**
 * Récupère un article de blog spécifique par son ID.
 * @param {string} id - L'ID de l'article à récupérer.
 * @returns {Object} Un objet contenant l'article ou une erreur.
 */
function getBlogPostById(id) {
  try {
    if (!id) throw new Error("Aucun ID d'article fourni.");
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Blog');
    if (!sheet) throw new Error("La feuille 'Blog' est introuvable.");
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumnIndex = headers.indexOf('ID');
    if (idColumnIndex === -1) throw new Error("La colonne 'ID' est introuvable dans la feuille 'Blog'.");

    const row = data.find(r => String(r[idColumnIndex]) === String(id));

    if (!row) return { success: false, error: "Article non trouvé." };

    const post = {};
    headers.forEach((header, index) => { post[header] = row[index]; });

    return { success: true, post: post };
  } catch (e) {
    logAction('getBlogPostById', 'ERROR', e.message, 'API');
    return { success: false, error: e.message };
  }
}

/**
 * Récupère tous les événements à venir depuis la feuille 'Evenements'.
 * @returns {Object} Un objet contenant les événements ou une erreur.
 */
function getEvents() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Evenements');
    if (!sheet) throw new Error("La feuille 'Evenements' est introuvable.");

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    if (!headers || headers.length === 0) return { success: true, events: [] }; // Feuille vide

    const events = data.map(row => {
      const event = {};
      headers.forEach((header, index) => { event[header] = row[index]; });
      return event;
    }).filter(event => new Date(event.Date) >= new Date()); // Uniquement les événements futurs

    return { success: true, events: events };
  } catch (e) {
    logAction('getEvents', 'ERROR', e.message, 'API');
    return { success: false, error: e.message };
  }
}

/**
 * Récupère les 3 prochains événements à venir depuis la feuille 'Evenements'.
 * @returns {Object} Un objet contenant les 3 prochains événements ou une erreur.
 */
function getUpcomingEvents() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Evenements');
    if (!sheet) throw new Error("La feuille 'Evenements' est introuvable.");

    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    if (!headers || headers.length === 0) return { success: true, events: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Pour inclure les événements du jour même.

    const events = data
      .map(row => {
        const event = {};
        headers.forEach((header, index) => { event[header] = row[index]; });
        return event;
      })
      .filter(event => new Date(event.Date) >= today) // Filtre pour les événements futurs ou d'aujourd'hui.
      .sort((a, b) => new Date(a.Date) - new Date(b.Date)) // Trie par date, du plus proche au plus lointain.
      .slice(0, 3); // Ne garde que les 3 premiers.

    return { success: true, events: events };
  } catch (e) {
    logAction('getUpcomingEvents', 'ERROR', e.message, 'API');
    return { success: false, error: e.message };
  }
}

/**
 * Gère la soumission d'une demande de prière depuis le site.
 * @param {Object} payload - Les données du formulaire (name, email, request, isConfidential).
 * @returns {Object} Un objet indiquant le succès ou l'échec.
 */
function handlePrayerRequest(payload) {
  try {
    if (!payload.request) throw new Error("Le contenu de la demande est manquant.");
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Demandes_Priere');
    if (!sheet) throw new Error("La feuille 'Demandes_Priere' est introuvable.");

    const name = payload.name || 'Anonyme';
    const email = payload.email || 'Non fourni';
    const country = payload.country || '';
    const nationality = payload.nationality || '';
    const phone = payload.phone || '';
    const isConfidential = payload.isConfidential ? 'Oui' : 'Non';

    // S'assure que les en-têtes de la feuille sont corrects.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Nom', 'Email', 'Pays', 'Nationalite', 'Telephone', 'Demande', 'Confidentialite']);
    }

    sheet.appendRow([new Date(), name, email, country, nationality, phone, payload.request, isConfidential]);
    return { success: true, message: 'Votre demande de prière a bien été envoyée.' };
  } catch (e) {
    logAction('handlePrayerRequest', 'ERROR', e.message, 'API');
    return { success: false, error: e.message };
  }
}

/**
 * Récupère tous les besoins actifs depuis la feuille 'Besoins'.
 * @returns {Object} Un objet contenant les besoins ou une erreur.
 */
function getNeeds() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Besoins');
    if (!sheet) throw new Error("La feuille 'Besoins' est introuvable.");
    
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    if (!headers || headers.length === 0) return { success: true, needs: [] }; // Feuille vide
    
    const needs = data.map(row => {
      const need = {};
      headers.forEach((header, index) => {
        need[header] = row[index];
      });
      return need;
    }).filter(need => need.Statut === 'Actif');

    return { success: true, needs: needs };
  } catch (e) {
    logAction('getNeeds', 'ERROR', e.message, 'API');
    return { success: false, error: e.message };
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
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Besoins');
    if (!sheet) throw new Error("La feuille 'Besoins' est introuvable.");
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumnIndex = headers.indexOf('ID');
    if (idColumnIndex === -1) throw new Error("La colonne 'ID' est introuvable dans la feuille 'Besoins'.");

    const row = data.find(r => String(r[idColumnIndex]) === String(id));

    if (!row) return { success: false, error: "Besoin non trouvé." };

    const need = {};
    headers.forEach((header, index) => { need[header] = row[index]; });

    return { success: true, need: need };
  } catch (e) {
    logAction('getNeedById', 'ERROR', e.message, 'API');
    return { success: false, error: e.message };
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
    // Vérification des données reçues.
    if (!payload.needId || !payload.name || !payload.amount) {
      throw new Error("Données de participation incomplètes.");
    }

    const participationsSheet = ss.getSheetByName("Participations") || ss.insertSheet("Participations");
    
    if (participationsSheet.getLastRow() === 0) {
      participationsSheet.appendRow(["ID_Besoin", "Nom", "Email", "Montant", "Date"]);
    }
    
    participationsSheet.appendRow([payload.needId, payload.name, payload.email || 'Non fourni', payload.amount, new Date()]);

    // Met à jour le montant actuel dans la feuille "Besoins".
    const needsSheet = ss.getSheetByName("Besoins");
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
    logAction('participateToNeed', 'ERROR', err.message, 'API');
    return { success: false, error: "Erreur serveur lors de l'enregistrement : " + err.message };
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
    if (!payload.articleId || !payload.author || !payload.commentText) {
      throw new Error("Données de commentaire incomplètes.");
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Blog_Commentaires');
    if (!sheet) throw new Error("La feuille 'Blog_Commentaires' est introuvable.");

    // Ajoute le commentaire avec le statut "Approuvé" par défaut.
    // Pour un système de modération, changez 'Approuvé' par 'En attente'.
    sheet.appendRow([payload.articleId, payload.author, payload.commentText, new Date(), 'Approuvé']);

    return { success: true, message: "Commentaire soumis avec succès." };
  } catch (e) {
    logAction('postComment', 'ERROR', e.message, 'API');
    return { success: false, error: e.message };
  }
}

/**
 * Gère la soumission du formulaire de contact principal.
 * @param {Object} payload - Les données du formulaire (name, email, subject, message).
 * @returns {Object} Un objet indiquant le succès ou l'échec.
 */
function handleContactForm(payload) {
  try {
    if (!payload.name || !payload.email || !payload.message) {
      throw new Error("Les champs nom, email et message sont requis.");
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Contact_Submissions');
    if (!sheet) throw new Error("La feuille 'Contact_Submissions' est introuvable.");

    sheet.appendRow([new Date(), payload.name, payload.email, payload.subject || 'Aucun sujet', payload.message]);
    return { success: true, message: 'Votre message a bien été envoyé. Nous vous répondrons bientôt.' };
  } catch (e) {
    logAction('handleContactForm', 'ERROR', e.message, 'API');
    return { success: false, error: e.message };
  }
}