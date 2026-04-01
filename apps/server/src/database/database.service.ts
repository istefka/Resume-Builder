import { Injectable } from "@nestjs/common";
import type { Firestore } from "firebase-admin/firestore";

import { FirebaseService } from "../firebase/firebase.service";

@Injectable()
export class DatabaseService {
  private db: Firestore;

  constructor(private readonly firebaseService: FirebaseService) {
    this.db = this.firebaseService.getFirestore();
  }

  get users() {
    return this.db.collection("users");
  }

  get secrets() {
    return this.db.collection("secrets");
  }

  get resumes() {
    return this.db.collection("resumes");
  }

  get statistics() {
    return this.db.collection("statistics");
  }

  getFirestore(): Firestore {
    return this.db;
  }
}
