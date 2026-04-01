import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import { readFileSync } from "fs";

import type { Config } from "../config/schema";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App;

  constructor(private readonly configService: ConfigService<Config>) {}

  onModuleInit() {
    const serviceAccountPath = this.configService.get("FIREBASE_SERVICE_ACCOUNT_PATH");

    if (!serviceAccountPath) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH is not set");
    }

    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: serviceAccount.project_id + ".appspot.com",
      });
    } catch (error) {
      console.warn("Failed to initialize Firebase Admin SDK:", error);
    }
  }

  getApp(): admin.app.App {
    return this.app;
  }

  getAuth(): admin.auth.Auth {
    return admin.auth(this.app);
  }

  getFirestore(): admin.firestore.Firestore {
    return admin.firestore(this.app);
  }

  getStorage(): admin.storage.Storage {
    return admin.storage(this.app);
  }
}
