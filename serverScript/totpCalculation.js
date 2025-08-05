/**
 * This file contains the server-side logic for securely saving and retrieving TOTP secrets.
 * It includes functions for encryption, decryption, TOTP generation, and user management.
 * 
 * @author Matt Sebahar
 * @copyright Startupbootcamp Australia
 * @date 24.07.2025
 */

/**
 * Securely saves a new secret with encryption and hashing, with update functionality.
 * @param {Object} data Object containing either new entry data or update data.
 * @returns {Object} An object indicating the success or failure of the operation.
 */
function saveSecret(data) {
  try {
    // Get existing secrets from encrypted storage
    const existingSecretsJSON = SCRIPT_PROPS.getProperty('SECRETS-ENCRYPTED');
    const secrets = existingSecretsJSON ? JSON.parse(existingSecretsJSON) : [];

    if (data.isUpdate) {
      // Handle update - find existing entry and update only company, email, password
      const existingIndex = secrets.findIndex(secret =>
        secret.company === data.originalCompany && secret.email === data.originalEmail
      );

      if (existingIndex === -1) {
        return { success: false, message: 'Original entry not found for update.' };
      }

      // Update the entry while preserving the original seed and hash
      const existingSecret = secrets[existingIndex];
      existingSecret.company = data.newCompany;
      existingSecret.email = data.newEmail;

      // Update password if provided
      if (data.encryptedPassword) {
        const decryptedPassword = decryptWithCredentials(data.encryptedPassword, data.newCompany, data.newEmail);
        existingSecret.encryptedPass = encryptWithMasterKey(decryptedPassword);
      } else {
        // Remove password if not provided
        delete existingSecret.encryptedPass;
      }

      // Update backups
      const backupSecrets = JSON.parse(SCRIPT_PROPS.getProperty('SECRETS') || '[]');
      const backupIndex = backupSecrets.findIndex(secret =>
        secret.company === data.originalCompany && secret.email === data.originalEmail
      );
      if (backupIndex !== -1) {
        backupSecrets[backupIndex] = existingSecret;
      }

      // Save updated data
      const updateProps = { 'SECRETS-ENCRYPTED': JSON.stringify(secrets), 'SECRETS': JSON.stringify(backupSecrets) };
      SCRIPT_PROPS.setProperties(updateProps);

      return { success: true, message: 'Entry updated successfully.' };

    } else {
      // Handle new entry - original logic
      if (!data || !data.company || !data.email || !data.encryptedSeed || !data.secretHash) {
        return { success: false, message: 'All fields (company, email, encrypted seed, hash) are required.' };
      }

      // Decrypt the seed for server-side processing
      const decryptedSeed = decryptWithCredentials(data.encryptedSeed, data.company, data.email);

      // Verify the seed is valid by generating a TOTP
      const testTotp = getTotp(decryptedSeed);
      if (!testTotp || testTotp === 'Invalid Seed') {
        return { success: false, message: 'Invalid secret seed provided.' };
      }

      // Decrypt password if provided
      let decryptedPassword = null;
      if (data.encryptedPassword) {
        decryptedPassword = decryptWithCredentials(data.encryptedPassword, data.company, data.email);
      }

      // Check for existing entry with same company and email
      const existingIndex = secrets.findIndex(secret =>
        secret.company === data.company && secret.email === data.email
      );

      if (existingIndex !== -1) {
        return { success: false, message: 'An entry with this company and email already exists. Click the entry to edit it.' };
      }

      // Create encrypted storage object 
      const encryptedSecret = {
        company: data.company,
        email: data.email,
        // Store double-encrypted seed with a master key
        encryptedSeed: encryptWithMasterKey(decryptedSeed),
        secretHash: data.secretHash,
      };

      // Add encrypted password if provided
      if (decryptedPassword) {
        encryptedSecret.encryptedPass = encryptWithMasterKey(decryptedPassword);
      }

      secrets.push(encryptedSecret);

      // Add to backups as well
      const backupSecrets = JSON.parse(SCRIPT_PROPS.getProperty('SECRETS') || '[]');
      backupSecrets.push(encryptedSecret);

      //Update the script properties
      const updateProps = { 'SECRETS-ENCRYPTED': JSON.stringify(secrets), 'SECRETS': JSON.stringify(backupSecrets) };
      SCRIPT_PROPS.setProperties(updateProps);

      // Update all user permissions for the new card
      updateNewCardPerms(data.company, data.email);

      return { success: true, message: 'Secret saved securely.' };
    }
  } catch (error) {
    console.error('Error saving secret securely:', error);
    return { success: false, message: 'Failed to save secret securely: ' + error.message };
  }
}

