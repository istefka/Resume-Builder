# Firebase Migration Guide for Reactive Resume

## Overview

This guide documents the migration from Supabase/PostgreSQL/MinIO to Firebase (Authentication + Firestore + Storage).

## ✅ Completed Steps

### 1. Dependencies
- ✅ Installed `firebase` (client SDK) and `firebase-admin` (server SDK)
- ✅ Removed `@prisma/client`, `prisma`, `nestjs-prisma`, `nestjs-minio-client`, and `minio`
- ✅ Updated `package.json` scripts to remove Prisma-related commands

### 2. Environment Configuration
- ✅ Updated `.env` file with Firebase configuration variables:
  - Frontend: `VITE_FIREBASE_*` variables for client SDK
  - Backend: `FIREBASE_SERVICE_ACCOUNT_PATH` for Admin SDK
- ✅ Created template `firebase-service-account.json` file
- ✅ Updated `apps/server/src/config/schema.ts` to use Firebase instead of database/storage URLs

### 3. Backend Infrastructure
- ✅ Created `apps/server/src/firebase/firebase.module.ts` and `firebase.service.ts`
- ✅ Replaced `DatabaseModule` with Firebase-aware version
- ✅ Updated `StorageService` to use Firebase Storage instead of MinIO
- ✅ Updated `app.module.ts` to import Firebase and Database modules

### 4. Frontend Configuration
- ✅ Created `apps/client/src/libs/firebase.ts` with Firebase client initialization

## ⚠️ Remaining Work

The following files still reference Prisma and need to be updated to use Firestore:

### Files with Prisma References:
1. `apps/server/src/auth/auth.service.ts`
2. `apps/server/src/health/database.health.ts`
3. `apps/server/src/resume/resume.controller.ts`
4. `apps/server/src/resume/resume.service.ts`
5. `apps/server/src/user/user.controller.ts`
6. `apps/server/src/user/user.service.ts`

### Required Changes:

#### Authentication Service
- Replace Prisma User model queries with Firestore queries
- Update user creation, lookup, and authentication logic
- Use Firebase Authentication for password hashing and verification

#### Resume Service
- Convert Prisma queries to Firestore document operations
- Update CRUD operations for resumes collection
- Maintain relationships using Firestore document references

#### User Service
- Replace all Prisma user operations with Firestore
- Update user profile management
- Handle user secrets in Firestore

#### Health Checks
- Remove or replace `database.health.ts` Prisma health check
- Add Firebase/Firestore connectivity check

## 🔧 Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - **Authentication** (Email/Password provider)
   - **Firestore Database**
   - **Storage**

### 2. Get Firebase Configuration

#### For Frontend (Web App):
1. Go to Project Settings → General
2. Scroll to "Your apps" and click "Web" icon
3. Register your app
4. Copy the config object values to your `.env` file:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

#### For Backend (Admin SDK):
1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-service-account.json` in the project root
4. Update `.env` to point to this file (already configured)

### 3. Firestore Database Structure

Create the following collections in Firestore:

```
users/
  {userId}/
    - id: string
    - name: string
    - picture: string | null
    - username: string (indexed)
    - email: string (indexed)
    - locale: string
    - emailVerified: boolean
    - twoFactorEnabled: boolean
    - createdAt: timestamp
    - updatedAt: timestamp
    - provider: string (email|github|google|openid)

secrets/
  {secretId}/
    - id: string
    - userId: string (indexed)
    - password: string | null
    - lastSignedIn: timestamp
    - verificationToken: string | null
    - twoFactorSecret: string | null
    - twoFactorBackupCodes: array
    - refreshToken: string | null
    - resetToken: string | null (indexed)

resumes/
  {resumeId}/
    - id: string
    - userId: string (indexed)
    - title: string
    - slug: string
    - data: object
    - visibility: string (public|private)
    - locked: boolean
    - createdAt: timestamp
    - updatedAt: timestamp

statistics/
  {statId}/
    - id: string
    - resumeId: string (indexed)
    - views: number
    - downloads: number
    - createdAt: timestamp
    - updatedAt: timestamp
```

### 4. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create, update: if isOwner(userId);
      allow delete: if false; // Prevent deletion
    }

    // Secrets collection
    match /secrets/{secretId} {
      allow read, write: if isAuthenticated()
        && get(/databases/$(database)/documents/secrets/$(secretId)).data.userId == request.auth.uid;
    }

    // Resumes collection
    match /resumes/{resumeId} {
      allow read: if resource.data.visibility == 'public'
        || isOwner(resource.data.userId);
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.userId);
    }

    // Statistics collection
    match /statistics/{statId} {
      allow read: if true; // Public read for view/download counts
      allow write: if isAuthenticated();
    }
  }
}
```

### 5. Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User profile pictures
    match /{userId}/pictures/{filename} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Resume previews
    match /{userId}/previews/{filename} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Resume PDFs
    match /{userId}/resumes/{filename} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📝 Next Steps

1. **Complete the migration** by updating all services to use Firestore instead of Prisma
2. **Test authentication** flow with Firebase Auth
3. **Migrate data** if you have existing data (not needed for fresh setup)
4. **Update tests** to mock Firebase services instead of Prisma

## 🔍 Migration Example

Here's an example of how to convert a Prisma query to Firestore:

### Before (Prisma):
```typescript
const user = await this.prisma.user.findUnique({
  where: { email },
  include: { secrets: true }
});
```

### After (Firestore):
```typescript
const usersRef = this.db.collection('users');
const snapshot = await usersRef.where('email', '==', email).limit(1).get();

if (snapshot.empty) {
  return null;
}

const userDoc = snapshot.docs[0];
const userData = { id: userDoc.id, ...userDoc.data() };

// Fetch related secrets
const secretsSnapshot = await this.db.collection('secrets')
  .where('userId', '==', userDoc.id)
  .get();

const secrets = secretsSnapshot.docs[0]?.data() || null;

return { ...userData, secrets };
```

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Client SDK](https://firebase.google.com/docs/web/setup)
