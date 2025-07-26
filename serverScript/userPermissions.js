/**
 * This file contains functions for managing user permissions and groups in the Security Web App.
 * It allows for adding, updating, and removing users and groups, as well as managing their permissions.
 * These primarily interact with Google Apps Script's Script Properties to store user data.
 * 
 * @author Matt Sebahar
 * @copyright Startupbootcamp Australia
 * @date 24.07.2025
 */

/**
 * Updates user or group permissions.
 * @param {string} email The email address of the user or group name.
 * @param {Object} permissions The permissions object with isAdmin and cardPermissions.
 * @param {boolean} isGroup Whether this is a group update.
 * @returns {Object} An object indicating the success or failure of the operation.
 */
function updateUserPermissions(email, permissions, isGroup = false) {
  if (!email || typeof email !== 'string') {
    return { success: false, message: 'Invalid identifier provided.' };
  }

  try {
    if (isGroup) {
      // Update user group permissions
      const existingGroupsJSON = SCRIPT_PROPS.getProperty('USER_GROUPS');
      const userGroups = existingGroupsJSON ? JSON.parse(existingGroupsJSON) : {};

      if (!userGroups[email]) {
        return { success: false, message: 'User group not found.' };
      }

      // Update group permissions (groups don't have userGroup property)
      userGroups[email] = {
        isAdmin: permissions.isAdmin,
        cardPermissions: permissions.cardPermissions
      };

      // Save the updated groups object back to properties
      SCRIPT_PROPS.setProperty('USER_GROUPS', JSON.stringify(userGroups));

      return { success: true, message: 'User group permissions updated successfully.' };
    } else {
      // Update individual user permissions
      const existingUsersJSON = SCRIPT_PROPS.getProperty('USERS');
      const users = existingUsersJSON ? JSON.parse(existingUsersJSON) : {};

      if (!users[email]) {
        return { success: false, message: 'User not found.' };
      }

      // Update user permissions
      users[email] = permissions;

      // Save the updated users object back to properties
      SCRIPT_PROPS.setProperty('USERS', JSON.stringify(users));

      return { success: true, message: 'User permissions updated successfully.' };
    }
  } catch (error) {
    console.error('Error updating permissions:', error);
    return { success: false, message: 'Server error: Failed to update permissions. ' + error.message };
  }
}

/**
 * Removes a user from the Script Properties.
 * @param {string} email The email address of the user to be removed.
 * @param {boolean} isGroup Whether this is a user group removal.
 * @returns {Object} An object indicating the success or failure of the operation.
 */
function removeUser(email, isGroup = false) {
  if (!email || typeof email !== 'string') {
    return { success: false, message: 'Invalid identifier provided.' };
  }

  try {
    if (isGroup) {
      // Prevent deletion of DEFAULT or ADMIN group
      if (email === 'DEFAULT' || email === 'ADMIN') {
        return { success: false, message: `The ${email} group cannot be removed as it is required for system permissions.` };
      }
      
      // Remove user group
      const existingGroupsJSON = SCRIPT_PROPS.getProperty('USER_GROUPS');
      const userGroups = existingGroupsJSON ? JSON.parse(existingGroupsJSON) : {};

      if (!userGroups[email]) {
        return { success: false, message: 'User group not found.' };
      }

      // Remove the group
      delete userGroups[email];

      // Remove group assignment from all users
      const existingUsersJSON = SCRIPT_PROPS.getProperty('USERS');
      const users = existingUsersJSON ? JSON.parse(existingUsersJSON) : {};
      
      Object.keys(users).forEach(userEmail => {
        if (users[userEmail].userGroup === email) {
          users[userEmail].userGroup = 'DEFAULT'; // Reset to default group
        }
      });

      // Save both updates
      SCRIPT_PROPS.setProperty('USER_GROUPS', JSON.stringify(userGroups));
      SCRIPT_PROPS.setProperty('USERS', JSON.stringify(users));

      return { success: true, message: 'User group removed successfully.' };
    } else {
      // Remove individual user
      const existingUsersJSON = SCRIPT_PROPS.getProperty('USERS');
      const users = existingUsersJSON ? JSON.parse(existingUsersJSON) : {};

      if (!users[email]) {
        return { success: false, message: 'User not found.' };
      }

      // Remove the user
      delete users[email];

      // Save the updated users object back to properties
      SCRIPT_PROPS.setProperty('USERS', JSON.stringify(users));

      return { success: true, message: 'User removed successfully.' };
    }
  } catch (error) {
    console.error('Error removing user/group:', error);
    return { success: false, message: 'Server error: Failed to remove item. ' + error.message };
  }
}

