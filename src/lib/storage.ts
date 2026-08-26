export type StorageObject = {
  key: string;
  url?: string;
};

import "server-only";

export interface ArtworkStorage {
  createUploadTarget(input: { fileName: string; contentType: string }): Promise<StorageObject>;
}

export const artworkStorage: ArtworkStorage = {
  async createUploadTarget(input) {
    return { key: `artworks/${crypto.randomUUID()}-${input.fileName}` };
  },
};
