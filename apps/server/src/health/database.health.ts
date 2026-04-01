import { Injectable } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";

import { DatabaseService } from "../database/database.service";

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      const db = this.database.getFirestore();
      await db.listCollections();

      return this.getStatus("database", true);
    } catch (error) {
      return this.getStatus("database", false, { message: error.message });
    }
  }
}
