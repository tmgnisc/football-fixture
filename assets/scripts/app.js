document.addEventListener("DOMContentLoaded", () => {
  const apiKey = "1765f4fdf1376f1afd07d94395f60134"
  const leagues = [
    { id: 5, name: "UEFA Nations League" },
    { id: 32, name: "World Cup Qualifiers Europe" },
    { id: 140, name: "La Liga" },
    { id: 39, name: "Premier League" },
    { id: 61, name: "Ligue 1" },
    { id: 78, name: "Bundesliga" },
    { id: 135, name: "Serie A" },
    { id: 2, name: "Champions League" },
    { id: 3, name: "Europa League" },
    { id: 143, name: "Copa del Rey" },
  ]

  const season = 2024
  const matchContainer = document.getElementById("matchContainer")
  const calendarContainer = document.getElementById("calendar")
  const dateInput = document.getElementById("specificDate")
  const searchInput = document.getElementById("searchInput")
  const searchTab = document.getElementById("searchTab")
  const resultsContainer = document.getElementById("results")

  // Dummy data for footer content
  const contentData = {
    about: "<p>This is the about section.</p>",
    terms: "<p>These are the terms and conditions.</p>",
    privacy: "<p>This is the privacy policy.</p>",
  }

  // Initialize footer content toggles
  document.querySelectorAll(".footer-toggle").forEach((button) => {
    button.addEventListener("click", function () {
      const target = this.getAttribute("data-target")
      const contentBox = document.getElementById("fullscreen-content")
      document.getElementById("content-text").innerHTML = contentData[target]
      contentBox.style.display = "block"
    })
  })

  function closeContent() {
    document.getElementById("fullscreen-content").style.display = "none"
  }

  // Make the close button work
  document.querySelector(".close-btn").addEventListener("click", closeContent)

  // Hardcoded fixtures
  const hardcodedFixtures = [
    {
      league: "Saudi Pro League",
      teams: "Al Hilal vs Al Nassr",
      date: "2025-04-05",
      time: "00:05",
      status: "Full Time",
      score: "1-3",
      fixtureId: "101",
    },
    {
      league: "IPL",
      teams: "LSG VS MI",
      date: "2025-04-04",
      time: "19:45",
      status: "FINISHED",
      score: "",
      fixtureId: "910",
    },
  ]

  let matchData = {}
  const fixtureIds = [] // Store fixture IDs for later use
  let apiFailureCount = 0

  // Get user local time zone
  function getUserTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  // Get today's date in user's local timezone
  function getUserLocalDate() {
    return new Date().toLocaleDateString("en-CA", { timeZone: getUserTimeZone() })
  }

  const today = getUserLocalDate() // Updated to user's local date

  // Format match time for display
  function formatMatchTime(dateTime) {
    return new Date(dateTime).toLocaleTimeString("en-US", {
      timeZone: getUserTimeZone(),
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Format match date for display
  function formatMatchDate(dateTime) {
    return new Date(dateTime).toLocaleDateString("en-CA", { timeZone: getUserTimeZone() })
  }

  // Fetch fixtures from API
  async function fetchFixtures() {
    // Load cached matches first (instant display)
    const cachedMatches = localStorage.getItem("cachedMatches")
    if (cachedMatches) {
      matchData = JSON.parse(cachedMatches)
      displayMatches(today)
    }

    try {
      // Show refresh indicator if this isn't the initial load
      if (Object.keys(matchData).length > 0) {
        showRefreshIndicator()
      }

      const fetchPromises = leagues.map((league) => {
        return fetch(`https://v3.football.api-sports.io/fixtures?league=${league.id}&season=${season}`, {
          method: "GET",
          headers: { "x-apisports-key": apiKey },
        }).then((response) => (response.ok ? response.json() : null))
      })

      // Fetch all data in parallel
      const responses = await Promise.all(fetchPromises)

      // Check if all responses failed
      const allFailed = responses.every((response) => !response || !response.response)
      if (allFailed) {
        throw new Error("All API requests failed")
      }

      const newMatchData = {}
      responses.forEach((data, index) => {
        if (!data || !data.response) return
        const league = leagues[index]

        data.response.forEach((match) => {
          const matchDate = formatMatchDate(match.fixture.date) // Ensure local date
          const matchStatus = match.fixture.status.long
          const fixtureId = match.fixture.id // Get fixture ID

          // Store fixtureId for later use
          fixtureIds.push(fixtureId)

          const formattedMatch = {
            teams: `<span class="home-team">${match.teams.home.name} <img src="${match.teams.home.logo}" alt="${match.teams.home.name} logo" class="team-logo home-logo"></span> 
                      vs 
                      <span class="away-team"><img src="${match.teams.away.logo}" alt="${match.teams.away.name} logo" class="team-logo away-logo"> ${match.teams.away.name}</span>`,
            date: matchDate,
            time: formatMatchTime(match.fixture.date),
            status: ["First Half", "Second Half", "Halftime", "Extra time", "LIVE"].includes(matchStatus)
              ? `<span style="color: red;">LIVE</span>`
              : matchStatus === "FINISHED"
                ? "F/T"
                : ["POSTPONED", "CANCELED"].includes(matchStatus)
                  ? "N/S"
                  : matchStatus,
            score: match.goals.home !== null ? `${match.goals.home} - ${match.goals.away}` : "",
            fixtureId: fixtureId,
          }

          if (!newMatchData[matchDate]) newMatchData[matchDate] = {}
          if (!newMatchData[matchDate][league.name]) newMatchData[matchDate][league.name] = []
          newMatchData[matchDate][league.name].push(formattedMatch)
        })
      })

      // Add hardcoded fixtures
      hardcodedFixtures.forEach((match) => {
        if (!newMatchData[match.date]) newMatchData[match.date] = {}
        if (!newMatchData[match.date][match.league]) newMatchData[match.date][match.league] = []
        newMatchData[match.date][match.league].push(match)
      })

      // Compare old and new data to prevent duplicate matches
      if (JSON.stringify(newMatchData) !== JSON.stringify(matchData)) {
        matchData = newMatchData
        localStorage.setItem("cachedMatches", JSON.stringify(matchData))
        displayMatches(today)

        // Update the last updated timestamp
        const lastUpdatedElement = document.getElementById("last-updated")
        if (lastUpdatedElement) {
          const now = new Date()
          lastUpdatedElement.textContent = `(Updated: ${now.toLocaleTimeString()})`
        }
      }

      // Reset the API failure counter on successful fetch
      apiFailureCount = 0
    } catch (error) {
      console.error("Error fetching fixtures:", error)

      // Increment API failure counter
      apiFailureCount++

      // If we've had multiple consecutive failures, show error and schedule page reload
      if (apiFailureCount >= 3) {
        matchContainer.innerHTML = "<p>Error loading data. Page will refresh automatically in 10 seconds...</p>"
        setTimeout(() => {
          window.location.reload()
        }, 10000)
      } else {
        matchContainer.innerHTML = "<p>Error loading data. Trying again soon...</p>"
      }
    }
  }

  function getFormattedDate(date) {
    const options = { weekday: "short", month: "short", day: "numeric", timeZone: getUserTimeZone() }
    return new Intl.DateTimeFormat("en-US", options).format(date)
  }

  // Add calendar dates
  function addCalendarDates() {
    const today = new Date()
    calendarContainer.innerHTML = ""

    for (let i = -2; i <= 2; i++) {
      const newDate = new Date(today)
      newDate.setDate(today.getDate() + i)

      const dateElement = document.createElement("div")
      dateElement.className = "date"
      dateElement.textContent = getFormattedDate(newDate)
      dateElement.dataset.date = newDate.toISOString().split("T")[0]

      if (i === 0) dateElement.classList.add("active") // Highlight today's date

      dateElement.addEventListener("click", () => {
        document.querySelector(".date.active")?.classList.remove("active")
        dateElement.classList.add("active")
        displayMatches(dateElement.dataset.date)
      })

      calendarContainer.appendChild(dateElement)
    }
  }

  dateInput.addEventListener("change", (e) => {
    const selectedDate = e.target.value
    if (selectedDate) {
      displayMatches(selectedDate)
    }
  })

  // Display matches for a selected date
  function displayMatches(date) {
    matchContainer.innerHTML = "" // Clear previous matches

    if (!matchData[date]) {
      matchContainer.innerHTML = `<p>No matches for ${date}.</p>`
      return
    }

    Object.keys(matchData[date]).forEach((league) => {
      matchContainer.appendChild(renderMatches(matchData[date][league], league))
    })
  }

  // Show Matches for Selected League
  document.querySelectorAll(".league-box").forEach((leagueBox) => {
    leagueBox.addEventListener("click", () => {
      const selectedLeagueId = leagueBox.getAttribute("data-id")
      const activeDate = document.querySelector(".date.active")?.dataset.date

      if (activeDate && matchData[activeDate]) {
        matchContainer.innerHTML = "" // Clear previous matches
        let matchFound = false

        // Loop through the matchData for the selected date
        Object.keys(matchData[activeDate]).forEach((leagueName) => {
          // Find the league object from the leagues array
          const league = leagues.find(
            (l) => l.id == selectedLeagueId && l.name.toLowerCase() === leagueName.toLowerCase(),
          )

          if (league) {
            matchContainer.appendChild(renderMatches(matchData[activeDate][leagueName], leagueName))
            matchFound = true // Match found for the selected league
          }
        })

        // If no match is found, display a message with the league name and date
        if (!matchFound) {
          matchContainer.innerHTML = `<p>No match for ${leagueBox.innerText} on ${activeDate}.</p>`
        }
      }
    })
  })

  // Render Matches
  function renderMatches(matches, league) {
    const leagueSection = document.createElement("div")
    leagueSection.classList.add("league-section")

    const leagueHeader = document.createElement("div")
    leagueHeader.classList.add("league-header")
    leagueHeader.innerHTML = `<h3>${league.toUpperCase()}</h3>`
    leagueSection.appendChild(leagueHeader)

    matches.forEach((match) => {
      const matchDiv = document.createElement("div")
      matchDiv.classList.add("match")

      matchDiv.innerHTML = `
                <div class="teams">${match.teams}</div>
                <div class="score">${match.score || ""}</div>
                <div class="date-time">${match.date} | ${match.time} | ${match.status || ""}</div>
            `

      matchDiv.addEventListener("click", () => {
        // Save fixtureId to sessionStorage
        sessionStorage.setItem("fixtureId", match.fixtureId)
        // Redirect to matchdetails.html
        window.location.href = "matchdetails.html"
      })

      leagueSection.appendChild(matchDiv)
    })

    return leagueSection
  }

  // Filter matches based on search term and date
  function filterMatches(searchTerm, activeDate) {
    const container = document.getElementById("matchContainer")
    container.innerHTML = "" // Clear previous matches

    let hasMatches = false

    if (matchData[activeDate]) {
      Object.keys(matchData[activeDate]).forEach((league) => {
        const filteredMatches = matchData[activeDate][league].filter((match) =>
          match.teams.toLowerCase().includes(searchTerm.toLowerCase()),
        )

        if (filteredMatches.length > 0) {
          hasMatches = true
          container.appendChild(renderMatches(filteredMatches, league))
        }
      })
    }

    if (!hasMatches) {
      container.innerHTML = `<p>No matches found for "${searchTerm}" on ${activeDate}.</p>`
    }
  }

  // Handle search actions
  function handleSearch() {
    const searchTerm = searchInput.value.trim()
    const activeDateElement = document.querySelector(".date.active")
    const activeDate = activeDateElement ? activeDateElement.dataset.date : new Date().toISOString().split("T")[0]

    if (searchTerm) {
      filterMatches(searchTerm, activeDate)
    }
  }

  // Event listener for "Enter" key in the search bar
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  })

  // Event listener for search button click
  searchTab.addEventListener("click", () => {
    handleSearch()
  })

  // Add refresh page functionality
  document.getElementById("refreshPage").addEventListener("click", () => {
    window.location.reload()
  })

  // Add manual refresh button functionality
  document.getElementById("manualRefresh").addEventListener("click", function () {
    this.style.transform = "rotate(360deg)"
    this.style.transition = "transform 0.5s ease"

    // Reset the rotation after animation completes
    setTimeout(() => {
      this.style.transform = "rotate(0deg)"
      this.style.transition = "none"
    }, 500)

    fetchFixtures()
  })

  // Initialize and fetch data
  fetchFixtures()
  addCalendarDates()

  // Modify the auto-refresh interval to include a full page reload occasionally
  // Set up automatic data refresh (every 60 seconds)
  const REFRESH_INTERVAL = 60000 // 60 seconds in milliseconds
  const PAGE_RELOAD_INTERVAL = 3600000 // 1 hour in milliseconds (adjust as needed)
  let lastPageReloadTime = Date.now()

  setInterval(() => {
    console.log("Auto-refreshing match data...")

    // Check if we should do a full page reload
    const currentTime = Date.now()
    if (currentTime - lastPageReloadTime >= PAGE_RELOAD_INTERVAL) {
      console.log("Performing full page reload...")
      window.location.reload()
      lastPageReloadTime = currentTime
      return
    }

    // Otherwise just refresh the data
    fetchFixtures()
  }, REFRESH_INTERVAL)

  // Add a visual indicator for when data refreshes
  function showRefreshIndicator() {
    const indicator = document.createElement("div")
    indicator.textContent = "Updating..."
    indicator.style.position = "fixed"
    indicator.style.top = "10px"
    indicator.style.right = "10px"
    indicator.style.background = "rgba(255, 0, 0, 0.7)"
    indicator.style.color = "white"
    indicator.style.padding = "5px 10px"
    indicator.style.borderRadius = "5px"
    indicator.style.zIndex = "1000"
    document.body.appendChild(indicator)

    setTimeout(() => {
      document.body.removeChild(indicator)
    }, 2000)
  }
})