/**
 * Gets only metadata (no secrets) for display purposes.
 * @returns {Array} Array of objects containing only company and email.
 */
function getSecretsData() {
  try {
    const existingSecretsJSON = SCRIPT_PROPS.getProperty('SECRETS-ENCRYPTED');
    const secrets = existingSecretsJSON ? JSON.parse(existingSecretsJSON) : [];

    // Return only safe metadata, never the actual secrets
    return secrets.map(secret => ({
      company: secret.company,
      email: secret.email,
    }));
  } catch (error) {
    console.error('Error retrieving secrets metadata:', error);
    return [];
  }
}


function getSecretForEditing(company, email) {
  try {
    const existingSecretsJSON = SCRIPT_PROPS.getProperty('SECRETS-ENCRYPTED');
    const secrets = existingSecretsJSON ? JSON.parse(existingSecretsJSON) : [];

    const secret = secrets.find(s => s.company === company && s.email === email);

    if (!secret) {
      return { success: false, message: 'Secret not found.' };
    }

    const result = {
      success: true,
      company: secret.company,
      email: secret.email,
      password: null
    };

    // Decrypt password if it exists
    if (secret.encryptedPass) {
      try {
        result.password = decryptWithMasterKey(secret.encryptedPass);
      } catch (error) {
        console.error('Error decrypting password:', error);
      }
    }

    return result;
  } catch (error) {
    console.error('Error retrieving secret for editing:', error);
    return { success: false, message: 'Failed to retrieve secret: ' + error.message };
  }
}

/**
 * Generates TOTP codes server-side only. Never exposes secrets to client.
 * @returns {Array} Array of objects with company, email, current TOTP code and password.
 */
function getTotp2FACodes() {
  try {
    const existingSecretsJSON = SCRIPT_PROPS.getProperty('SECRETS-ENCRYPTED');
    const secrets = existingSecretsJSON ? JSON.parse(existingSecretsJSON) : [];
    
    // Get current user's permissions
    const userEmail = Session.getActiveUser().getEmail();
    const usersJSON = SCRIPT_PROPS.getProperty('USERS');
    const users = usersJSON ? JSON.parse(usersJSON) : {};
    const userGroupsJSON = SCRIPT_PROPS.getProperty('USER_GROUPS');
    const userGroups = userGroupsJSON ? JSON.parse(userGroupsJSON) : {};
    
    const userPermissions = users[userEmail];
    
    return secrets.map(secret => {
      try {
        // Check if user has permission to see this card
        const cardId = `${secret.company}-${secret.email}`;
        let hasPermission = false;
        
        if (userPermissions) {
          // Check individual permissions first
          if (userPermissions.isAdmin || userPermissions.cardPermissions[cardId]) {
            hasPermission = true;
          } else if (userPermissions.userGroup && userGroups[userPermissions.userGroup]) {
            // Check group permissions (OR logic as specified)
            const groupPermissions = userGroups[userPermissions.userGroup];
            if (groupPermissions.isAdmin || groupPermissions.cardPermissions[cardId]) 
              hasPermission = true;
          } else if (!userPermissions.userGroup && userGroups['DEFAULT'].cardPermissions[cardId]) 
            hasPermission = true;
        }

        // If no user permissions, check default group permissions
        if(!userPermissions && userGroups['DEFAULT'].cardPermissions[cardId]) 
          hasPermission = true;
        
        if (!hasPermission) 
          return null; // Hide this card
        
        // Decrypt seed server-side only
        const decryptedSeed = decryptWithMasterKey(secret.encryptedSeed);
        const totpCode = getTotp(decryptedSeed);

        let decryptedPass = null;
        if (secret.encryptedPass)
          decryptedPass = decryptWithMasterKey(secret.encryptedPass);

        return {
          company: secret.company,
          email: secret.email,
          totpCode: totpCode,
          password: decryptedPass
        };
      } catch (error) {
        console.error('Error generating TOTP for:', secret.company, error);
        return {
          company: secret.company,
          email: secret.email,
          totpCode: 'Error',
        };
      }
    }).filter(item => item !== null); // Remove null entries (no permission)
  } catch (error) {
    console.error('Error getting TOTP codes:', error);
    return [];
  }
}

