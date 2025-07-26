/**
 * An app used to present restricted access for passwords and security.
 * Features a home page for interns and 2FA viewing and an Admin site for adding TOTP secrets.
 *
 * @author Matt Sebahar
 * @copyright Startupbootcamp
 * @date 24.07.2025
 */

const SCRIPT_PROPS = PropertiesService.getScriptProperties();
const SECRET_ID = 'MASTER_ENCRYPTION_KEY';
const PROJECT_ID = 'secret-manager-466302';

/**
 * **Required Function**
 * Recieves HTTP GET requests and routes to the correct page.
 * The default page is 'index.html' (home).
 * A parameter `?page=add` will route to the 'add.html' (admin) page.
 *
 * @param {Object} e The event parameter for a web app request.
 * @returns {HtmlOutput} The HTML page to be served.
 */
function doGet(e) {

  // Check which page the user is directing for
  if (e.parameter.page === 'add') {

    // Gather the users, returning the home page on error
    const users = getUsers();
    if(!users)
      return HtmlService.createTemplateFromFile('home/index')
        .evaluate()
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setTitle('SBC Intern 2FA');
    
    // Check permissions before returning new page
    const userEmail = Session.getActiveUser().getEmail();
    if (users[userEmail] && users[userEmail].isAdmin)
      return HtmlService.createTemplateFromFile('admin/add')
        .evaluate()
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setTitle('SBC Admin 2FA');
  }

  // Default to the home page for viewing all 2FA codes
  return HtmlService.createTemplateFromFile('home/index')
    .evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setTitle('SBC Intern 2FA');
}

/**
 * Helper function to includes HTML content from another file into the main template.
 * 
 * @param {string} filename The name of the file to include.
 * @returns {string} The content of the file.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
* Fetches the master key from Secret Manager by authenticating as a service account.
* Caches the master key for 30 minutes to avoid re-fetching.
* @returns {string} The decrypted master key.
*/
function getMasterKey() {
  // Check for the master key in the script cache
  const scriptCache = CacheService.getScriptCache();
  const cachedKey = scriptCache.get(SECRET_ID);
  if (cachedKey !== null) {
    return cachedKey;
  }

  // Fetch if not found in the cache
  const serviceAccountKeyJson = SCRIPT_PROPS.getProperty('SERVICE_ACCOUNT_KEY');
  if (!serviceAccountKeyJson) 
    throw new Error('Service Account Key is not configured in Script Properties.');
  
  const serviceAccountKey = JSON.parse(serviceAccountKeyJson);

  // Create a new OAuth2 service using the library
  const service = OAuth2.createService('SecretManager')
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setPrivateKey(serviceAccountKey.private_key)
    .setIssuer(serviceAccountKey.client_email)
    .setCache(CacheService.getScriptCache())
    .setScope('https://www.googleapis.com/auth/cloud-platform');

  if (!service.hasAccess()) {
    console.error('Service Account failed to authorize: ' + service.getLastError());
    throw new Error('Could not authenticate with service account.');
  }

  // Prep the API call to Secret Manager
  const accessToken = service.getAccessToken();
  const endpoint = `projects/${PROJECT_ID}/secrets/${SECRET_ID}/versions/latest:access`;
  const api = `https://secretmanager.googleapis.com/v1/${endpoint}`;

  // Fetch the secret from Secret Manager
  const response = UrlFetchApp.fetch(api, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    muteHttpExceptions: true
  });

  const { error, payload } = JSON.parse(response.getContentText());
  if (error) 
    throw new Error('Failed to access secret: ' + error.message);

  // Decode the base64-encoded secret data
  const masterKey = Utilities.newBlob(Utilities.base64Decode(payload.data)).getDataAsString();

  // Cache the key for 30 minutes (1800 seconds).
  scriptCache.put(SECRET_ID, masterKey, 1800);

  return masterKey;
}