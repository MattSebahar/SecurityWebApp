# Security Web App

A 2FA and password management system powered by Google Apps Script and Google Cloud. Used both personally and professionally to store emails, passowords, and 2FA codes. Passwords are optional as best practice would be to keep them seporate, but due to request were added. 


## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Google Cloud Setup](#google-cloud-setup)
- [Google Apps Script Setup](#google-apps-script-setup)
- [Project Structure](#project-structure)
- [Security Functions](#security-functions)


## Overview

This app provides a secure, cloud-based solution for managing 2FA codes and passwords. Leveraging Google Apps Script for hosting, Google Cloud for secure key management, and a custom HTML/CSS/JS frontend for a smooth user experience.


## Features

- **2FA Code Management:** Store, encrypt, and display TOTP codes for multiple accounts.
- **Password Vault:** Securely store and retrieve passwords, encrypted with a master key.
- **User Permissions:** Admins can manage users, groups, and access rights to ensure fine grain access.
- **Google Cloud Integration:** Uses Google Cloud Secret Manager for master key storage for improved security.
- **Custom UI:** Responsive, user-friendly interface for both end-users and admins.
- **Audit & Security:** All sensitive operations are double-encrypted and never exposed in plaintext. A backup uneditable by the UI is kept within the script properites for accidental deletions.


## Getting Started

### 1. Clone or Copy the Project
- Download or clone this repository.
- Open the project in your preferred code editor.

### 2. Set Up the Google Apps Script Project
- Go to [Google Apps Script](https://script.google.com).
- Create a new project.
- **Set up clasp (Command Line Apps Script):**
  - Install clasp globally if you haven't already:
    - `npm install -g @google/clasp`
  - Log in to your Google account:
    - `clasp login`
  - In the Apps Script editor, go to **Project Settings** and copy the **Script ID**.
  - In your local project folder, clone the Apps Script project:
    - `clasp clone <SCRIPT_ID>`
  - This will link your local files to the Apps Script project for push/pull operations. This makes editing much easier and the intial setup quicker than manual copy paste.
- In the Apps Script editor, go to **Project Settings > Script Properties** and add:
  - `MASTER_ENCRYPTION_KEY` (your master key, or set up Secret Manager as below)

### 3. Deploy as a Web App
- In the Apps Script editor, click **Deploy > New deployment**.
- Select **Web app**.
- Set "Who has access" to "Anyone" or "Anyone with the link" as needed.
- Deploy and copy the web app URL.


## Google Cloud Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project.
   - Payment must be connected, but this is far from exceeding the free tier.

2. **Enable Secret Manager API**
   - In the Cloud Console, go to **APIs & Services > Enable APIs and Services**.
   - Search for and enable **Secret Manager API**.

3. **Create a Secret for the Master Key**
   - Go to **Security > Secret Manager**.
   - Click **Create Secret** and add your master encryption key.

4. **Service Account & Permissions**
   - Create a service account with access to Secret Manager.
   - Generate a JSON key and add it to your Apps Script project as a script property (`SERVICE_ACCOUNT_KEY`).


## Project Structure

```
SecurityWebApp/
│
├── home/           # Main user-facing UI (HTML, JS, CSS for TOTP display)
├── admin/          # Admin panel for user/group management
├── serverScript/   # Apps Script backend logic (user management, encryption, TOTP)
├── secretEncryptions.js # Sensitive encryption/decryption logic (not in repo)
├── style.html      # Shared CSS styles
├── .claspignore    # Clasp config for Apps Script deployment
├── .gitignore      # Git config to avoid pushing secrets
└── README.md       # This file
```

- **home/**: User dashboard for viewing 2FA codes and copying passwords.
- **admin/**: Admin interface for managing users, groups, and permissions.
- **serverScript/**: All backend logic, including user registration, permissions, and TOTP generation.
- **secretEncryptions.js**: Sensitive encryption logic (excluded from repo for security).
- **style.html**: Shared CSS for consistent look and feel.


## Security Functions

> **Note:** For security, several key functions are left as stubs.  
> You must implement these yourself in `secretEncryptions.js`:

```js
/**
 * Generate encryption key from company and email
 */
function generateEncryptionKey(company, email)

/**
 * Encrypt text using company and email as key components
 */
function encryptWithCredentials(text, company, email)

/**
 * Decrypt text using company and email as key components
 */
function decryptWithCredentials(encryptedText, company, email)

/**
 * Generate a hash for secret validation
 */
function generateSecretHash(seed, company, email)
 

/**
 *Encrypts data with the master key.
 */
function encryptWithMasterKey(data)


/**
 * Decrypts data with the master key.
 */
 function decryptWithMasterKey(encryptedData)

```