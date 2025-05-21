import { useQuery } from "@tanstack/react-query"
import { suiService } from "../service/suiService"
import { useQueryClient } from "@tanstack/react-query"

// Constant address value
const SUI_ADDRESS = "0x18a4c45a96c15d62b82b341f18738125bf875fee86057d88589a183700601a1c"
const BLOB_TYPE = "0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77::blob::Blob"

export const useSuiData = () => {
  const queryClient = useQueryClient()

  // Fetch blobs using the constant address
  const { 
    data: blobs = [], 
    isLoading: isLoadingBlobs,
    error: blobsError 
  } = useQuery({
    queryKey: ["blobs", SUI_ADDRESS],
    queryFn: () => suiService.getBlobs(SUI_ADDRESS),
  })

  // Fetch dynamic fields for each blob
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
    enabled: blobs.length > 0,
  })

  // Fetch metadata for each dynamic field
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
    enabled: dynamicFields.length > 0,
  })

  return {
    blobs,
    dynamicFields,
    metadata,
    isLoadingBlobs,
    isLoadingFields,
    isLoadingMetadata,
    isLoading: isLoadingBlobs || isLoadingFields || isLoadingMetadata,
    blobsError,
    address: SUI_ADDRESS,
    refetch: () => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["blobs", SUI_ADDRESS],
        }),
        queryClient.invalidateQueries({ queryKey: ["dynamicFields"] }),
        queryClient.invalidateQueries({ queryKey: ["metadata"] }),
      ])
    }
  }
}
