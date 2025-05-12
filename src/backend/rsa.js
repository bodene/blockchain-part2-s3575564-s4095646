// Task 4: RSA Encryption/Decryption
import { modPow } from './utils.js';

// Convert string to ASCII
export function stringToAscii(str) {
    // Split str into characters then map each character to its ASCII code
    return str.split('').map(char => char.charCodeAt(0));
}

// Convert ASCII to string
export function asciiToString(asciiArray) {
    // Map each ASCII code to its character then join all elements into a single string
    return asciiArray.map(code => String.fromCharCode(code)).join('');
}

// Pad ASCII codes to 3 digits -> 'A' (65) becomes '065' etc.
// ASCII codes range from 1 - 3 digits, paddingn ensures consistent length
function padAscii(messageNumbers) {
    return messageNumbers.map(code => code.toString().padStart(3, '0')).join('');
}

// Encrypt data using RSA public key
export function encryptDataRSA(messageString, e, n) {
    // Convert the message string to ASCII codes
    const messageNumbers = stringToAscii(messageString);

    // Pad each ASCII code to 3 digits
    const paddedAscii = padAscii(messageNumbers);
    // Convert the padded ASCII string to a BigInt (consistent data type)
    const messageBigInt = BigInt(paddedAscii);

    // Encrypt the ASCII string using RSA encryption
    const encryptedBigInt = modPow(messageBigInt, e, n);
    return encryptedBigInt;
}

// Decrypt data using RSA private key
export function decryptDataRSA(encryptedString, d, n) {
    // Convert the encrypted string to a BigInt
    const encryptedBigInt = BigInt(encryptedString);

    // Decrypt the encrypted BigInt using RSA decryption
    const decryptedBigInt = modPow(encryptedBigInt, d, n);

    // Convert the decrypted BigInt back to a string
    const decryptedStr = decryptedBigInt.toString();

    /* 
    * Ensure the entire string length is a multiple of 3 (each ASCII code was 3 digits)
    * String length is divided by 3 then rounded to the nearest whole number
    * Multiply by 3 to get padded length (desired length)
    * String is then padded with 0's (left)
    */
    const paddedStr = decryptedStr.padStart(Math.ceil(decryptedStr.length / 3) * 3, '0');

    /*
    * Split padded string into groups of 3 characters then map each group to its corresponding ASCII code
    * Regex "/.{3}/g" matches every character (.), in groups of 3, global flag ensures every match is returned
    * Parse each group to an integer (base 10)
    * If match returns null, return an empty array
    */
    const asciiCodes = paddedStr.match  (/.{3}/g)?.map(code => parseInt(code, 10)) || [];
    return asciiToString(asciiCodes); // Convert ASCII codes back to string
}