import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

/**
 * @constant SUI_NETWORK
 * @description Specifies the SUI network to connect to (e.g., "mainnet", "testnet", "devnet").
 * Currently set to "mainnet". This constant is used in the constructor to configure the SuiClient.
 */
const SUI_NETWORK = "mainnet";

/**
 * @constant BLOB_TYPE
 * @description The SUI type string for a Blob object. This is used to filter objects owned by an address
 * to specifically target Blob objects during the `getBlobs` method call.
 */
const BLOB_TYPE =
  "0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77::blob::Blob";

/**
 * @class SuiService
 * @description Provides methods to interact with the SUI blockchain.
 * This service handles fetching SUI objects like Blobs, their dynamic fields, and associated metadata.
 * It includes error handling and input validation for robustness.
 */
class SuiService {
  /**
   * @constructor
   * @description Initializes a new instance of the SuiService.
   * It creates a `SuiClient` configured to connect to the SUI network specified by `SUI_NETWORK` (currently "mainnet").
   */
  constructor() {
    this.client = new SuiClient({
      url: getFullnodeUrl(SUI_NETWORK),
    });
  }

  /**
   * Fetches all Blob objects owned by a given SUI address.
   * It handles pagination automatically to retrieve all blobs if they exceed the single request limit.
   * @async
   * @param {string} address - The SUI address of the owner. Must start with "0x".
   * @returns {Promise<Array<object>>} A promise that resolves to an array of Blob objects.
   * Each object contains data about the blob.
   * @throws {Error} If the address format is invalid or if an error occurs during the API request.
   * The error is logged to the console, and then re-thrown.
   */
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

  /**
   * Fetches all dynamic fields associated with a given parent object ID (blobId).
   * It handles pagination automatically to retrieve all dynamic fields.
   * Each dynamic field object is augmented with a `parentId` property, referencing the `blobId`.
   * @async
   * @param {string} blobId - The object ID of the parent object (e.g., a Blob). Must start with "0x".
   * @returns {Promise<Array<object>>} A promise that resolves to an array of dynamic field objects.
   * Each object includes details of the dynamic field and a `parentId`.
   * @throws {Error} If the blobId format is invalid or if an error occurs during the API request.
   * The error is logged to the console, and then re-thrown.
   */
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

  /**
   * Fetches the object details (metadata) for a given object ID.
   * The response data is augmented with a `parentId` property.
   * @async
   * @param {string} objectId - The ID of the SUI object to fetch. Must start with "0x".
   * @param {string} [parentId=""] - An optional parent ID to associate with the fetched metadata. Defaults to an empty string.
   * @returns {Promise<object|null>} A promise that resolves to the object's data including the `parentId`,
   * or `null` if the response data is not present.
   * @throws {Error} If the objectId format is invalid or if an error occurs during the API request.
   * The error is logged to the console, and then re-thrown.
   */
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
/**
 * @description An instance of the SuiService class, exported for use throughout the application.
 * This singleton pattern ensures that all parts of the application use the same SuiService instance,
 * sharing the same SuiClient and connection.
 */
export const suiService = new SuiService();
