# Security Web App 
A 2FA and password management system supported by google cloud & app scripts.
Can be used both personally and professionally. 

# Setting up

## The code
This code is 90% ready. There are 6 missing functions left out for security reasons. They need not be complex or overtly secure, they are a simple measure to avoid transmiting raw sensitive information. Make them as secure as you require. The main security resides within the Master Key and the app scripts settings. Filled in these methods should have at least an additional 80-100 lines of code:

`/**
 * Generate encryption key from company and email
 * @param {string} company - The company name
 * @param {string} email - The email address
 * @returns {string} The encryption key
 */
function generateEncryptionKey(company, email)`

`/**
 * Encrypt text using company and email as key components
 * @param {string} text - The text to encrypt
 * @param {string} company - The company name
 * @param {string} email - The email address
 * @returns {string} The encrypted text (base64 encoded)
 */
function encryptWithCredentials(text, company, email)`

`/**
 * Decrypt text using company and email as key components
 * @param {string} encryptedText - The encrypted text (base64 encoded)
 * @param {string} company - The company name
 * @param {string} email - The email address
 * @returns {string} The decrypted text
 */
function decryptWithCredentials(encryptedText, company, email)`

`/**
 * Generate a hash for secret validation
 * @param {string} seed - The secret seed
 * @param {string} company - The company name
 * @param {string} email - The email address
 * @returns {string} The SHA256 hash
 */
function generateSecretHash(seed, company, email)`

`/**
 * Encrypts data with the master key.
 * @param {string} data - The data to encrypt
 * @returns {string} The encrypted data
 */
function encryptWithMasterKey(data)`

`/**
 * Decrypts data with the master key.
 * @param {string} encryptedData - The encrypted data
 * @returns {string} The decrypted data
 */
function decryptWithMasterKey(encryptedData)`

## The App Script


## The cloud base