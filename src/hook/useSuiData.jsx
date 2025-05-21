import { useQuery } from "@tanstack/react-query"
import { suiService } from "../service/suiService"
import { useQueryClient } from "@tanstack/react-query"

/**
 * @constant SUI_ADDRESS
 * @description The SUI address used to fetch blob data. This is a fixed address for the application's data source.
 */
const SUI_ADDRESS = "0x18a4c45a96c15d62b82b341f18738125bf875fee86057d88589a183700601a1c"

/**
 * @constant BLOB_TYPE
 * @description The SUI type string for a Blob object. Used for identifying blob objects on the SUI network.
 * Currently, this constant is defined but not actively used in the hook's logic. It might be intended for future type checking or filtering.
 */
const BLOB_TYPE = "0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77::blob::Blob"

/**
 * @function useSuiData
 * @description Custom React hook to fetch and manage SUI data, including blobs, their dynamic fields, and associated metadata.
 * It uses `@tanstack/react-query` for data fetching, caching, and synchronization.
 * The hook sequentially fetches blobs, then their dynamic fields, and finally the metadata for each field.
 * It provides loading states for each step, an aggregated loading state, error handling for blob fetching,
 * the fetched data, the SUI address used, and a refetch function to manually trigger data reloading.
 *
 * @returns {object} An object containing:
 * @property {Array<object>} blobs - An array of blob objects fetched from the SUI network. Defaults to an empty array.
 * @property {Array<Array<object>>} dynamicFields - An array of arrays, where each inner array contains dynamic field objects for a corresponding blob. Defaults to an empty array.
 * @property {Array<object>} metadata - An array of metadata objects, where each object corresponds to a dynamic field. Defaults to an empty array.
 * @property {boolean} isLoadingBlobs - True if blobs are currently being fetched, false otherwise.
 * @property {boolean} isLoadingFields - True if dynamic fields are currently being fetched, false otherwise.
 * @property {boolean} isLoadingMetadata - True if metadata is currently being fetched, false otherwise.
 * @property {boolean} isLoading - True if any of the data (blobs, fields, metadata) is currently being fetched, false otherwise.
 * @property {Error|null} blobsError - An error object if fetching blobs failed, null otherwise.
 * @property {string} address - The SUI address (`SUI_ADDRESS`) from which data is fetched.
 * @property {Function} refetch - A function to manually refetch all data (blobs, dynamic fields, and metadata). Returns a promise that resolves when all refetches are complete.
 */
export const useSuiData = () => {
  const queryClient = useQueryClient()

  // First useQuery call: Fetches initial blob objects from the SUI network using a predefined SUI_ADDRESS.
  // These blobs are the top-level objects from which further data (dynamic fields, metadata) will be derived.
  const { 
    data: blobs = [], 
    isLoading: isLoadingBlobs,
    error: blobsError 
  } = useQuery({
    queryKey: ["blobs", SUI_ADDRESS], // Unique key for this query, includes the address to ensure data is refetched if the address changes (though it's constant here).
    queryFn: () => suiService.getBlobs(SUI_ADDRESS), // Function that performs the actual data fetching.
  })

  // Second useQuery call: Fetches dynamic fields for each blob obtained in the previous step.
  // This query is dependent on the successful fetching of blobs and will only run if blobs are available.
  // It maps over the blobs and calls `suiService.getDynamicFields` for each blob's objectId.
  const { 
    data: dynamicFields = [], 
    isLoading: isLoadingFields 
  } = useQuery({
    queryKey: [
      "dynamicFields",
      blobs.map((blob) => blob.data?.objectId).filter(Boolean),
    ],
    queryFn: async () => {
      if (!blobs || blobs.length === 0) return []
      
      const fieldsPromises = blobs
        .filter((blob) => blob.data?.objectId)
        .map((blob) => suiService.getDynamicFields(blob.data.objectId))
      
      return Promise.all(fieldsPromises)
    },
    enabled: blobs.length > 0, // This query is enabled only when there are blobs available to process.
  })

  // Third useQuery call: Fetches metadata for each dynamic field obtained in the previous step.
  // This query is dependent on the successful fetching of dynamic fields and will only run if dynamic fields are available.
  // It flattens the `dynamicFields` array and calls `suiService.getMetadata` for each field's objectId.
  const { 
    data: metadata = [], 
    isLoading: isLoadingMetadata 
  } = useQuery({
    queryKey: [
      "metadata",
      dynamicFields.flatMap((fields) => fields?.map((field) => field.objectId) || []),
    ],
    queryFn: async () => {
      if (!dynamicFields || dynamicFields.length === 0) return []
      
      const metadataPromises = dynamicFields.flatMap((fields) =>
        (fields || []).map((field) => {
          return suiService.getMetadata(
            field.objectId,
            field.parentId || "",
          )
        }),
      )
      
      const result = await Promise.all(metadataPromises)
      return result
    },
    enabled: dynamicFields.length > 0, // This query is enabled only when there are dynamic fields available to process.
  })

  return {
    blobs,
    dynamicFields,
    metadata,
    isLoadingBlobs,
    isLoadingFields,
    isLoadingMetadata,
    isLoading: isLoadingBlobs || isLoadingFields || isLoadingMetadata, // Aggregated loading state.
    blobsError, // Error state specifically for blob fetching.
    address: SUI_ADDRESS, // The address used for fetching data.
    // Refetch function: Invalidates the caches for blobs, dynamicFields, and metadata queries,
    // triggering a fresh fetch for all data.
    refetch: () => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["blobs", SUI_ADDRESS],
        }),
        queryClient.invalidateQueries({ queryKey: ["dynamicFields"] }), // Invalidate by query key prefix
        queryClient.invalidateQueries({ queryKey: ["metadata"] }),      // Invalidate by query key prefix
      ])
    }
  }
}
