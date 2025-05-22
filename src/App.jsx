import { useState, useMemo } from "react";
import { useSuiData } from "./hook/useSuiData";
import { transformMetadataToProject } from "./utils/metadataUtils";
import { Helmet } from "react-helmet";
import "./App.css";

/**
 * @file App.jsx
 * @description Main application component for the SUI projects showcase.
 * Fetches and displays SUI projects with filtering, pagination, and search functionality.
 */

/**
 * Main application component.
 * Renders the project showcase UI, including search, filtering, and pagination.
 * @returns {JSX.Element} The rendered App component.
 */
function App() {
  // State for search term input
  const [searchTerm, setSearchTerm] = useState("");
  // State for search type (all, name, owner)
  const [searchType, setSearchType] = useState("all"); // all, name, owner
  // State for current page number
  const [currentPage, setCurrentPage] = useState(1);
  // Number of projects to display per page
  const projectsPerPage = 6; // Show more on desktop, will adjust with CSS grid

  // Use the SUI data hook
  const {
    blobsLoading,
    blobsError,
    metadata,
    isLoadingFields,
    isLoadingMetadata,
    refetch,
  } = useSuiData();

  // Effect hook to log metadata when it changes. Used for debugging purposes.
  // Memoized hook to transform raw metadata into project objects.
  // This transformation is computationally expensive, so useMemo prevents re-computation on every render
  // unless the `metadata` dependency changes.
  const allProjects = useMemo(() => {
    return metadata
      ? metadata
          .map((meta, index) => transformMetadataToProject(meta, index))
          .filter(Boolean)
      : [];
  }, [metadata]);

  // Memoized hook to filter projects based on search term, search type, and showcase_url.
  // It also handles duplicate projects by keeping only unique ones based on site-name.
  // This ensures that the filtering logic is only re-executed when relevant dependencies change.
  const filteredProjects = useMemo(() => {
    // First filter by showcase_url and search term
    // Note: Expired projects are already filtered out in transformMetadataToProject
    let filtered = allProjects.filter((project) => {
      // Check if project has a showcase_url
      const hasShowcaseUrl =
        project.showcase_url && project.showcase_url.trim() !== "";

      // Check if project matches search term based on search type
      let matchesSearch = false;
      if (!searchTerm) {
        matchesSearch = true;
      } else {
        const term = searchTerm.toLowerCase();
        if (searchType === "all" || searchType === "name") {
          if (
            project["site-name"] &&
            project["site-name"].toLowerCase().includes(term)
          ) {
            matchesSearch = true;
          }
        }

        if (
          (searchType === "all" || searchType === "owner") &&
          !matchesSearch
        ) {
          if (project.owner && project.owner.toLowerCase().includes(term)) {
            matchesSearch = true;
          }
        }
      }

      return hasShowcaseUrl && matchesSearch;
    });

    // Always handle duplicates by default
    // Create a map to track unique projects by site-name
    const uniqueProjects = new Map();

    filtered.forEach((project) => {
      const projectName = project["site-name"] || "Unnamed Project";

      // If we haven't seen this project name before, or the current one has a higher quality
      // (you can define your own quality metrics)
      if (
        !uniqueProjects.has(projectName) ||
        (project.quality &&
          (!uniqueProjects.get(projectName).quality ||
            project.quality > uniqueProjects.get(projectName).quality))
      ) {
        uniqueProjects.set(projectName, project);
      }
    });

    // Convert map back to array
    filtered = Array.from(uniqueProjects.values());

    return filtered;
  }, [allProjects, searchTerm, searchType]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);

  // Memoized hook to get the projects for the current page.
  // This depends on the `filteredProjects`, `currentPage`, and `projectsPerPage`.
  // useMemo optimizes performance by only recalculating when these dependencies change.
  const currentProjects = useMemo(() => {
    const indexOfLastProject = currentPage * projectsPerPage;
    const indexOfFirstProject = indexOfLastProject - projectsPerPage;
    return filteredProjects.slice(indexOfFirstProject, indexOfLastProject);
  }, [filteredProjects, currentPage, projectsPerPage]);

  /**
   * Function to change the current page.
   * @param {number} pageNumber - The page number to navigate to.
   */
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  /**
   * Generates a color for a project card based on its index.
   * This helps in visually distinguishing project cards.
   * @param {number} index - The index of the project.
   * @returns {string} A hex color code.
   */
  const getProjectColor = (index) => {
    const colors = [
      "#377f77", // --color-secondary-800
      "#6ecac0", // --color-secondary-600
      "#4ea49b", // --color-secondary-700
      "#98f0e4", // --color-secondary-400
      "#97f0e5", // --color-secondary-500
      "#a1f1e6", // --color-secondary-300
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="showcase-container">
      <Helmet>
        <title>Showcase | Ivory</title>
        <meta
          name="description"
          content="A pixel art showcase for SUI projects"
        />
        <meta name="theme-color" content="#377f77" />
        <link rel="icon" href="/Ivory_cliped.png" />
      </Helmet>
      <main className="main-content">
        <div className="app-header">
          <h1 className="app-title">IVORY</h1>
        </div>

        <div className="search-container">
          <div className="search-input-wrapper">
            <div className="search-input-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by project name or address"
                className="search-input"
              />
              <svg
                className="search-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <div className="search-options">
              <div className="search-type-selector">
                <label className="search-option-label">Search in:</label>
                <div className="search-type-buttons">
                  <button
                    className={`search-type-button ${
                      searchType === "all" ? "active" : ""
                    }`}
                    onClick={() => setSearchType("all")}
                  >
                    All
                  </button>
                  <button
                    className={`search-type-button ${
                      searchType === "name" ? "active" : ""
                    }`}
                    onClick={() => setSearchType("name")}
                  >
                    Name
                  </button>
                  <button
                    className={`search-type-button ${
                      searchType === "owner" ? "active" : ""
                    }`}
                    onClick={() => setSearchType("owner")}
                  >
                    Owner
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button onClick={() => refetch()} className="refresh-button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
            Refresh
          </button>
        </div>

        <div className="projects-section">
          <div className="projects-header">
            <h2>Showcase Projects</h2>
            <span className="projects-count">
              {filteredProjects.length} projects
            </span>
          </div>

          {blobsLoading || isLoadingFields || isLoadingMetadata ? (
            <div className="loading">
              <div className="loading-content">
                <div className="loading-spinner"></div>
                <p>Loading projects...</p>
              </div>
            </div>
          ) : blobsError ? (
            <div className="error">
              <div className="error-content">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p>Error: {blobsError.message}</p>
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="empty">
              <div className="empty-content">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <p>No projects with showcase URL found</p>
              </div>
            </div>
          ) : (
            <>
              <div className="projects-grid">
                {currentProjects.map((project, index) => (
                  <div key={project.id} className="project-card">
                    <a
                      href={`https://kursui.wal.app/${project.showcase_url}/index.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div
                        className="card-header"
                        style={{ backgroundColor: getProjectColor(index) }}
                      >
                        <h3 className="project-name">
                          {project["site-name"] || "Unnamed Project"}
                        </h3>
                      </div>
                      <div className="card-content">
                        <div className="project-owner">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p>Owner: {formatAddress(project.owner)}</p>
                        </div>
                        <div className="view-project">
                          <span>
                            View Project
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </a>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-button prev-button"
                  >
                    <span className="sr-only">Previous</span>
                    <svg
                      width="20"
                      height="20"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  <div className="page-numbers">
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => paginate(index + 1)}
                        className={`pagination-button ${
                          currentPage === index + 1 ? "active" : ""
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-button next-button"
                  >
                    <span className="sr-only">Next</span>
                    <svg
                      width="20"
                      height="20"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer>
        <div className="footer-content">
          <p className="project-name-footer">IVORY PROJECT</p>
          <p className="copyright">© {new Date().getFullYear()} Showcase</p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Formats a SUI address to a shorter, more readable version.
 * It displays the first 6 characters and the last 4 characters of the address.
 * @param {string} address - The SUI address to format.
 * @returns {string} The formatted address, or an empty string if the input is invalid.
 */
function formatAddress(address) {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
}

export default App;
