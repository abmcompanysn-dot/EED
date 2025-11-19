// ==================== POINT D'ENTRÉE PRINCIPAL DE L'API ====================
// Gère les requêtes GET (pour récupérer des données)
function doGet(e) {
  let action = e.parameter.action;

  // Aiguillage en fonction de l'action demandée
  switch (action) {
    case 'getEvents':
      return sendAsJson(getSheetDataAsJson("Événements"));
    case 'getBlogPosts':
      return sendAsJson(getSheetDataAsJson("Blog"));
    case 'getNeeds':
      return sendAsJson(getSheetDataAsJson("Besoins"));
    default:
      return sendAsJson({ success: false, error: "Action non reconnue." });
  }
}

// Gère les requêtes POST (pour soumettre des données)
function doPost(e) {
  let action = e.parameter.action;
  let payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : null;

  if (!payload) {
    return sendAsJson({ success: false, error: "Aucune donnée reçue." });
  }

  // Aiguillage en fonction de l'action demandée
  switch (action) {
    case 'handlePrayerRequest':
      return sendAsJson(logToSheet("DemandesPrière", payload));
    case 'handleContactForm':
      return sendAsJson(logToSheet("Contacts", payload));
    case 'participateToNeed':
       return sendAsJson(logToSheet("Participations", payload));
    default:
      return sendAsJson({ success: false, error: "Action non reconnue." });
  }
}

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Récupère les données d'une feuille de calcul et les transforme en un tableau d'objets JSON.
 * La première ligne de la feuille doit contenir les noms des colonnes (clés JSON).
 * @param {string} sheetName - Le nom de la feuille de calcul.
 * @returns {object} - Un objet contenant le statut du succès et les données (ou une erreur).
 */
function getSheetDataAsJson(sheetName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return { success: false, error: `Feuille '${sheetName}' non trouvée.` };
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      // Si la feuille est vide ou n'a que l'en-tête
      return { success: true, [sheetName.toLowerCase()]: [] };
    }

    const headers = values.shift().map(header => header.trim()); // Prend la première ligne comme en-têtes
    
    const jsonArray = values.map(row => {
      let obj = {};
      headers.forEach((header, i) => {
        // Gère les dates correctement
        obj[header] = (row[i] instanceof Date) ? row[i].toISOString() : row[i];
      });
      return obj;
    });

    // Pour le blog, trier par date du plus récent au plus ancien
    if (sheetName === "Blog" && jsonArray[0] && jsonArray[0].Date) {
      jsonArray.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    }

    return { success: true, [sheetName.toLowerCase()]: jsonArray };

  } catch (error) {
    return { success: false, error: error.message, stack: error.stack };
  }
}

/**
 * Enregistre un objet de données dans une nouvelle ligne d'une feuille de calcul.
 * @param {string} sheetName - Le nom de la feuille de calcul.
 * @param {object} dataObject - L'objet contenant les données à enregistrer.
 * @returns {object} - Un objet indiquant le statut du succès.
 */
function logToSheet(sheetName, dataObject) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return { success: false, error: `Feuille '${sheetName}' non trouvée.` };
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => dataObject[header] || ""); // Crée la ligne dans le bon ordre
    
    // Ajoute la date et l'heure de soumission
    if (headers.includes("Timestamp")) {
        const timestampIndex = headers.indexOf("Timestamp");
        newRow[timestampIndex] = new Date();
    }

    sheet.appendRow(newRow);

    return { success: true, message: "Données enregistrées avec succès." };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Formate la réponse en JSON pour l'API.
 * @param {object} data - L'objet de données à envoyer.
 * @returns {ContentService.TextOutput} - La réponse formatée.
 */
function sendAsJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}