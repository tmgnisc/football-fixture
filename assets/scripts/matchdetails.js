document.addEventListener("DOMContentLoaded", async () => {
  // Retrieve fixtureId from sessionStorage
  const fixtureId = sessionStorage.getItem("fixtureId");
  const statusElement = document.getElementById("status-message");

  // Initialize variables
  let apiFailureCount = 0;
  let isOfflineMode = false;
  let cachedFixtureDetails = null;
  let possessionChart = null;

  // Function to update status message
  function updateStatus(message, isError = false) {
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = isError ? "status-error" : "status-info";
      statusElement.style.display = "block";

      // Hide after 5 seconds unless it's an error
      if (!isError) {
        setTimeout(() => {
          statusElement.style.display = "none";
        }, 5000);
      }
    }
  }

  // Check if we have a fixtureId
  if (!fixtureId) {
    document.getElementById("matchDetails").innerHTML =
      "<h2>Match not found</h2>";
    updateStatus("No match selected. Please go back and select a match.", true);
    return;
  }

  const apiKey = "1765f4fdf1376f1afd07d94395f60134";

  // Load cached fixture details if available
  const loadCachedFixtureDetails = () => {
    const cachedData = localStorage.getItem(`fixture_${fixtureId}`);
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        console.error("Error parsing cached fixture data:", e);
        return null;
      }
    }
    return null;
  };

  // Save fixture details to cache
  const saveFixtureDetailsToCache = (details) => {
    try {
      localStorage.setItem(`fixture_${fixtureId}`, JSON.stringify(details));
    } catch (e) {
      console.error("Error saving fixture data to cache:", e);
    }
  };

  // Check network status
  function checkNetworkStatus() {
    return navigator.onLine;
  }

  // Load fallback data for when API fails
  // const loadFallbackData = () => {
  //   isOfflineMode = true;
  //   updateStatus(
  //     "⚠️ Using offline data. Some information may not be current.",
  //     true
  //   );

  //   // Create basic fallback data structure with sample statistics
  //   return {
  //     fixture: {
  //       league: { name: "League Information Unavailable", id: 39 },
  //       teams: {
  //         home: {
  //           name: "Home Team",
  //           logo: "/placeholder.svg?height=100&width=100",
  //           id: 40,
  //         },
  //         away: {
  //           name: "Away Team",
  //           logo: "/placeholder.svg?height=100&width=100",
  //           id: 41,
  //         },
  //       },
  //       fixture: {
  //         date: new Date().toISOString(),
  //         venue: { name: "Venue Information Unavailable" },
  //       },
  //     },
  //     h2h: [],
  //     stats: [
  //       {
  //         team: {
  //           name: "Home Team",
  //           logo: "/placeholder.svg?height=100&width=100",
  //         },
  //         statistics: [
  //           { type: "Ball Possession", value: "57%" },
  //           { type: "Passes", value: "498" },
  //           { type: "Shots Total", value: "12" },
  //           { type: "Shots On Target", value: "4" },
  //           { type: "Shots Off Target", value: "5" },
  //           { type: "Attacks", value: "107" },
  //           { type: "Dangerous Attacks", value: "48" },
  //           { type: "Successful Passes Percentage", value: "84%" },
  //         ],
  //       },
  //       {
  //         team: {
  //           name: "Away Team",
  //           logo: "/placeholder.svg?height=100&width=100",
  //         },
  //         statistics: [
  //           { type: "Ball Possession", value: "43%" },
  //           { type: "Passes", value: "375" },
  //           { type: "Shots Total", value: "11" },
  //           { type: "Shots On Target", value: "2" },
  //           { type: "Shots Off Target", value: "4" },
  //           { type: "Attacks", value: "94" },
  //           { type: "Dangerous Attacks", value: "48" },
  //           { type: "Successful Passes Percentage", value: "83%" },
  //         ],
  //       },
  //     ],
  //     events: [],
  //     lineups: [], // Added empty lineups array for fallback
  //     standings: null, // Added standings property
  //   };
  // };

  // Fetch fixture details from API
  async function fetchFixtureDetails(fixtureId) {
    // Log the fixture ID being requested
    console.log("Fixture ID being requested:", fixtureId);

    // First check if we're online
    if (!checkNetworkStatus()) {
      console.log("Device is offline");
      const cachedData = loadCachedFixtureDetails();
      return cachedData || loadFallbackData();
    }

    updateStatus("Fetching match details...");

    try {
      const fixtureRes = await fetch(
        `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
        {
          method: "GET",
          headers: { "x-apisports-key": apiKey },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!fixtureRes.ok) {
        throw new Error(`API request failed with status ${fixtureRes.status}`);
      }

      const fixtureData = await fixtureRes.json();
      console.log("Fixture API Response:", fixtureData);

      if (!fixtureData.response || fixtureData.response.length === 0) {
        console.error("No fixture data found");
        throw new Error("No fixture data found");
      }

      const fixture = fixtureData.response[0];
      const homeTeam = fixture.teams.home;
      const awayTeam = fixture.teams.away;
      const homeTeamId = fixture.teams.home.id;
      const awayTeamId = fixture.teams.away.id;
      const leagueId = fixture.league.id;
      const season = fixture.league.season;

      document.getElementById(
        "matchTitle"
      ).textContent = `${homeTeam.name} vs ${awayTeam.name}`;

      const endpoints = {
        h2h: `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}`,
        stats: `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
        events: `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
        lineups: `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
        standings: `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
      };

      // If this is a future match, we might need to fetch additional data
      if (
        fixture.fixture.status.short === "NS" ||
        fixture.fixture.status.short === "TBD"
      ) {
        console.log("This is a future match, fetching additional data...");

        // Get today's date and format it as YYYY-MM-DD
        const today = new Date().toISOString().split("T")[0];
        // Get date 90 days in the future
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 90);
        const futureDateStr = futureDate.toISOString().split("T")[0];

        // Add future fixtures endpoint to get more details about upcoming matches
        endpoints.futureFixtures = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&from=${today}&to=${futureDateStr}&team=${homeTeamId}`;
      }

      const responses = await Promise.all(
        Object.entries(endpoints).map(async ([key, url]) => {
          try {
            // Modify the API response logging to be more detailed
            const response = await fetch(url, {
              method: "GET",
              headers: { "x-apisports-key": apiKey },
              signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            const data = await response.json();
            console.log(`API Response for ${key}:`, {
              url: url,
              status: response.status,
              data: data,
            });
            return { key, data: data.response || [] };
          } catch (error) {
            console.error(`Error fetching ${key}:`, error);
            return { key, data: [] };
          }
        })
      );

      const apiData = responses.reduce((acc, res) => {
        if (res) acc[res.key] = res.data;
        return acc;
      }, {});

      const fixtureDetails = { fixture, ...apiData };

      // Cache the fixture details
      saveFixtureDetailsToCache(fixtureDetails);

      // Reset API failure counter on successful
      apiFailureCount = 0;
      isOfflineMode = false;

      updateStatus("✅ Match details loaded successfully");

      return fixtureDetails;
    } catch (error) {
      console.error("Error fetching fixture details:", error);

      // Increment API failure counter
      apiFailureCount++;

      // Try to load from cache first
      const cachedData = loadCachedFixtureDetails();
      if (cachedData) {
        updateStatus(
          "⚠️ Using cached match data. Some information may not be current.",
          true
        );
        return cachedData;
      }

      // If no cached data, use fallback
      return loadFallbackData();
    }
  }

  // Initialize the page with fixture details
  async function initializeMatchDetails() {
    // Try to load from cache first for immediate display
    cachedFixtureDetails = loadCachedFixtureDetails();
    if (cachedFixtureDetails) {
      renderFixtureDetails(cachedFixtureDetails);
    }

    // Then fetch fresh data
    const fixtureDetails = await fetchFixtureDetails(fixtureId);

    if (!fixtureDetails || !fixtureDetails.fixture) {
      document.getElementById("matchDetails").innerHTML =
        "<h2>Failed to load match details</h2>";
      updateStatus(
        "Failed to load match details. Please try again later.",
        true
      );
      return;
    }

    renderFixtureDetails(fixtureDetails);

    // Set up auto-refresh for live matches
    const matchStatus = fixtureDetails.fixture.fixture.status?.short;
    if (matchStatus === "1H" || matchStatus === "2H" || matchStatus === "HT") {
      // It's a live match, refresh more frequently
      setInterval(() => refreshMatchDetails(), 60000); // Every minute
    } else {
      // Not live, refresh less frequently
      setInterval(() => refreshMatchDetails(), 300000); // Every 5 minutes
    }
  }

  // Refresh match details
  async function refreshMatchDetails() {
    if (!checkNetworkStatus()) {
      console.log("Device is offline, skipping refresh");
      return;
    }

    console.log("Refreshing match details...");
    const fixtureDetails = await fetchFixtureDetails(fixtureId);
    if (fixtureDetails && fixtureDetails.fixture) {
      renderFixtureDetails(fixtureDetails);
    }
  }

  // Render fixture details to the page
  function renderFixtureDetails(fixtureDetails) {
    const fixture = fixtureDetails.fixture;
    document.getElementById(
      "matchTitle"
    ).textContent = `${fixture.teams.home.name} vs ${fixture.teams.away.name}`;

    // Render match header with score and details
    renderMatchHeader(fixture);

    // Update the lineup team information
    if (fixture.teams.home && fixture.teams.away) {
      // Set team logos
      const homeTeamLogo = document.getElementById("homeTeamLogo");
      const awayTeamLogo = document.getElementById("awayTeamLogo");

      if (homeTeamLogo) homeTeamLogo.src = fixture.teams.home.logo;
      if (awayTeamLogo) awayTeamLogo.src = fixture.teams.away.logo;

      // Set team abbreviations (first 3 letters of team name)
      const homeAbbr = fixture.teams.home.name.substring(0, 3).toUpperCase();
      const awayAbbr = fixture.teams.away.name.substring(0, 3).toUpperCase();

      const homeTeamAbbr = document.getElementById("homeTeamAbbr");
      const awayTeamAbbr = document.getElementById("awayTeamAbbr");

      if (homeTeamAbbr) homeTeamAbbr.textContent = homeAbbr;
      if (awayTeamAbbr) awayTeamAbbr.textContent = awayAbbr;
    }

    // Check if this is a future match
    const isFutureMatch =
      fixture.fixture.status.short === "NS" ||
      fixture.fixture.status.short === "TBD" ||
      fixture.fixture.status.short === "SUSP" ||
      fixture.fixture.status.short === "PST" ||
      fixture.fixture.status.short === "CANC";

    // Only render statistics for matches that have been played or are in progress
    if (!isFutureMatch) {
      // Render match statistics
      renderMatchStatistics(
        fixtureDetails.stats,
        fixture.teams.home.name,
        fixture.teams.away.name
      );
    } else {
      // For future matches, show a message instead of statistics
      const statsContainer = document.querySelector(".match-stats-container");
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="stats-header">
            <h3>Match Preview</h3>
          </div>
          <div class="preview-message">
            <p>This match hasn't started yet. Statistics will be available once the match begins.</p>
            <p>Match scheduled for: ${new Date(
              fixture.fixture.date
            ).toLocaleString()}</p>
          </div>
        `;
      }
    }

    // Check if we have actual lineup data before rendering
    const hasLineupData =
      fixtureDetails.lineups && fixtureDetails.lineups.length >= 2;

    // Handle lineups section
    const lineupsContainer = document.querySelector(".lineups-container");
    if (lineupsContainer) {
      if (hasLineupData) {
        // Render lineups if available
        renderLineups(
          fixtureDetails.lineups,
          fixture.teams.home.id,
          fixture.teams.away.id
        );
      } else {
        // Show "Lineups not announced" message for future matches
        lineupsContainer.innerHTML = `
          <div class="lineups-header">
            <h3>Team Lineups</h3>
          </div>
          <div class="preview-message">
            <p>Starting lineups have not been announced yet.</p>
            <p>Lineups are typically available 1 hour before kickoff.</p>
          </div>
        `;
      }
    }

    // Render standings if available
    renderStandings(
      fixtureDetails.standings,
      fixture.teams.home.id,
      fixture.teams.away.id,
      fixture.league
    );

    // Render other match details sections
    document.getElementById("matchDetails").innerHTML = `
      ${renderHeadToHead(fixtureDetails.h2h)}
      ${!isFutureMatch ? renderEvents(fixtureDetails.events) : ""}
    `;

    // Handle stream links
    setupStreamLinks(fixtureId);

    setupH2HExpandButton();
  }

  // Render match header with score
  function renderMatchHeader(fixture) {
    const homeTeam = fixture.teams.home;
    const awayTeam = fixture.teams.away;
    const league = fixture.league;
    const date = new Date(fixture.fixture.date);
    const formattedDate = date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const status = fixture.fixture.status.short;
    // Format the score properly - show 0-0 for future matches instead of null-null
    let score = "0-0"; // Default for future matches

    if (fixture.goals.home !== null && fixture.goals.away !== null) {
      score = `${fixture.goals.home} - ${fixture.goals.away}`;
    }

    // Get goal scorers from events if available
    let goalScorers = "";
    if (fixture.events && fixture.events.length > 0) {
      const goals = fixture.events.filter((event) => event.type === "Goal");
      if (goals.length > 0) {
        goalScorers = goals
          .map((goal) => {
            return `
          <div class="goal-scorer">
            <span class="goal-time">${goal.time.elapsed}'</span>
            <span class="goal-player">${goal.player.name}</span>
          </div>
        `;
          })
          .join("");
      }
    }

    document.getElementById("matchHeaderContainer").innerHTML = `
    <!-- Breadcrumb Navigation -->
    <div class="match-breadcrumb">
      <a href="index.html" class="breadcrumb-item">Home</a>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item">${league.name}</span>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-item active">${homeTeam.name} vs ${
      awayTeam.name
    }</span>
    </div>

    <div class="match-header-enhanced">
      <div class="match-competition">
        <span class="competition-logo">
          <img src="${
            league.logo || "/placeholder.svg?height=30&width=30"
          }" alt="${league.name}" class="competition-img">
        </span>
        <span class="competition-name">${league.name}, Round ${
      league.round?.replace("Regular Season - ", "") || ""
    }</span>
      </div>
      
      <div class="match-date">${formattedDate}</div>
      
      <div class="match-teams-container">
        <div class="match-team home-team">
          <div class="team-logo-container">
            <img src="${homeTeam.logo}" alt="${
      homeTeam.name
    }" class="team-logo-large">
          </div>
          <div class="team-name-large">${homeTeam.name}</div>
        </div>
        
        <div class="match-score-container">
          <div class="match-score">${score}</div>
          <div class="match-status">${status === "FT" ? "FT" : status}</div>
        </div>
        
        <div class="match-team away-team">
          <div class="team-logo-container">
            <img src="${awayTeam.logo}" alt="${
      awayTeam.name
    }" class="team-logo-large">
          </div>
          <div class="team-name-large">${awayTeam.name}</div>
        </div>
      </div>
      
      <div class="goal-scorers-container">
        ${goalScorers}
      </div>
    </div>
  `;
  }

  // Render standings section
  function renderStandings(standingsData, homeTeamId, awayTeamId, league) {
    // Create standings container if it doesn't exist
    let standingsContainer = document.getElementById("standingsContainer");
    if (!standingsContainer) {
      standingsContainer = document.createElement("div");
      standingsContainer.id = "standingsContainer";
      standingsContainer.className = "standings-container";

      // Insert after lineups container
      const lineupsContainer = document.querySelector(".lineups-container");
      if (lineupsContainer && lineupsContainer.nextSibling) {
        lineupsContainer.parentNode.insertBefore(
          standingsContainer,
          lineupsContainer.nextSibling
        );
      } else if (lineupsContainer) {
        lineupsContainer.parentNode.appendChild(standingsContainer);
      } else {
        document
          .getElementById("matchDetails")
          .parentNode.insertBefore(
            standingsContainer,
            document.getElementById("matchDetails")
          );
      }
    }

    // If no standings data, show a message
    if (!standingsData || standingsData.length === 0) {
      standingsContainer.innerHTML = `
        <div class="standings-header">
          <h3>Standings</h3>
        </div>
        <p class="no-standings">No standings data available for this league.</p>
      `;
      return;
    }

    // Process standings data
    try {
      // Find the league standings
      const leagueStandings = standingsData[0]?.league?.standings;
      if (!leagueStandings || leagueStandings.length === 0) {
        standingsContainer.innerHTML = `
          <div class="standings-header">
            <h3>Standings</h3>
          </div>
          <p class="no-standings">No standings data available for this league.</p>
        `;
        return;
      }

      // Get the standings for the first group/conference
      const standings = leagueStandings[0];

      // Find the positions of home and away teams
      const homeTeamStanding = standings.find(
        (team) => team.team.id === homeTeamId
      );
      const awayTeamStanding = standings.find(
        (team) => team.team.id === awayTeamId
      );

      // If we can't find the teams in the standings, show a message
      if (!homeTeamStanding && !awayTeamStanding) {
        standingsContainer.innerHTML = `
          <div class="standings-header">
            <h3>Standings</h3>
          </div>
          <p class="no-standings">Team standings data not available.</p>
        `;
        return;
      }

      // Create a comparison table with both teams
      let comparisonHTML = `
        <div class="standings-header">
          <h3>Standings Comparison</h3>
        </div>
        <div class="standings-table-container">
          <table class="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th class="team-column">TEAM</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>PTS</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Add home team row
      if (homeTeamStanding) {
        comparisonHTML += `
          <tr class="team-standing home-team-standing">
            <td>${homeTeamStanding.rank}</td>
            <td class="team-column">
              <div class="team-info">
                <img src="${homeTeamStanding.team.logo}" alt="${homeTeamStanding.team.name}" class="standing-team-logo">
                <span class="standing-team-name">${homeTeamStanding.team.name}</span>
              </div>
            </td>
            <td>${homeTeamStanding.all.played}</td>
            <td>${homeTeamStanding.all.win}</td>
            <td>${homeTeamStanding.all.draw}</td>
            <td>${homeTeamStanding.all.lose}</td>
            <td class="points-column">${homeTeamStanding.points}</td>
          </tr>
        `;
      }

      // Add away team row
      if (awayTeamStanding) {
        comparisonHTML += `
          <tr class="team-standing away-team-standing">
            <td>${awayTeamStanding.rank}</td>
            <td class="team-column">
              <div class="team-info">
                <img src="${awayTeamStanding.team.logo}" alt="${awayTeamStanding.team.name}" class="standing-team-logo">
                <span class="standing-team-name">${awayTeamStanding.team.name}</span>
              </div>
            </td>
            <td>${awayTeamStanding.all.played}</td>
            <td>${awayTeamStanding.all.win}</td>
            <td>${awayTeamStanding.all.draw}</td>
            <td>${awayTeamStanding.all.lose}</td>
            <td class="points-column">${awayTeamStanding.points}</td>
          </tr>
        `;
      }

      comparisonHTML += `
            </tbody>
          </table>
        </div>
        <div class="view-full-standings">
          <button id="viewFullStandings" class="view-standings-btn">View full standings</button>
        </div>
      `;

      standingsContainer.innerHTML = comparisonHTML;

      // Add event listener to the "View full standings" button
      document
        .getElementById("viewFullStandings")
        .addEventListener("click", () => {
          showFullStandings(standings, homeTeamId, awayTeamId);
        });
    } catch (error) {
      console.error("Error rendering standings:", error);
      standingsContainer.innerHTML = `
        <div class="standings-header">
          <h3>Standings</h3>
        </div>
        <p class="no-standings">Error loading standings data.</p>
      `;
    }
  }

  // Show full standings in a modal
  function showFullStandings(standings, homeTeamId, awayTeamId) {
    // Create modal container
    const modalContainer = document.createElement("div");
    modalContainer.className = "standings-modal-container";

    // Create modal content
    let modalHTML = `
      <div class="standings-modal">
        <div class="standings-modal-header">
          <h3>Full League Standings</h3>
          <button class="close-standings-modal">×</button>
        </div>
        <div class="standings-modal-content">
          <table class="standings-table full-standings">
            <thead>
              <tr>
                <th>#</th>
                <th class="team-column">TEAM</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>PTS</th>
                <th>FORM</th>
              </tr>
            </thead>
            <tbody>
    `;

    // Add all teams
    standings.forEach((team) => {
      const isHomeTeam = team.team.id === homeTeamId;
      const isAwayTeam = team.team.id === awayTeamId;
      const rowClass = isHomeTeam
        ? "home-team-standing"
        : isAwayTeam
        ? "away-team-standing"
        : "";

      modalHTML += `
        <tr class="team-standing ${rowClass}">
          <td>${team.rank}</td>
          <td class="team-column">
            <div class="team-info">
              <img src="${team.team.logo}" alt="${
        team.team.name
      }" class="standing-team-logo">
              <span class="standing-team-name">${team.team.name}</span>
            </div>
          </td>
          <td>${team.all.played}</td>
          <td>${team.all.win}</td>
          <td>${team.all.draw}</td>
          <td>${team.all.lose}</td>
          <td>${team.all.goals.for}</td>
          <td>${team.all.goals.against}</td>
          <td>${team.goalsDiff}</td>
          <td class="points-column">${team.points}</td>
          <td class="form-column">${renderForm(team.form)}</td>
        </tr>
      `;
    });

    modalHTML += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // Add event listener to close button
    modalContainer
      .querySelector(".close-standings-modal")
      .addEventListener("click", () => {
        document.body.removeChild(modalContainer);
      });

    // Close modal when clicking outside
    modalContainer.addEventListener("click", (e) => {
      if (e.target === modalContainer) {
        document.body.removeChild(modalContainer);
      }
    });
  }

  // Render form (W, D, L) with colors
  function renderForm(formString) {
    if (!formString) return "";

    return formString
      .split("")
      .map((result) => {
        let className = "";
        if (result === "W") className = "form-win";
        else if (result === "D") className = "form-draw";
        else if (result === "L") className = "form-loss";

        return `<span class="form-result ${className}">${result}</span>`;
      })
      .join("");
  }

  // Render lineups section
  function renderLineups(lineups, homeTeamId, awayTeamId) {
    if (!lineups || lineups.length < 2) {
      console.log("No lineup data available");
      return; // Keep the existing hardcoded lineups
    }

    // Find home and away lineups
    const homeLineup = lineups.find((lineup) => lineup.team.id === homeTeamId);
    const awayLineup = lineups.find((lineup) => lineup.team.id === awayTeamId);

    if (!homeLineup || !awayLineup) {
      console.log("Missing lineup data for one or both teams");
      return; // Keep the existing hardcoded lineups
    }

    console.log("Home lineup:", homeLineup);
    console.log("Away lineup:", awayLineup);

    // Update formations
    const homeFormationEl = document.getElementById("homeTeamFormation");
    const awayFormationEl = document.getElementById("awayTeamFormation");

    if (homeFormationEl)
      homeFormationEl.textContent = homeLineup.formation || "N/A";
    if (awayFormationEl)
      awayFormationEl.textContent = awayLineup.formation || "N/A";

    // Update coach names
    const homeCoachNameEl = document.getElementById("homeCoachName");
    const awayCoachNameEl = document.getElementById("awayCoachName");

    if (homeCoachNameEl)
      homeCoachNameEl.textContent = homeLineup.coach?.name || "Unknown";
    if (awayCoachNameEl)
      awayCoachNameEl.textContent = awayLineup.coach?.name || "Unknown";

    // Update coach images (using team logos as fallback)
    const homeCoachImg = document.getElementById("homeCoachImg");
    const awayCoachImg = document.getElementById("awayCoachImg");

    if (homeCoachImg)
      homeCoachImg.src = homeLineup.coach?.photo || homeLineup.team.logo;
    if (awayCoachImg)
      awayCoachImg.src = awayLineup.coach?.photo || awayLineup.team.logo;

    // IMPORTANT: Get the containers by class name instead of ID
    const homePlayersContainer = document.querySelector(".home-players");
    const awayPlayersContainer = document.querySelector(".away-players");

    // Clear and rebuild the player containers
    if (homePlayersContainer) {
      homePlayersContainer.innerHTML = ""; // Completely clear the container
      buildTeamLineup(homePlayersContainer, homeLineup, "home");
    }

    if (awayPlayersContainer) {
      awayPlayersContainer.innerHTML = ""; // Completely clear the container
      buildTeamLineup(awayPlayersContainer, awayLineup, "away");
    }

    // Render substitutes
    const homeSubsContainer = document.querySelector(".home-subs");
    const awaySubsContainer = document.querySelector(".away-subs");

    if (homeSubsContainer) {
      homeSubsContainer.innerHTML = ""; // Clear existing substitutes
      renderSubstitutes(
        homeSubsContainer,
        homeLineup.substitutes || [],
        "home"
      );
    }

    if (awaySubsContainer) {
      awaySubsContainer.innerHTML = ""; // Clear existing substitutes
      renderSubstitutes(
        awaySubsContainer,
        awayLineup.substitutes || [],
        "away"
      );
    }
  }

  // Build team lineup based on formation and positions
  function buildTeamLineup(container, lineup, teamSide) {
    if (!lineup || !lineup.startXI || lineup.startXI.length === 0) return;

    // Group players by position
    const positions = {
      G: [], // Goalkeeper
      D: [], // Defenders
      M: [], // Midfielders
      F: [], // Forwards
    };

    // Sort players into position groups
    lineup.startXI.forEach((player) => {
      // Fix: Check if player.player exists and has a pos property
      if (!player.player) {
        console.error("Invalid player data:", player);
        return;
      }

      const pos = player.player.pos || "M"; // Default to midfielder if position is unknown
      if (positions[pos]) {
        positions[pos].push(player);
      } else {
        positions["M"].push(player); // Default to midfielder for unknown positions
      }
    });

    // Create goalkeeper section
    if (positions["G"].length > 0) {
      const gkSection = document.createElement("div");
      gkSection.className = "player-position gk";

      positions["G"].forEach((player) => {
        const playerDiv = createPlayerElement(player);
        gkSection.appendChild(playerDiv);
      });

      container.appendChild(gkSection);
    }

    // Create defenders section
    if (positions["D"].length > 0) {
      const defSection = document.createElement("div");
      defSection.className = "player-position def";

      positions["D"].forEach((player) => {
        const playerDiv = createPlayerElement(player);
        // Fix: Append to defSection, not to itself
        defSection.appendChild(playerDiv);
      });

      container.appendChild(defSection);
    }

    // Handle midfielders differently based on team side
    if (positions["M"].length > 0) {
      if (teamSide === "away" && positions["M"].length >= 3) {
        // Split midfielders into defensive and attacking for away team
        const halfIndex = Math.floor(positions["M"].length / 2);

        // Create defensive midfielders
        const dmidSection = document.createElement("div");
        dmidSection.className = "player-position dmid";

        positions["M"].slice(0, halfIndex).forEach((player) => {
          const playerDiv = createPlayerElement(player);
          dmidSection.appendChild(playerDiv);
        });

        container.appendChild(dmidSection);

        // Create attacking midfielders
        const amidSection = document.createElement("div");
        amidSection.className = "player-position amid";

        positions["M"].slice(halfIndex).forEach((player) => {
          const playerDiv = createPlayerElement(player);
          amidSection.appendChild(playerDiv);
        });

        container.appendChild(amidSection);
      } else {
        // Regular midfield section for home team
        const midSection = document.createElement("div");
        midSection.className = "player-position mid";

        positions["M"].forEach((player) => {
          const playerDiv = createPlayerElement(player);
          midSection.appendChild(playerDiv);
        });

        container.appendChild(midSection);
      }
    }

    // Create forwards section
    if (positions["F"].length > 0) {
      const fwdSection = document.createElement("div");
      fwdSection.className = "player-position fwd";

      positions["F"].forEach((player) => {
        const playerDiv = createPlayerElement(player);
        fwdSection.appendChild(playerDiv);
      });

      container.appendChild(fwdSection);
    }
  }

  // Create a player element
  function createPlayerElement(player) {
    // Fix: Check if player.player exists
    if (!player.player) {
      console.error("Invalid player data:", player);
      return document.createElement("div"); // Return empty div to avoid errors
    }

    const playerDiv = document.createElement("div");
    playerDiv.className = "player";

    const numberDiv = document.createElement("div");
    numberDiv.className = "player-number";
    numberDiv.textContent = player.player.number || "?";

    const nameDiv = document.createElement("div");
    nameDiv.className = "player-name";
    nameDiv.textContent = player.player.name || "Unknown";

    playerDiv.appendChild(numberDiv);
    playerDiv.appendChild(nameDiv);

    return playerDiv;
  }

  // Render substitutes
  function renderSubstitutes(container, substitutes, teamSide) {
    if (!substitutes || substitutes.length === 0) {
      const noSubsDiv = document.createElement("div");
      noSubsDiv.className = "sub-player";
      noSubsDiv.textContent = "No substitutes available";
      container.appendChild(noSubsDiv);
      return;
    }

    // Add each substitute
    substitutes.forEach((sub) => {
      // Fix: Check if sub.player exists
      if (!sub.player) {
        console.error("Invalid substitute data:", sub);
        return;
      }

      const subDiv = document.createElement("div");
      subDiv.className = "sub-player";

      const numberSpan = document.createElement("span");
      numberSpan.className = "sub-number";
      numberSpan.textContent = sub.player.number || "?";

      const nameSpan = document.createElement("span");
      nameSpan.className = "sub-name";
      nameSpan.textContent = sub.player.name || "Unknown";

      // For home subs, number comes first
      if (teamSide === "home") {
        subDiv.appendChild(numberSpan);
        subDiv.appendChild(nameSpan);
      } else {
        // For away subs, name comes first
        subDiv.appendChild(nameSpan);
        subDiv.appendChild(numberSpan);
      }

      container.appendChild(subDiv);
    });
  }

  // Render match statistics with chart
  function renderMatchStatistics(stats, homeName, awayName) {
    if (!stats || stats.length < 2) {
      // If no stats available, show placeholder
      const placeholderStats = [
        {
          team: {
            name: homeName,
            logo: "/placeholder.svg?height=100&width=100",
          },
          statistics: [
            { type: "Ball Possession", value: "57%" },
            { type: "Passes", value: "498" },
            { type: "Shots Total", value: "12" },
            { type: "Shots On Target", value: "4" },
            { type: "Shots Off Target", value: "5" },
            { type: "Attacks", value: "107" },
            { type: "Dangerous Attacks", value: "48" },
            { type: "Successful Passes Percentage", value: "84%" },
          ],
        },
        {
          team: {
            name: awayName,
            logo: "/placeholder.svg?height=100&width=100",
          },
          statistics: [
            { type: "Ball Possession", value: "43%" },
            { type: "Passes", value: "375" },
            { type: "Shots Total", value: "11" },
            { type: "Shots On Target", value: "2" },
            { type: "Shots Off Target", value: "4" },
            { type: "Attacks", value: "94" },
            { type: "Dangerous Attacks", value: "48" },
            { type: "Successful Passes Percentage", value: "83%" },
          ],
        },
      ];
      stats = placeholderStats;
    }

    const homeTeam = stats[0].team;
    const awayTeam = stats[1].team;

    // Extract Ball Possession
    const homePossession = Number.parseInt(
      stats[0].statistics
        .find((stat) => stat.type === "Ball Possession")
        ?.value.replace("%", "") || 50
    );
    const awayPossession = Number.parseInt(
      stats[1].statistics
        .find((stat) => stat.type === "Ball Possession")
        ?.value.replace("%", "") || 50
    );

    // Create possession chart
    createPossessionChart(
      homePossession,
      awayPossession,
      homeTeam.name,
      awayTeam.name
    );

    // Create legend for possession chart
    document.getElementById("possessionLegend").innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background-color: #ffeb3b;"></div>
                <span>${homeTeam.name}: ${homePossession}%</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #f0f0f0;"></div>
                <span>${awayTeam.name}: ${awayPossession}%</span>
            </div>
        `;

    // Define top stats to display
    const topStatsTypes = [
      "Passes",
      "Shots Total",
      "Ball Possession %",
      "Successful Passes Percentage",
      "Dangerous Attacks",
      "Attacks",
      "Shots Off Target",
      "Shots On Target",
    ];

    // Generate top stats HTML
    let topStatsHTML = "";
    topStatsTypes.forEach((statType) => {
      // Find the matching stat type, handling different naming conventions
      const findStat = (team, type) => {
        // Handle special case for Ball Possession % which might be stored as "Ball Possession"
        if (
          type === "Ball Possession %" &&
          team.statistics.find((s) => s.type === "Ball Possession")
        ) {
          return team.statistics.find((s) => s.type === "Ball Possession")
            .value;
        }
        return team.statistics.find((s) => s.type === type)?.value || "0";
      };

      const homeStat = findStat(stats[0], statType);
      const awayStat = findStat(stats[1], statType);

      topStatsHTML += `
                <div class="home-stat">${homeStat}</div>
                <div class="stat-label">${statType}</div>
                <div class="away-stat">${awayStat}</div>
            `;
    });

    document.getElementById("topStats").innerHTML = topStatsHTML;

    // Generate all stats HTML (for the dropdown)
    let allStatsHTML = "";
    // Get all unique stat types from both teams
    const allStatTypes = [
      ...new Set([
        ...stats[0].statistics.map((s) => s.type),
        ...stats[1].statistics.map((s) => s.type),
      ]),
    ];

    allStatTypes.forEach((statType) => {
      const homeStat =
        stats[0].statistics.find((s) => s.type === statType)?.value || "0";
      const awayStat =
        stats[1].statistics.find((s) => s.type === statType)?.value || "0";

      allStatsHTML += `
                <div class="home-stat">${homeStat}</div>
                <div class="stat-label">${statType}</div>
                <div class="away-stat">${awayStat}</div>
            `;
    });

    document.getElementById("allStats").innerHTML = allStatsHTML;

    // Set up the toggle button for all stats
    const allStatsBtn = document.getElementById("allStatsBtn");
    const allStatsContainer = document.getElementById("allStatsContainer");
    const toggleIcon = allStatsBtn.querySelector(".toggle-icon");

    // Remove any existing event listeners by cloning and replacing the button
    const newAllStatsBtn = allStatsBtn.cloneNode(true);
    allStatsBtn.parentNode.replaceChild(newAllStatsBtn, allStatsBtn);

    // Set initial state explicitly
    allStatsContainer.style.display = "none";

    // Add event listener to the new button
    newAllStatsBtn.addEventListener("click", function () {
      // Get the toggle icon inside this button (since we cloned it)
      const toggleIcon = this.querySelector(".toggle-icon");

      if (allStatsContainer.style.display === "block") {
        allStatsContainer.style.display = "none";
        toggleIcon.classList.remove("active");
      } else {
        allStatsContainer.style.display = "block";
        toggleIcon.classList.add("active");
      }
    });
  }

  // Create possession chart using Chart.js
  function createPossessionChart(
    homePossession,
    awayPossession,
    homeName,
    awayName
  ) {
    const ctx = document.getElementById("possessionChart").getContext("2d");

    // Destroy previous chart if it exists
    if (possessionChart) {
      possessionChart.destroy();
    }

    possessionChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: [homeName, awayName],
        datasets: [
          {
            data: [homePossession, awayPossession],
            backgroundColor: ["#ffeb3b", "#f0f0f0"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.raw}%`,
            },
          },
        },
      },
    });
  }

  // Format match date
  function formatMatchDate(dateTime) {
    return new Date(dateTime).toLocaleDateString();
  }

  // Format match time
  function formatMatchTime(dateTime) {
    return new Date(dateTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Render head-to-head section
  function renderHeadToHead(h2h) {
    if (!h2h || h2h.length === 0) return "";

    // Sort h2h matches by date in descending order
    h2h.sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));

    // Calculate stats
    let homeWins = 0,
      awayWins = 0,
      draws = 0;
    h2h.forEach((match) => {
      if (match.score.fulltime.home > match.score.fulltime.away) homeWins++;
      else if (match.score.fulltime.home < match.score.fulltime.away)
        awayWins++;
      else draws++;
    });

    const homeTeam = h2h[0].teams.home; // Assume first match for home team
    const awayTeam = h2h[0].teams.away; // Assume first match for away team

    // Store all matches in a data attribute for later use
    const allMatchesData = JSON.stringify(h2h);

    // Initially show only 5 matches
    const initialMatches = h2h.slice(0, 5);
    const hasMoreMatches = h2h.length > 5;

    return `
    <div class="h2h-container" data-all-matches='${allMatchesData}'>
        <!-- H2H Header -->
        <div class="h2h-header">
            <img src="${homeTeam.logo}" alt="${
      homeTeam.name
    }" class="team-logo">
            <span class="h2h-title">Head to Head</span>
            <img src="${awayTeam.logo}" alt="${
      awayTeam.name
    }" class="team-logo">
        </div>

        <!-- Overall H2H Stats -->
        <div class="h2h-summary">
            <div class="summary-box">
                <span class="summary-value">${homeWins}</span>
                <span class="summary-label">Wins</span>
            </div>
            <div class="summary-box">
                <span class="summary-value">${draws}</span>
                <span class="summary-label">Draws</span>
            </div>
            <div class="summary-box">
                <span class="summary-value">${awayWins}</span>
                <span class="summary-label">Wins</span>
            </div>
        </div>

        <!-- Matches -->
        <div class="h2h-matches" id="h2hMatchesList">
            ${renderMatchItems(initialMatches)}
        </div>
        
        ${
          hasMoreMatches
            ? `
        <div class="show-all-matches">
            <button id="showAllH2HMatches" class="show-all-btn">Show All Matches</button>
        </div>
        `
            : ""
        }
    </div>
  `;
  }

  // Add this new helper function to render match items
  function renderMatchItems(matches) {
    return matches
      .map((match) => {
        // Format the score properly - show 0-0 for future matches instead of null-null
        let score = "0-0"; // Default for future matches
        if (
          match.score.fulltime.home !== null &&
          match.score.fulltime.away !== null
        ) {
          score = `${match.score.fulltime.home} - ${match.score.fulltime.away}`;
        }

        return `
      <div class="h2h-match">
          <div class="match-info">
              <span class="league-name">${match.league.name}</span>
              <span class="match-date">${new Date(
                match.fixture.date
              ).toLocaleDateString()}</span>
          </div>
          <div class="match-row">
              <div class="team-info">
                  <img src="${match.teams.home.logo}" alt="${
          match.teams.home.name
        }" class="team-logo-small">
                  <span class="team-name" title="${match.teams.home.name}">${
          match.teams.home.name
        }</span>
              </div>
              <span class="score">${score}</span>
              <div class="team-info">
                  <img src="${match.teams.away.logo}" alt="${
          match.teams.away.name
        }" class="team-logo-small">
                  <span class="team-name" title="${match.teams.away.name}">${
          match.teams.away.name
        }</span>
              </div>
          </div>
      </div>
    `;
      })
      .join("");
  }

  // Add this new function to handle showing all matches
  function setupH2HExpandButton() {
    const showAllBtn = document.getElementById("showAllH2HMatches");
    if (showAllBtn) {
      showAllBtn.addEventListener("click", function () {
        const h2hContainer = document.querySelector(".h2h-container");
        const matchesList = document.getElementById("h2hMatchesList");

        if (h2hContainer && matchesList) {
          try {
            // Get all matches data from the data attribute
            const allMatches = JSON.parse(
              h2hContainer.dataset.allMatches || "[]"
            );

            // Render all matches
            matchesList.innerHTML = renderMatchItems(allMatches);

            // Hide the button after showing all matches
            this.parentElement.style.display = "none";

            // Add a "Show Less" button if needed
            const showLessBtn = document.createElement("div");
            showLessBtn.className = "show-less-matches";
            showLessBtn.innerHTML = `<button class="show-less-btn">Show Less</button>`;
            h2hContainer.appendChild(showLessBtn);

            // Add event listener to "Show Less" button
            showLessBtn
              .querySelector(".show-less-btn")
              .addEventListener("click", function () {
                // Render only 5 matches again
                matchesList.innerHTML = renderMatchItems(
                  allMatches.slice(0, 5)
                );

                // Show the "Show All" button again
                showAllBtn.parentElement.style.display = "block";

                // Remove the "Show Less" button
                this.parentElement.remove();
              });
          } catch (error) {
            console.error("Error showing all matches:", error);
          }
        }
      });
    }
  }

  // Render events section
  function renderEvents(events) {
    // Fix: Add better logging for events data
    console.log("Events data:", events);

    if (!events || events.length === 0) {
      return `
      <div class="events-container">
          <div class="events-header">Match Events</div>
          <p class="no-events">No events available for this match yet.</p>
      </div>
    `;
    }

    return `
    <div class="events-container">
        <div class="events-header">Match Events</div>
        <div class="events-list">
            ${events
              .map(
                (event) => `
                <div class="event-item">
                    <span class="event-time">${event.time.elapsed}'</span>
                    <div class="event-team">
                        <img src="${event.team.logo}" alt="${
                  event.team.name
                }" class="event-team-logo">
                        <span class="event-team-name">${event.team.name}</span>
                    </div>
                    <span class="event-type">${event.type} ${
                  event.detail ? `(${event.detail})` : ""
                }</span>
                    ${
                      event.player && event.player.name
                        ? `<span class="event-player">${event.player.name}</span>`
                        : ""
                    }
                </div>
            `
              )
              .join("")}
        </div>
    </div>
  `;
  }

  // Setup stream links
  function setupStreamLinks(fixtureId) {
    // Define fixtureLinks - this would be your database of stream links
    const fixtureLinks = {
      1001: ["https://example.com/stream1", "https://example.com/stream2"],
      1002: ["https://example.com/stream3"],
      // Add more fixture IDs and their stream links
    };

    // Get stream links based on fixtureId
    const links = fixtureLinks[fixtureId] || [];

    const matchStream = document.getElementById("matchStream");
    const linksContainer = document.getElementById("streamLinks");
    const messageContainer = document.getElementById("message");

    matchStream.style.display = "none"; // Ensure the iframe is hidden initially
    linksContainer.innerHTML = ""; // Clear any existing content

    if (links.length > 0) {
      messageContainer.textContent = "Select a stream to watch the match live:";

      links.forEach((link, index) => {
        const linkButton = document.createElement("button");
        linkButton.textContent = `Stream ${index + 1}`;
        linkButton.classList.add("stream-link-button");

        linkButton.onclick = () => {
          matchStream.src = link;
          matchStream.style.display = "block"; // Show iframe when a stream is selected
        };

        linksContainer.appendChild(linkButton);
      });
    } else {
      // No streams available
      messageContainer.textContent =
        "No live streams available for this match at the moment.";
    }
  }

  // Sample content data for the footer toggles
  const contentData = {
    "about-us": "This is the about us content.",
    "terms-of-service": "These are the terms of service.",
    "privacy-policy": "This is the privacy policy.",
  };

  // Initialize footer content toggles
  document.querySelectorAll(".footer-toggle").forEach((button) => {
    button.addEventListener("click", function () {
      const target = this.getAttribute("data-target");
      const contentBox = document.getElementById("fullscreen-content");
      document.getElementById("content-text").innerHTML =
        contentData[target] || "Content not available";
      contentBox.style.display = "block";
    });
  });

  // Close content function
  window.closeContent = () => {
    document.getElementById("fullscreen-content").style.display = "none";
  };

  // Add refresh page functionality
  document.getElementById("refreshPage").addEventListener("click", () => {
    window.location.reload();
  });

  // Listen for online/offline events
  window.addEventListener("online", () => {
    console.log("Device is now online");
    updateStatus("🌐 Connection restored. Refreshing match data...");
    refreshMatchDetails();
  });

  window.addEventListener("offline", () => {
    console.log("Device is now offline");
    updateStatus("📵 You are offline. Using cached data.", true);
    isOfflineMode = true;
  });

  // Start the initialization
  initializeMatchDetails();
});
