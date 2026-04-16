"use strict";
const { AbstractFileProviderService, MedusaError } = require("@medusajs/framework/utils");
const { Readable } = require("stream");
const path = require("path");

class BunnyFileService extends AbstractFileProviderService {
  constructor(_, options) {
    super();
    if (!options?.storage_zone || !options?.storage_password || !options?.storage_endpoint || !options?.cdn_url) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Bunny file provider requires storage_zone, storage_password, storage_endpoint, cdn_url"
      );
    }
    this.storageZone = options.storage_zone;
    this.storagePassword = options.storage_password;
    this.storageEndpoint = options.storage_endpoint.replace(/\/$/, "");
    this.cdnUrl = options.cdn_url.replace(/\/$/, "");
  }

  buildFileKey(filename) {
    const parsed = path.parse(filename);
    const safeBase = parsed.base.replace(/[^a-zA-Z0-9._-]/g, "-");
    return `${Date.now()}-${safeBase}`;
  }

  storageUrl(fileKey) {
    return `${this.storageEndpoint}/${this.storageZone}/${encodeURI(fileKey)}`;
  }

  publicUrl(fileKey) {
    return `${this.cdnUrl}/${encodeURI(fileKey)}`;
  }

  async upload(file) {
    if (!file?.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided");
    }
    const fileKey = this.buildFileKey(file.filename);
    const decoded = Buffer.from(file.content, "base64");
    const body = decoded.toString("base64") === file.content
      ? decoded
      : Buffer.from(file.content);
    const res = await fetch(this.storageUrl(fileKey), {
      method: "PUT",
      headers: {
        AccessKey: this.storagePassword,
        "Content-Type": file.mimeType || "application/octet-stream",
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Bunny upload failed (${res.status}): ${text}`
      );
    }
    return { key: fileKey, url: this.publicUrl(fileKey) };
  }

  async delete(files) {
    const arr = Array.isArray(files) ? files : [files];
    await Promise.all(
      arr.map(async (file) => {
        const res = await fetch(this.storageUrl(file.fileKey), {
          method: "DELETE",
          headers: { AccessKey: this.storagePassword },
        });
        if (!res.ok && res.status !== 404) {
          const text = await res.text().catch(() => "");
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            `Bunny delete failed (${res.status}): ${text}`
          );
        }
      })
    );
  }

  async getAsBuffer(file) {
    const res = await fetch(this.storageUrl(file.fileKey), {
      headers: { AccessKey: this.storagePassword },
    });
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Bunny download failed (${res.status})`
      );
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getPresignedDownloadUrl(file) {
    return this.publicUrl(file.fileKey);
  }

  async getDownloadStream(file) {
    const res = await fetch(this.storageUrl(file.fileKey), {
      headers: { AccessKey: this.storagePassword },
    });
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Bunny download failed (${res.status})`
      );
    }
    return Readable.fromWeb(res.body);
  }

  async getPresignedUploadUrl(fileData) {
    const fileKey = this.buildFileKey(fileData.filename);
    const backendUrl = (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "");
    return {
      url: `${backendUrl}/admin/upload-proxy?key=${encodeURIComponent(fileKey)}`,
      key: fileKey,
    };
  }
}

BunnyFileService.identifier = "bunny";

module.exports = BunnyFileService;
module.exports.BunnyFileService = BunnyFileService;
