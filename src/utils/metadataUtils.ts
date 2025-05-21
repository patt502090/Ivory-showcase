/**
 * @file metadataUtils.ts
 * @description Utility functions for transforming SUI metadata into structured project objects.
 */

/**
 * Transforms raw SUI metadata into a structured project object.
 *
 * This function takes a metadata object (typically fetched from the SUI network) and an index,
 * then extracts relevant information to create a more usable project data structure.
 * It performs several key operations:
 * 1. **Data Extraction**: Navigates through the nested structure of the SUI metadata to find the actual content fields.
 * 2. **Basic Information**: Sets up initial project data including `id` (from the provided index), `parentId`, and `blobId` (from the metadata object).
 * 3. **Field Parsing**: Iterates over the `contents` array within the metadata. For each entry:
 *    - Extracts the `key` and `value`.
 *    - **Date Parsing**: If the key is "startDate", "expiredDate", or "end_date", it attempts to parse the value into an ISO string date format.
 *      - It specifically tracks `expiredDate` and `end_date` to check for project expiry.
 *    - **Number Parsing**: If the key is "status", "epochs", or "ownership", it parses the value into an integer.
 *    - **Boolean Parsing**: If the key is "isBuild", it converts the string "true" into a boolean `true`.
 *    - Assigns the processed key-value pair to the `projectData` object.
 * 4. **Expiration Check**:
 *    - Compares the current date with `expiredDate` or `end_date` (if available).
 *    - If the project is found to be expired based on either of these dates, it logs a message to the console and returns `null`.
 *      This effectively filters out expired projects from further processing.
 * 5. **Return Value**: If the metadata is valid and the project is not expired, it returns the structured `projectData` object.
 *    If the initial metadata structure is invalid or missing essential parts, it returns `null`.
 *
 * @param {any} metadata - The raw metadata object obtained from SUI. This object is expected to have a specific nested structure
 *                         (e.g., `metadata.content.fields.value.fields.metadata.fields.contents`).
 * @param {number} index - An index number, typically used to assign a unique ID to the transformed project.
 * @returns {object | null} A structured project object containing extracted and parsed data,
 *                          or `null` if the metadata is invalid, incomplete, or the project is expired.
 */
export const transformMetadataToProject = (metadata: any, index: number) => {
  // Validate the expected structure of the metadata object.
  // If the required 'contents' field is not found, return null early.
  if (!metadata?.content?.fields?.value?.fields?.metadata?.fields?.contents) {
    console.warn("Invalid or incomplete metadata structure:", metadata);
    return null;
  }

  const metadataContents = metadata.content.fields.value.fields.metadata.fields.contents;
  // Initialize the projectData object with basic identifiers.
  const projectData: any = {
    id: index,
    parentId: metadata.parentId || "",
    blobId: metadata.objectId || "",
  };

  let expiredDate: string | null = null;
  let endDate: string | null = null;

  // Extract fields from metadata contents
  metadataContents.forEach((entry: any) => {
    if (entry.fields?.key && entry.fields?.value) {
      const key = entry.fields.key;
      let value = entry.fields.value;
      
      // Parse dates
      if (key === "startDate" || key === "expiredDate" || key === "end_date") {
        try {
          value = new Date(value).toISOString();
          // Store expiration dates for later check
          if (key === "expiredDate") {
            expiredDate = value;
          } else if (key === "end_date") {
            endDate = value;
          }
        } catch (e) {
          console.error("Error parsing date:", e);
        }
      }
      
      // Parse numbers
      if (key === "status" || key === "epochs" || key === "ownership") {
        value = parseInt(value, 10);
      }
      
      // Parse boolean
      if (key === "isBuild") {
        value = value === "true";
      }
      
      projectData[key] = value;
    }
  });

  // Check if project is expired (using either expiredDate or end_date)
  const now = new Date();
  const isExpiredByExpiredDate = expiredDate && new Date(expiredDate) < now;
  const isExpiredByEndDate = endDate && new Date(endDate) < now;
  
  if (isExpiredByExpiredDate || isExpiredByEndDate) {
    const expiryDate = isExpiredByExpiredDate ? expiredDate : endDate;
    console.log(`Project ${projectData["site-name"]} is expired. Expiry date: ${expiryDate}`);
    return null; // Return null for expired projects
  }

  return projectData;
};
