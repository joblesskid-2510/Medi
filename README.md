# MediBox

MediBox is a role-based healthcare web app built with React, Vite, Firebase, and Firestore.

## Features

- Role-based flows for `patient`, `doctor`, `caretaker`, and `admin`
- Authentication with Firebase Auth
- Firestore-backed data for users, medicine logs, prescriptions, appointments, calls, and vitals
- Face verification support via `face-api.js`
- Video clip upload support via Cloudinary
- Firebase Hosting deployment config included

## Tech Stack

- React 18
- Vite 6
- Firebase (`auth`, `firestore`)
- React Router DOM
- Lucide React
- face-api.js

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run locally

```bash
npm run dev
```

App runs on `http://localhost:5173` by default.

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## Firebase Hosting

This project is configured for Firebase Hosting:

- `firebase.json` serves from `dist`
- SPA rewrite is enabled (`** -> /index.html`)
- Default Firebase project is set in `.firebaserc`

Typical deploy flow:

```bash
npm run build
firebase deploy
```

## Project Structure

```text
src/
  components/
  context/
  pages/
    admin/
    doctor/
    patient/
  utils/
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run preview` - preview production build locally
