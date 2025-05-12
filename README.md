# Secure DLT-Based Inventory Management System (Part 2)

INTE2627 – Assignment 2 | RMIT University – Semester 1, 2025

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white) ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)

---

## How to Run the Project

### 1. Clone the Repository

```bash
git clone https://github.com/bodene-rmit/blockchain-part2-s3575564-s4095646.git
cd blockchain-part2-s3575564-s4095646
```

### 2. Install Dependencies

Make sure you have **Node.js (v18+)** and npm installed. Then run:

```bash
npm install
```

### 3. Run the Server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## Website Utilisation

### Task 3

#### Submit Query

Type in an item ID {`001`, `002`, `003`, `004`} and press the button to submit the query. The query is signed by multiple nodes, then a consensus is run.

### Task 4

#### Encrypt the Query

Press the button to encrypt the query with the Procurement Officer's public key. This occurs on the Server's Side.

> [!TIP]
> To view computations, scroll down to see the action logs.

#### Decrypt the Query

Press the button to decrypt the query with the Procurement Officer's private key. This occurs on the officer's Side.

---

## Project Structure

```bash
src/
│
├── backend/                # Computational code (RSA, Math, Signature Agggregation)
├── data/                   # Auto-generated JSON files that store the keys of each Inventory
└── frontend/               # Visual renderer
```

---

## Dependencies

| Package | Description |
| --- | --- |
| `Express js` | Web framework for Node.js |

---

## Team Info

Bodene Downie | s3575564
Noah Bakr | s4095646