/**
 * A robust Base32 decoder using only Google Apps Script built-in functions.
 * @param {string} base32 - A Base32 encoded string.
 * @returns {Array|null} The decoded data as a byte array, or null on error.
 */
function base32Decoder(base32) {
  try {
    const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const lookup = new Array(256).fill(-1);

    // Build lookup table for faster character-to-value mapping
    for (let i = 0; i < base32Chars.length; i++) {
      lookup[base32Chars.charCodeAt(i)] = i;
    }

    let buffer = 0, bitsLeft = 0;
    const result = [];
    base32 = base32.toUpperCase().replace(/=+$/, "");

    for (let i = 0; i < base32.length; i++) {
      const value = lookup[base32.charCodeAt(i)];
      if (value === -1) {
        throw new Error("Invalid Base32 character: " + base32[i]);
      }
      buffer = (buffer << 5) | value;
      bitsLeft += 5;
      if (bitsLeft >= 8) {
        result.push((buffer >>> (bitsLeft - 8)) & 0xFF);
        bitsLeft -= 8;
      }
    }

    return result; // Return byte array for Google Apps Script
  } catch (error) {
    console.error("Base32 Decode Error:", error.message);
    return null;
  }
}

/**
 * Calculates a Time-based One-Time Password (TOTP) from a secret seed for 2FA.
 * Utilizes the RFC 6238 standard for TOTP generation.
 * 
 * @param {string} secretSeed - The secret key, Base32 encoded.
 * @param {number} [timeStep=30] - The time step in seconds.
 * @param {number} [digits=6] - The number of digits in the output code.
 * @returns {string} The calculated TOTP code or a user-friendly error string.
 */
function getTotp(secretSeed, timeStep = 30, digits = 6) {
  try {
    const keyBytes = base32Decoder(secretSeed);
    if (!keyBytes || keyBytes.length === 0) {
      return "Invalid Seed";
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeCounter = Math.floor(currentTime / timeStep);

    // Convert timeCounter to 8-byte array (big-endian) - RFC 6238 standard
    const timeBytes = new Array(8);
    let counter = timeCounter;
    for (let i = 7; i >= 0; i--) {
      timeBytes[i] = counter & 0xFF;
      counter = Math.floor(counter / 256);
    }

    // Use Google Apps Script's built-in HMAC-SHA1
    const hmacBytes = Utilities.computeHmacSignature(
      Utilities.MacAlgorithm.HMAC_SHA_1,
      timeBytes,
      keyBytes
    );

    // Convert to regular array if needed
    const hashBytes = Array.from(hmacBytes);

    // Dynamic truncation according to RFC 4226
    const offset = hashBytes[hashBytes.length - 1] & 0x0F;
    const truncatedHash =
      ((hashBytes[offset] & 0x7F) << 24) |
      ((hashBytes[offset + 1] & 0xFF) << 16) |
      ((hashBytes[offset + 2] & 0xFF) << 8) |
      (hashBytes[offset + 3] & 0xFF);

    // Generate the final code
    const code = truncatedHash % Math.pow(10, digits);
    return code.toString().padStart(digits, '0');
  } catch (error) {
    console.error("Error generating TOTP:", error);
    return "Invalid Seed";
  }
}