/**
 * Saves a new user group with default permissions.
 * @param {string} groupName The name of the user group.
 * @returns {Object} An object indicating the success or failure of the operation.
 */
function saveUserGroup(groupName) {
  if (!groupName || typeof groupName !== 'string') 
    return { success: false, message: 'Invalid group name provided.' };

  try {
    // Retrieve the current list of user groups, or initialize an empty object if none exist
    const existingGroupsJSON = SCRIPT_PROPS.getProperty('USER_GROUPS');
    const userGroups = existingGroupsJSON ? JSON.parse(existingGroupsJSON) : {};

    // Check if the group name already exists
    if (userGroups[groupName]) {
      return { success: false, message: 'This group name already exists.' };
    }

    // Get all available cards for default permissions
    const secrets = getSecretsData();
    const defaultPermissions = {
      isAdmin: false,
      cardPermissions: {}
    };

    // Set all card permissions to false by default
    secrets.forEach(secret => {
      const cardId = `${secret.company}-${secret.email}`;
      defaultPermissions.cardPermissions[cardId] = false;
    });

    // Add the new group with default permissions
    userGroups[groupName] = defaultPermissions;

    // Save the updated groups object back to properties
    SCRIPT_PROPS.setProperty('USER_GROUPS', JSON.stringify(userGroups));

    return { success: true, message: `User group "${groupName}" added successfully.` };
  } catch (error) {
    console.error('Error saving user group:', error);
    return { success: false, message: 'Server error: Failed to save user group. ' + error.message };
  }
}

/**
 * Gets both users and user groups for the management interface.
 * @returns {Object} An object containing both users and userGroups.
 */
function getUsersAndGroups() {
  try {
    return {
      users: getUsers(),
      userGroups: getUserGroups()
    };
  } catch (error) {
    console.error('Error retrieving users and groups:', error);
    return { users: {}, userGroups: {} };
  }
}

/**
 * Get user or group permissions data for the management interface.
 * 
 * @returns {Object} Object containing users, userGroups, and secrets data.
 */
function getUserPerms() {
  try {
    return {
      users: getUsers(),
      userGroups: getUserGroups(),
      secrets: getSecretsData()
    };
  } catch (error) {
    console.error('Error getting permissions data:', error);
    return { users: {}, userGroups: {}, secrets: [] };
  }
}

/**
 * Removes a secret from the Script Properties.
 * @param {string} company The company name of the secret to be removed.
 * @param {string} email The email associated with the secret to be removed.
 * @returns {Object} An object indicating the success or failure of the operation.
 */
function removeSecret(company, email) {
  if (!company && !email) {
    return { success: false, message: 'Company name or email must be provided.' };
  }

  try {
    const existingSecretsJSON = SCRIPT_PROPS.getProperty('SECRETS-ENCRYPTED');
    let secrets = existingSecretsJSON ? JSON.parse(existingSecretsJSON) : [];

    // Find the secret to remove (match by both company and email for uniqueness)
    const initialLength = secrets.length;
    const filteredSecrets = secrets.filter(secret => {
      return !(secret.company === company && secret.email === email);
    });

    if (filteredSecrets.length < initialLength) {
      // Found and removed from encrypted storage
      SCRIPT_PROPS.setProperty('SECRETS-ENCRYPTED', JSON.stringify(filteredSecrets));
      return { success: true, message: `Secret for ${company || email} removed successfully.` };
    }

    return { success: false, message: `Failed to remove secret for ${company || email}.` };
  } catch (error) {
    console.error('Error removing secret:', error);
    return { success: false, message: 'Server error: Failed to remove secret. ' + error.message };
  }
}

