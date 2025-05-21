import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

const SUI_NETWORK = "mainnet";
const BLOB_TYPE =
  "0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77::blob::Blob";

class SuiService {
  constructor() {
    this.client = new SuiClient({
      url: getFullnodeUrl("mainnet"),
    });
  }

  async getBlobs(address) {
    try {
      // Validate address format
      if (!address || !address.startsWith("0x")) {
        throw new Error("Invalid address format. Address must start with 0x");
      }

      // Setup pagination variables
      let allData = [];
      let cursor = null;
      let hasNextPage = true;

      // Fetch all pages using while loop
      while (hasNextPage) {
        const response = await this.client.getOwnedObjects({
          owner: address,
          filter: {
            MatchAny: [
              {
                StructType: BLOB_TYPE,
              },
            ],
          },
          options: { showContent: true },
          limit: 50,
          cursor: cursor,
        });

        // Add this page of data to our result array
        if (response?.data && response.data.length > 0) {
          allData = [...allData, ...response.data];
        }

        // Update pagination variables
        hasNextPage = response?.hasNextPage || false;
        cursor = response?.nextCursor || null;
      }

      // Return all the data
      return allData;
    } catch (error) {
      console.error("Error fetching blobs:", error);
      throw error;
    }
  }

  async getDynamicFields(blobId) {
    try {
      if (!blobId || !blobId.startsWith("0x")) {
        throw new Error("Invalid blobId format. BlobId must start with 0x");
      }

      // Setup pagination variables
      let allData = [];
      let cursor = null;
      let hasNextPage = true;

      // Fetch all pages using while loop
      while (hasNextPage) {
        const response = await this.client.getDynamicFields({
          parentId: blobId,
          limit: 50,
          cursor: cursor,
        });

        // Add this page of data to our result array with the parentId reference
        if (response?.data && response.data.length > 0) {
          const fieldsWithParent = response.data.map((field) => ({
            ...field,
            parentId: blobId,
          }));

          allData = [...allData, ...fieldsWithParent];
        }

        // Update pagination variables
        hasNextPage = response?.hasNextPage || false;
        cursor = response?.nextCursor || null;
      }

      return allData;
    } catch (error) {
      console.error("Error fetching dynamic fields:", error);
      throw error;
    }
  }

  async getMetadata(objectId, parentId) {
    try {
      if (!objectId || !objectId.startsWith("0x")) {
        throw new Error("Invalid objectId format. ObjectId must start with 0x");
      }

      const response = await this.client.getObject({
        id: objectId,
        options: { showContent: true },
      });

      // Add parentId to the response data
      if (response?.data) {
        return {
          ...response.data,
          parentId: parentId || "",
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching metadata:", error);
      throw error;
    }
  }
}

export const suiService = new SuiService();
