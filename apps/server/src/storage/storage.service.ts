import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createId } from "@paralleldrive/cuid2";
import slugify from "@sindresorhus/slugify";
import sharp from "sharp";

import { Config } from "../config/schema";
import { FirebaseService } from "../firebase/firebase.service";

type ImageUploadType = "pictures" | "previews";
type DocumentUploadType = "resumes";
export type UploadType = ImageUploadType | DocumentUploadType;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly firebaseService: FirebaseService,
  ) {}

  async onModuleInit() {
    try {
      const storage = this.firebaseService.getStorage();
      const bucket = storage.bucket();

      this.logger.log("Successfully connected to Firebase Storage.");
      this.logger.log(`Using bucket: ${bucket.name}`);
    } catch (error) {
      this.logger.error("Failed to connect to Firebase Storage:", error);
    }
  }

  async bucketExists(): Promise<true> {
    try {
      const storage = this.firebaseService.getStorage();
      const bucket = storage.bucket();
      const [exists] = await bucket.exists();

      if (!exists) {
        throw new InternalServerErrorException("Firebase Storage bucket does not exist.");
      }

      return true;
    } catch (error) {
      throw new InternalServerErrorException(
        "There was an error while checking if the storage bucket exists.",
      );
    }
  }

  async uploadObject(
    userId: string,
    type: UploadType,
    buffer: Buffer,
    filename: string = createId(),
  ): Promise<string> {
    const extension = type === "resumes" ? "pdf" : "jpg";
    const storageUrl = this.configService.getOrThrow<string>("STORAGE_URL");

    let normalizedFilename = slugify(filename);
    if (!normalizedFilename) normalizedFilename = createId();

    const filepath = `${userId}/${type}/${normalizedFilename}.${extension}`;

    const metadata: Record<string, string> = {};

    if (extension === "jpg") {
      metadata.contentType = "image/jpeg";
    } else {
      metadata.contentType = "application/pdf";
      metadata.contentDisposition = `attachment; filename=${normalizedFilename}.${extension}`;
    }

    try {
      if (extension === "jpg") {
        buffer = await sharp(buffer)
          .resize({ width: 600, height: 600, fit: sharp.fit.outside })
          .jpeg({ quality: 80 })
          .toBuffer();
      }

      const storage = this.firebaseService.getStorage();
      const bucket = storage.bucket();
      const file = bucket.file(filepath);

      await file.save(buffer, {
        metadata,
        public: true,
      });

      const url = `${storageUrl}/v0/b/${bucket.name}/o/${encodeURIComponent(filepath)}?alt=media`;

      return url;
    } catch (error) {
      this.logger.error("Error uploading file:", error);
      throw new InternalServerErrorException("There was an error while uploading the file.");
    }
  }

  async deleteObject(userId: string, type: UploadType, filename: string): Promise<void> {
    const extension = type === "resumes" ? "pdf" : "jpg";
    const filepath = `${userId}/${type}/${filename}.${extension}`;

    try {
      const storage = this.firebaseService.getStorage();
      const bucket = storage.bucket();
      const file = bucket.file(filepath);

      await file.delete();
    } catch (error) {
      this.logger.error(`Error deleting file at ${filepath}:`, error);
      throw new InternalServerErrorException(
        `There was an error while deleting the document at the specified path: ${filepath}.`,
      );
    }
  }

  async deleteFolder(prefix: string): Promise<void> {
    try {
      const storage = this.firebaseService.getStorage();
      const bucket = storage.bucket();

      const [files] = await bucket.getFiles({ prefix });

      await Promise.all(files.map((file) => file.delete()));

      this.logger.log(`Deleted folder: ${prefix}`);
    } catch (error) {
      this.logger.error(`Error deleting folder at ${prefix}:`, error);
      throw new InternalServerErrorException(
        `There was an error while deleting the folder at the specified path: ${prefix}.`,
      );
    }
  }
}
