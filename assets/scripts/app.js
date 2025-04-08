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
  const statusElement = document.getElementById("status-message")

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

  // Hardcoded fixtures - EXPANDED with more matches as fallback data
  const hardcodedFixtures = [
    // Premier League
    {
      league: "Premier League",
      teams: "Manchester United vs Liverpool",
      date: getUserLocalDate(), // Today's date
      time: "15:00",
      status: "Scheduled",
      score: "",
      fixtureId: "1001",
    },
    {
      league: "Premier League",
      teams: "Arsenal vs Chelsea",
      date: getUserLocalDate(), // Today's date
      time: "17:30",
      status: "Scheduled",
      score: "",
      fixtureId: "1002",
    },
    // La Liga
    {
      league: "La Liga",
      teams: "Barcelona vs Real Madrid",
      date: getUserLocalDate(), // Today's date
      time: "20:00",
      status: "Scheduled",
      score: "",
      fixtureId: "1003",
    },
    {
      league: "La Liga",
      teams: "Atletico Madrid vs Sevilla",
      date: getUserLocalDate(), // Today's date
      time: "18:15",
      status: "Scheduled",
      score: "",
      fixtureId: "1004",
    },
    // Champions League
    {
      league: "Champions League",
      teams: "Bayern Munich vs PSG",
      date: getUserLocalDate(), // Today's date
      time: "20:00",
      status: "Scheduled",
      score: "",
      fixtureId: "1005",
    },
    // Add more fixtures for other leagues
    {
      league: "Serie A",
      teams: "Juventus vs Inter Milan",
      date: getUserLocalDate(), // Today's date
      time: "19:45",
      status: "Scheduled",
      score: "",
      fixtureId: "1006",
    },
    {
      league: "Bundesliga",
      teams: "Borussia Dortmund vs Bayern Munich",
      date: getUserLocalDate(), // Today's date
      time: "17:30",
      status: "Scheduled",
      score: "",
      fixtureId: "1007",
    },
    // Add some fixtures for tomorrow
    {
      league: "Premier League",
      teams: "Manchester City vs Tottenham",
      date: getTomorrowDate(), // Tomorrow's date
      time: "15:00",
      status: "Scheduled",
      score: "",
      fixtureId: "1008",
    },
    {
      league: "La Liga",
      teams: "Valencia vs Villarreal",
      date: getTomorrowDate(), // Tomorrow's date
      time: "18:30",
      status: "Scheduled",
      score: "",
      fixtureId: "1009",
    },
    // Original fixtures
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
  let isOfflineMode = false

  // Get user local time zone
  function getUserTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  // Get today's date in user's local timezone
  function getUserLocalDate() {
    return new Date().toLocaleDateString("en-CA", { timeZone: getUserTimeZone() })
  }

  // Get tomorrow's date
  function getTomorrowDate() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toLocaleDateString("en-CA", { timeZone: getUserTimeZone() })
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

  // Function to update status message
  function updateStatus(message, isError = false) {
    if (statusElement) {
      statusElement.textContent = message
      statusElement.className = isError ? "status-error" : "status-info"
      statusElement.style.display = "block"

      // Hide after 5 seconds unless it's an error
      if (!isError) {
        setTimeout(() => {
          statusElement.style.display = "none"
        }, 5000)
      }
    }
  }

  // Function to load fallback data
  function loadFallbackData() {
    console.log("Loading fallback data...")
    isOfflineMode = true

    // Create structured data from hardcoded fixtures
    const fallbackData = {}

    hardcodedFixtures.forEach((match) => {
      if (!fallbackData[match.date]) fallbackData[match.date] = {}
      if (!fallbackData[match.date][match.league]) fallbackData[match.date][match.league] = []
      fallbackData[match.date][match.league].push(match)
    })

    matchData = fallbackData
    localStorage.setItem("cachedMatches", JSON.stringify(matchData))
    displayMatches(today)

    updateStatus("⚠️ Using offline data. Some matches may not be current.", true)
  }

  // Check network status
  function checkNetworkStatus() {
    return navigator.onLine
  }

  // Fetch fixtures from API
  async function fetchFixtures() {
    // Check if we're online
    if (!checkNetworkStatus()) {
      console.log("Device is offline")
      loadFallbackData()
      return
    }

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

      updateStatus("Fetching latest match data...")

      // Get today's date and format it as YYYY-MM-DD
      const today = new Date().toISOString().split("T")[0]
      // Get date 30 days in the future
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const futureDateStr = futureDate.toISOString().split("T")[0]

      const fetchPromises = leagues.map((league) => {
        return fetch(
          `https://v3.football.api-sports.io/fixtures?league=${league.id}&season=${season}&from=${today}&to=${futureDateStr}`,
          {
            method: "GET",
            headers: { "x-apisports-key": apiKey },
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000), // 10 second timeout
          },
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error(`API request failed with status ${response.status}`)
            }
            return response.json()
          })
          .catch((error) => {
            console.error(`Error fetching league ${league.id}:`, error)
            return null
          })
      })

      // Fetch all data in parallel
      const responses = await Promise.all(fetchPromises)

      // Check if all responses failed
      const allFailed = responses.every((response) => !response || !response.response)
      if (allFailed) {
        throw new Error("All API requests failed")
      }

      const newMatchData = {}
      let matchCount = 0

      responses.forEach((data, index) => {
        if (!data || !data.response) return
        const league = leagues[index]

        data.response.forEach((match) => {
          matchCount++
          const matchDate = formatMatchDate(match.fixture.date) // Ensure local date
          const matchStatus = match.fixture.status.long
          const fixtureId = match.fixture.id // Get fixture ID

          // Store fixtureId for later use
          fixtureIds.push(fixtureId)

          // Determine status display text
          let statusDisplay = matchStatus
          if (["First Half", "Second Half", "Halftime", "Extra time", "LIVE"].includes(matchStatus)) {
            statusDisplay = `<span style="color: red;">LIVE</span>`
          } else if (matchStatus === "Match Finished" || matchStatus === "FINISHED") {
            statusDisplay = "F/T"
          } else if (["POSTPONED", "CANCELED", "SUSPENDED"].includes(matchStatus)) {
            statusDisplay = "N/S"
          } else if (matchStatus === "Not Started" || matchStatus === "Time to be defined") {
            // Format the match time for future matches
            const matchDateTime = new Date(match.fixture.date)
            const timeStr = matchDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            statusDisplay = `${timeStr}`
          }

          const formattedMatch = {
            teams: `<span class="home-team">${match.teams.home.name} <img src="${match.teams.home.logo}" alt="${match.teams.home.name} logo" class="team-logo home-logo"></span> 
                      vs 
                      <span class="away-team"><img src="${match.teams.away.logo}" alt="${match.teams.away.name} logo" class="team-logo away-logo"> ${match.teams.away.name}</span>`,
            date: matchDate,
            time: formatMatchTime(match.fixture.date),
            status: statusDisplay,
            score: match.goals.home !== null ? `${match.goals.home} - ${match.goals.away}` : "",
            fixtureId: fixtureId,
          }

          if (!newMatchData[matchDate]) newMatchData[matchDate] = {}
          if (!newMatchData[matchDate][league.name]) newMatchData[matchDate][league.name] = []
          newMatchData[matchDate][league.name].push(formattedMatch)
        })
      })

      // If we got no matches at all, throw an error
      if (matchCount === 0) {
        throw new Error("No matches returned from API")
      }

      // Add hardcoded fixtures only if we're in offline mode or for testing
      if (isOfflineMode) {
        hardcodedFixtures.forEach((match) => {
          if (!newMatchData[match.date]) newMatchData[match.date] = {}
          if (!newMatchData[match.date][match.league]) newMatchData[match.date][match.league] = []
          newMatchData[match.date][match.league].push(match)
        })
      }

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

        updateStatus(`✅ Data updated successfully (${matchCount} matches)`)
      } else {
        updateStatus("No new match data available")
      }

      // Reset the API failure counter on successful fetch
      apiFailureCount = 0
      isOfflineMode = false
    } catch (error) {
      console.error("Error fetching fixtures:", error)

      // Increment API failure counter
      apiFailureCount++

      // If we've had multiple consecutive failures
      if (apiFailureCount >= 3) {
        updateStatus("⚠️ Unable to connect to the server. Using offline data.", true)
        loadFallbackData()

        // Try again in 2 minutes
        setTimeout(() => {
          fetchFixtures()
        }, 120000) // 2 minutes
      } else {
        updateStatus(`⚠️ Error loading data. Retry attempt ${apiFailureCount}/3...`, true)

        // Try again in 30 seconds
        setTimeout(() => {
          fetchFixtures()
        }, 30000) // 30 seconds
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

    if (!matchData[date] || Object.keys(matchData[date]).length === 0) {
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

  // Listen for online/offline events
  window.addEventListener("online", () => {
    console.log("Device is now online")
    updateStatus("🌐 Connection restored. Fetching latest data...")
    fetchFixtures()
  })

  window.addEventListener("offline", () => {
    console.log("Device is now offline")
    updateStatus("📵 You are offline. Using cached data.", true)
    isOfflineMode = true
  })

  // Initialize and fetch data
  fetchFixtures()
  addCalendarDates()

  // Set up automatic data refresh with exponential backoff
  let refreshInterval = 60000 // Start with 60 seconds
  const MAX_REFRESH_INTERVAL = 300000 // Max 5 minutes

  function scheduleNextRefresh() {
    // If we're having API issues, increase the interval (exponential backoff)
    if (apiFailureCount > 0) {
      refreshInterval = Math.min(refreshInterval * 1.5, MAX_REFRESH_INTERVAL)
    } else {
      // Reset to normal interval when things are working
      refreshInterval = 60000
    }

    console.log(`Scheduling next refresh in ${refreshInterval / 1000} seconds`)

    setTimeout(() => {
      console.log("Auto-refreshing match data...")
      fetchFixtures().then(() => {
        scheduleNextRefresh()
      })
    }, refreshInterval)
  }

  // Start the refresh cycle
  scheduleNextRefresh()

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