/**
 * Updates card permissions for all users and groups when a new card is added.
 * @param {string} company The company name.
 * @param {string} email The email address.
 */
function updateNewCardPerms(company, email) {
  try {
    const cardId = `${company}-${email}`;
    
    // Update user permissions
    const usersJSON = SCRIPT_PROPS.getProperty('USERS');
    if (usersJSON) {
      const users = JSON.parse(usersJSON);
      
      // Add the new card permission for all users
      Object.keys(users).forEach(userEmail => {
        if (!users[userEmail].cardPermissions) 
          users[userEmail].cardPermissions = {};
        
        // Set permissions to true for admins, false for others
        users[userEmail].cardPermissions[cardId] = users[userEmail].isAdmin; 
      });
      
      SCRIPT_PROPS.setProperty('USERS', JSON.stringify(users));
    }
    
    // Update user group permissions
    const userGroupsJSON = SCRIPT_PROPS.getProperty('USER_GROUPS');
    if (userGroupsJSON) {
      const userGroups = JSON.parse(userGroupsJSON);
      
      // Add the new card permission for all groups
      Object.keys(userGroups).forEach(groupName => {
        if (!userGroups[groupName].cardPermissions) 
          userGroups[groupName].cardPermissions = {};
        
        // Set permissions to true for admin groups, false for others
        userGroups[groupName].cardPermissions[cardId] = userGroups[groupName].isAdmin; 
      });
      
      SCRIPT_PROPS.setProperty('USER_GROUPS', JSON.stringify(userGroups));
    }
  } catch (error) {
    console.error('Error updating permissions for new card:', error);
  }
}


/**
 * Retrieves the list of users from Script Properties.
 * @returns {Object} An object of user emails with their permissions.
 */
function getUsers() {
  try {
    const usersJSON = SCRIPT_PROPS.getProperty('USERS');
    return usersJSON ? JSON.parse(usersJSON) : {};
  } catch (error) {
    console.error('Error retrieving users:', error);
    return null;
  }
}

/**
 * Gets all user groups from Script Properties.
 * @returns {Object} An object of group names with their permissions.
 */
function getUserGroups() {
  try {
    const groupsJSON = SCRIPT_PROPS.getProperty('USER_GROUPS');
    return groupsJSON ? JSON.parse(groupsJSON) : {};
  } catch (error) {
    console.error('Error retrieving user groups:', error);
    return null;
  }
}

/**
 * Saves a new user email to the Script Properties with default permissions.
 * @param {string} email The email address of the new user to be added.
 * @returns {Object} An object indicating the success or failure of the operation.
 */
function saveUser(email) {
  // Basic validation to ensure email is provided
  if (!email || typeof email !== 'string' || !email.includes('@startupbootcamp.com.au'))
    return { success: false, message: 'Invalid email provided.' };

  try {
    // Retrieve the current list of users, or initialize an empty array if none exist
    const existingUsersJSON = SCRIPT_PROPS.getProperty('USERS');
    const users = existingUsersJSON ? JSON.parse(existingUsersJSON) : {};

    // Check if the email is already in the list
    if (users[email]) {
      return { success: false, message: 'This email is already a registered user.' };
    }

    // Get all available cards for default permissions
    const secrets = getSecretsData();
    const defaultPermissions = {
      isAdmin: false,
      cardPermissions: {},
      userGroup: 'DEFAULT' // Default to group default
    };

    // Set all card permissions to false by default
    secrets.forEach(secret => {
      const cardId = `${secret.company}-${secret.email}`;
      defaultPermissions.cardPermissions[cardId] = false;
    });

    // Add the new user with default permissions
    users[email] = defaultPermissions;

    // Save the updated users object back to properties as a JSON string
    SCRIPT_PROPS.setProperty('USERS', JSON.stringify(users));

    return { success: true, message: 'User added successfully.' };
  } catch (error) {
    // Log the detailed error on the server-side for debugging
    console.error('Error saving user:', error);
    return { success: false, message: 'Server error: Failed to save user. ' + error.message };
  }
}