// Function to transform metadata from SUI to a structured project object
export const transformMetadataToProject = (metadata: any, index: number) => {
  if (!metadata?.content?.fields?.value?.fields?.metadata?.fields?.contents) {
    return null;
  }

  const metadataContents = metadata.content.fields.value.fields.metadata.fields.contents;
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
