// Task 4: Procurement Officer entity
import { modInverse } from './utils.js';
import { decryptDataRSA } from './rsa.js';

export const p_PO = 1080954735722463992988394149602856332100628417n;
export const q_PO = 1158106283320086444890911863299879973542293243n;
export const e_PO = 106506253943651610547613n;

// Compute RSA Modulus and totient
export const n_PO = p_PO * q_PO;
const phi = (p_PO - 1n) * (q_PO - 1n);

// Compute officer's private key
export const d_PO = modInverse(e_PO, phi);

/*
* Function to decrypt data using Officer's private key (d_PO)
* The file "rsa.js" contains the RSA encryption and decryption functions.
* This function handles the decryption of data using the Procurement Officer's private key.
* Therefore, when the officer recieves the encrypted data, they can decrypt it using the function,
* and incorporating thier private key (d_PO) and modulus (n_PO).
*/
export function decryptDataOfficer(encryptedDataString) {
    // Decrypt the encrypted data
    const decryptedString = decryptDataRSA(encryptedDataString, d_PO, n_PO);

    // Parse the decrypted string back into JSON format
    return JSON.parse(decryptedString);
}