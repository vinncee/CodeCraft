// Add this to the existing script, inside the IIFE before the closing })();

// Code Snippets Panel
const showSnippetsBtn = document.getElementById("show-snippets-btn")
const closeSnippetsBtn = document.getElementById("close-snippets-btn")
const codeSnippetsPanel = document.getElementById("code-snippets-panel")
const snippetsSearchInput = document.getElementById("snippets-search-input")
const snippetsSearchBtn = document.getElementById("snippets-search-btn")
const addSnippetBtn = document.getElementById("add-snippet-btn")
const snippetsList = document.getElementById("snippets-list")

// Keyboard Shortcuts Modal
const showKeyboardShortcutsBtn = document.getElementById("show-keyboard-shortcuts-btn")
const closeShortcutsModalBtn = document.getElementById("close-shortcuts-modal-btn")
const keyboardShortcutsModal = document.getElementById("keyboard-shortcuts-modal")

// Quick Actions
const exportDataBtn = document.getElementById("export-data-btn")
const importDataBtn = document.getElementById("import-data-btn")
const clearHistoryBtn = document.getElementById("clear-history-btn")
const printReportBtn = document.getElementById("print-report-btn")

// Notification Banner
const notificationBanner = document.getElementById("notification-banner")
const notificationMessage = document.getElementById("notification-message")
const closeNotificationBtn = document.getElementById("close-notification-btn")

// Declare missing variables
const messageInput = document.getElementById("message-input") // Assuming you have an input with this ID
let state = {} // Initialize state as an empty object
const messagesContainer = document.getElementById("messages-container") // Assuming you have a container with this ID

// Mock functions for sendMessage and vscode
// Replace these with your actual implementations
function sendMessage() {
  console.log("sendMessage function called")
}

const vscode = {
  setState: (newState) => {
    state = newState
    console.log("vscode.setState called with:", newState)
  },
  getState: () => {
    return state
  },
  postMessage: (message) => {
    console.log("vscode.postMessage called with:", message)
  },
}

// Toggle Code Snippets Panel
if (showSnippetsBtn) {
  showSnippetsBtn.addEventListener("click", () => {
    codeSnippetsPanel.classList.toggle("hidden")
  })
}

if (closeSnippetsBtn) {
  closeSnippetsBtn.addEventListener("click", () => {
    codeSnippetsPanel.classList.add("hidden")
  })
}

// Search Snippets
if (snippetsSearchBtn) {
  snippetsSearchBtn.addEventListener("click", () => {
    const searchTerm = snippetsSearchInput.value.toLowerCase()
    searchSnippets(searchTerm)
  })
}

if (snippetsSearchInput) {
  snippetsSearchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      const searchTerm = snippetsSearchInput.value.toLowerCase()
      searchSnippets(searchTerm)
    }
  })
}

// Add New Snippet
if (addSnippetBtn) {
  addSnippetBtn.addEventListener("click", () => {
    // This would typically open a modal or form to add a new snippet
    showNotification("This feature is coming soon!", "info")
  })
}

// Copy Snippet to Clipboard
if (snippetsList) {
  snippetsList.addEventListener("click", (e) => {
    const copyBtn = e.target.closest('.snippet-action-btn[title="Copy to clipboard"]')
    if (copyBtn) {
      const snippetItem = copyBtn.closest(".snippet-item")
      const snippetCode = snippetItem.querySelector(".snippet-code code").textContent

      navigator.clipboard
        .writeText(snippetCode)
        .then(() => {
          showNotification("Code copied to clipboard!", "success")
        })
        .catch((err) => {
          console.error("Could not copy text: ", err)
          showNotification("Failed to copy code", "error")
        })
    }

    const insertBtn = e.target.closest('.snippet-action-btn[title="Insert into message"]')
    if (insertBtn) {
      const snippetItem = insertBtn.closest(".snippet-item")
      const snippetCode = snippetItem.querySelector(".snippet-code code").textContent

      // Insert the code into the message input
      const currentText = messageInput.value
      const cursorPosition = messageInput.selectionStart

      messageInput.value =
        currentText.substring(0, cursorPosition) +
        "```\n" +
        snippetCode +
        "\n```" +
        currentText.substring(cursorPosition)

      // Focus the input and set cursor position after the inserted code
      messageInput.focus()
      const newPosition = cursorPosition + snippetCode.length + 8 // 8 for the \`\`\`\n and \n\`\`\`
      messageInput.setSelectionRange(newPosition, newPosition)

      // Hide the snippets panel
      codeSnippetsPanel.classList.add("hidden")
    }
  })
}

// Search Snippets Function
function searchSnippets(searchTerm) {
  const snippetItems = snippetsList.querySelectorAll(".snippet-item")

  snippetItems.forEach((item) => {
    const title = item.querySelector(".snippet-title").textContent.toLowerCase()
    const code = item.querySelector(".snippet-code").textContent.toLowerCase()

    if (title.includes(searchTerm) || code.includes(searchTerm)) {
      item.style.display = "block"
    } else {
      item.style.display = "none"
    }
  })
}

// Keyboard Shortcuts Modal
if (showKeyboardShortcutsBtn) {
  showKeyboardShortcutsBtn.addEventListener("click", () => {
    keyboardShortcutsModal.classList.remove("hidden")
  })
}

if (closeShortcutsModalBtn) {
  closeShortcutsModalBtn.addEventListener("click", () => {
    keyboardShortcutsModal.classList.add("hidden")
  })
}

// Close modal when clicking outside
if (keyboardShortcutsModal) {
  keyboardShortcutsModal.addEventListener("click", (e) => {
    if (e.target === keyboardShortcutsModal) {
      keyboardShortcutsModal.classList.add("hidden")
    }
  })
}

// Quick Actions
if (exportDataBtn) {
  exportDataBtn.addEventListener("click", () => {
    exportLearningData()
  })
}

if (importDataBtn) {
  importDataBtn.addEventListener("click", () => {
    // This would typically open a file picker
    showNotification("Import functionality coming soon!", "info")
  })
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all history? This action cannot be undone.")) {
      // Clear history logic would go here
      showNotification("History cleared successfully", "success")
    }
  })
}

if (printReportBtn) {
  printReportBtn.addEventListener("click", () => {
    generateReport()
  })
}

// Export Learning Data
function exportLearningData() {
  const exportData = {
    exp: state.exp,
    level: state.level,
    weeklyGoals: state.weeklyGoals,
    activities: state.activities,
    achievements: state.achievements,
    messages: state.messages,
    exportDate: new Date().toISOString(),
  }

  const dataStr = JSON.stringify(exportData, null, 2)
  const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

  const exportFileName = `codecraft_learning_data_${new Date().toISOString().split("T")[0]}.json`

  const linkElement = document.createElement("a")
  linkElement.setAttribute("href", dataUri)
  linkElement.setAttribute("download", exportFileName)
  linkElement.click()

  showNotification("Learning data exported successfully!", "success")
}

// Generate Report
function generateReport() {
  // This would typically generate a PDF or HTML report
  showNotification("Report generation coming soon!", "info")
}

// Show Notification
function showNotification(message, type = "success") {
  notificationBanner.className = "notification-banner"
  notificationBanner.classList.add(type)
  notificationBanner.classList.remove("hidden")
  notificationMessage.textContent = message

  // Auto-hide after 5 seconds
  setTimeout(() => {
    notificationBanner.classList.add("hidden")
  }, 5000)
}

// Close Notification
if (closeNotificationBtn) {
  closeNotificationBtn.addEventListener("click", () => {
    notificationBanner.classList.add("hidden")
  })
}

// Keyboard Shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl+Enter to send message
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault()
    sendMessage()
  }

  // Ctrl+L to clear conversation
  if (e.ctrlKey && e.key === "l") {
    e.preventDefault()
    if (confirm("Are you sure you want to clear the conversation?")) {
      messagesContainer.innerHTML = ""
      state.messages = []
      vscode.setState(state)
      showNotification("Conversation cleared", "success")
    }
  }

  // Ctrl+B to toggle code snippets panel
  if (e.ctrlKey && e.key === "b") {
    e.preventDefault()
    codeSnippetsPanel.classList.toggle("hidden")
  }

  // Ctrl+/ to show keyboard shortcuts
  if (e.ctrlKey && e.key === "/") {
    e.preventDefault()
    keyboardShortcutsModal.classList.remove("hidden")
  }

  // Ctrl+1/2/3 to switch tabs
  if (e.ctrlKey && e.key === "1") {
    e.preventDefault()
    document.querySelector('[data-tab="chat"]').click()
  }

  if (e.ctrlKey && e.key === "2") {
    e.preventDefault()
    document.querySelector('[data-tab="journal"]').click()
  }

  if (e.ctrlKey && e.key === "3") {
    e.preventDefault()
    document.querySelector('[data-tab="achievements"]').click()
  }
})

// Initialize Chart.js for Learning Progress Chart
// This would typically be loaded from a CDN or bundled with the extension
// For demonstration purposes, we'll just show a placeholder
const learningProgressChart = document.getElementById("learning-progress-chart")
if (learningProgressChart) {
  // Placeholder for chart initialization
  // In a real implementation, you would use Chart.js or a similar library
  const ctx = learningProgressChart.getContext("2d")
  if (ctx) {
    ctx.fillStyle = "rgba(77, 132, 255, 0.2)"
    ctx.fillRect(0, 0, learningProgressChart.width, learningProgressChart.height)
    ctx.fillStyle = "var(--text-secondary)"
    ctx.font = "14px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(
      "Learning progress visualization will appear here",
      learningProgressChart.width / 2,
      learningProgressChart.height / 2,
    )
  }
}

// Add these functions to handle stats update

// Define statCharts as a global variable to store chart references
let learningStats = {}

// Handle learning stats update
function updateLearningStats(stats) {
  learningStats = stats

  // Update skill breakdown
  if (stats.skills) {
    const skillBars = document.querySelectorAll(".skill-item")
    if (skillBars.length > 0) {
      skillBars[0].querySelector(".skill-info span:last-child").textContent = `${stats.skills.javascript}%`
      skillBars[0].querySelector(".skill-progress-bar").style.width = `${stats.skills.javascript}%`

      skillBars[1].querySelector(".skill-info span:last-child").textContent = `${stats.skills.problemSolving}%`
      skillBars[1].querySelector(".skill-progress-bar").style.width = `${stats.skills.problemSolving}%`

      skillBars[2].querySelector(".skill-info span:last-child").textContent = `${stats.skills.debugging}%`
      skillBars[2].querySelector(".skill-progress-bar").style.width = `${stats.skills.debugging}%`

      skillBars[3].querySelector(".skill-info span:last-child").textContent = `${stats.skills.codeOrganization}%`
      skillBars[3].querySelector(".skill-progress-bar").style.width = `${stats.skills.codeOrganization}%`
    }
  }

  // Update streak
  if (stats.streak) {
    const streakDaysEl = document.querySelector(".streak-days")
    if (streakDaysEl) {
      streakDaysEl.textContent = stats.streak.currentStreak
    }

    // Update streak grid
    const streakGrid = document.querySelector(".streak-grid")
    if (streakGrid) {
      const streakDays = streakGrid.querySelectorAll(".streak-day")
      streakDays.forEach((day) => {
        const date = day.getAttribute("data-date")
        if (stats.streak.activeDays.includes(date)) {
          day.classList.add("active")
        } else {
          day.classList.remove("active")
        }
      })
    }
  }

  // Update error resolution
  if (stats.errorResolution) {
    const percentageEl = document.querySelector(".percentage")
    if (percentageEl) {
      percentageEl.textContent = `${stats.errorResolution.rate}%`
    }

    const circlePath = document.querySelector(".circle")
    if (circlePath) {
      circlePath.setAttribute("stroke-dasharray", `${stats.errorResolution.rate}, 100`)
    }

    const avgTimeEl = document.querySelector(".resolution-stat:first-child .stat-value")
    if (avgTimeEl) {
      avgTimeEl.textContent = `${stats.errorResolution.avgTime} min`
    }

    const errorsFixedEl = document.querySelector(".resolution-stat:last-child .stat-value")
    if (errorsFixedEl) {
      errorsFixedEl.textContent = stats.errorResolution.totalFixed
    }
  }

  // Update active times
  if (stats.activeTimes) {
    const timeBars = document.querySelectorAll(".time-bar")
    let i = 0
    for (const [time, value] of Object.entries(stats.activeTimes)) {
      if (i < timeBars.length) {
        timeBars[i].style.height = `${value}%`
        timeBars[i].setAttribute("data-time", time)
        i++
      }
    }
  }
}

// Add this to the event listener handling
window.addEventListener("message", (event) => {
  const message = event.data

  switch (message.command) {
    // Add this case
    case "updateLearningStats":
      updateLearningStats(message.stats)
      break
    // Other existing cases...
  }
})

// Add this function to initialize some default achievements if none exist
function initializeDefaultAchievements() {
  if (!state.achievements || state.achievements.length === 0) {
    state.achievements = [
      {
        id: "first-chat",
        title: "Conversation Starter",
        description: "Started your first conversation with the AI mentor",
        category: "milestones",
        icon: "comment",
        unlockedAt: null,
        isNew: false,
      },
      {
        id: "error-solver",
        title: "Bug Squasher",
        description: "Successfully resolved your first coding error",
        category: "problem-solving",
        icon: "debug",
        unlockedAt: null,
        isNew: false,
      },
      {
        id: "persistent-learner",
        title: "Persistent Learner",
        description: "Used the AI mentor for 5 consecutive days",
        category: "learning",
        icon: "calendar",
        unlockedAt: null,
        isNew: false,
      },
      {
        id: "question-master",
        title: "Question Master",
        description: "Asked 10 meaningful questions",
        category: "learning",
        icon: "question",
        unlockedAt: null,
        isNew: false,
      },
      {
        id: "loop-expert",
        title: "Loop Expert",
        description: "Demonstrated understanding of complex loop concepts",
        category: "coding",
        icon: "refresh",
        unlockedAt: null,
        isNew: false,
      },
    ]
    vscode.setState(state)
  }

  // Make sure to display achievements when tab is loaded
  displayAchievements(state.achievements, "all")
}

// Modify the tab switching event listener to ensure achievements are displayed
// Find the existing tab switching event listener and add this inside the callback function:
// After this line: document.getElementById(`${tab}-tab`).classList.add('active');
document.querySelectorAll(".tab-button").forEach((tabButton) => {
  tabButton.addEventListener("click", (e) => {
    const tab = e.target.dataset.tab

    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach((tabContent) => {
      tabContent.classList.add("hidden")
    })

    // Deactivate all tab buttons
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.remove("active")
    })

    // Show the selected tab content
    document.getElementById(`${tab}-content`).classList.remove("hidden")

    // Activate the selected tab button
    document.getElementById(`${tab}-tab`).classList.add("active")
    if (tab === "achievements") {
      // Make sure achievements are displayed when switching to the tab
      displayAchievements(state.achievements || [], "all")
    }
  })
})

// Make sure the achievements tab works correctly
document.querySelector('[data-tab="achievements"]').addEventListener("click", function () {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active")
  })

  // Deactivate all tab buttons
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active")
  })

  // Show achievements tab content and activate button
  document.getElementById("achievements-tab").classList.add("active")
  this.classList.add("active")

  console.log("Achievements tab clicked, tab content should be visible now")
})

// Add this call at the end of the IIFE, just before the closing })();
initializeDefaultAchievements()

// Define displayAchievements function
function displayAchievements(achievements, filter) {
  const achievementsList = document.getElementById("achievements-list")
  achievementsList.innerHTML = "" // Clear existing list

  const filteredAchievements = achievements.filter((achievement) => {
    if (filter === "all") return true
    return achievement.category === filter
  })

  if (filteredAchievements.length === 0) {
    achievementsList.innerHTML = "<p>No achievements to display.</p>"
    return
  }

  filteredAchievements.forEach((achievement) => {
    const achievementItem = document.createElement("div")
    achievementItem.classList.add("achievement-item")

    const icon = document.createElement("span")
    icon.classList.add("achievement-icon")
    icon.textContent = achievement.icon // Use text content for simplicity

    const content = document.createElement("div")
    content.classList.add("achievement-content")

    const title = document.createElement("h3")
    title.textContent = achievement.title

    const description = document.createElement("p")
    description.textContent = achievement.description

    content.appendChild(title)
    content.appendChild(description)

    achievementItem.appendChild(icon)
    achievementItem.appendChild(content)

    achievementsList.appendChild(achievementItem)
  })
}

// Add this code at the end of the file, just before the closing })();

// Fix tab switching for achievements
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded - initializing tab handlers")

  // Get all tab buttons
  const tabButtons = document.querySelectorAll(".tab-button")

  // Add click event to each tab button
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab")
      console.log(`Tab clicked: ${tabId}`)

      // Remove active class from all tabs and buttons
      document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active")
      })

      tabButtons.forEach((btn) => {
        btn.classList.remove("active")
      })

      // Add active class to selected tab and button
      const selectedTab = document.getElementById(`${tabId}-tab`)
      if (selectedTab) {
        selectedTab.classList.add("active")
        console.log(`Activated tab: ${tabId}-tab`)
      } else {
        console.error(`Tab element not found: ${tabId}-tab`)
      }

      this.classList.add("active")

      // Special handling for achievements tab
      if (tabId === "achievements") {
        console.log("Achievements tab clicked - sending message to extension")

        // Notify the extension about tab switch
        vscode.postMessage({
          command: "switchTab",
          tab: "achievements",
        })

        // Force display the achievements tab
        const achievementsTab = document.getElementById("achievements-tab")
        if (achievementsTab) {
          achievementsTab.style.display = "block"
          console.log("Forced achievements tab to display: block")

          // Also force the container to be visible
          const achievementsContainer = achievementsTab.querySelector(".achievements-container")
          if (achievementsContainer) {
            achievementsContainer.style.display = "block"
            console.log("Forced achievements container to display: block")
          } else {
            console.error("Achievements container not found")
          }
        } else {
          console.error("Achievements tab element not found")
        }
      }
    })
  })

  // Check if achievements tab is the default active tab
  const activeTab = document.querySelector(".tab-button.active")
  if (activeTab && activeTab.getAttribute("data-tab") === "achievements") {
    console.log("Achievements tab is active by default - forcing display")
    const achievementsTab = document.getElementById("achievements-tab")
    if (achievementsTab) {
      achievementsTab.style.display = "block"
    }
  }
})

// Add a function to debug the DOM structure
function debugDOMStructure() {
  console.log("--- DOM Structure Debug ---")

  // Check tabs
  const tabs = document.querySelectorAll(".tab-button")
  console.log(`Found ${tabs.length} tab buttons:`)
  tabs.forEach((tab) => {
    console.log(`- Tab: ${tab.getAttribute("data-tab")}, Active: ${tab.classList.contains("active")}`)
  })

  // Check tab contents
  const tabContents = document.querySelectorAll(".tab-content")
  console.log(`Found ${tabContents.length} tab contents:`)
  tabContents.forEach((content) => {
    console.log(
      `- Content ID: ${content.id}, Active: ${content.classList.contains("active")}, Display: ${window.getComputedStyle(content).display}`,
    )
  })

  // Check achievements specifically
  const achievementsTab = document.getElementById("achievements-tab")
  if (achievementsTab) {
    console.log("Achievements tab found:")
    console.log(`- Classes: ${achievementsTab.className}`)
    console.log(`- Display: ${window.getComputedStyle(achievementsTab).display}`)
    console.log(`- Visibility: ${window.getComputedStyle(achievementsTab).visibility}`)
    console.log(`- Height: ${window.getComputedStyle(achievementsTab).height}`)

    const container = achievementsTab.querySelector(".achievements-container")
    if (container) {
      console.log("Achievements container found:")
      console.log(`- Display: ${window.getComputedStyle(container).display}`)

      const grid = container.querySelector(".achievements-grid")
      if (grid) {
        console.log("Achievements grid found:")
        console.log(`- Display: ${window.getComputedStyle(grid).display}`)
        console.log(`- Child count: ${grid.children.length}`)
      } else {
        console.error("Achievements grid not found")
      }
    } else {
      console.error("Achievements container not found")
    }
  } else {
    console.error("Achievements tab not found")
  }

  console.log("--- End DOM Structure Debug ---")
}

// Run the debug function after a short delay to ensure the DOM is fully processed
setTimeout(debugDOMStructure, 1000)

// Add a global error handler to catch any JavaScript errors
window.addEventListener("error", (event) => {
  console.error("JavaScript error:", event.error)

  // Try to notify the extension
  try {
    vscode.postMessage({
      command: "logError",
      error: {
        message: event.error.message,
        stack: event.error.stack,
      },
    })
  } catch (e) {
    console.error("Failed to send error to extension:", e)
  }
})

// Add these functions to handle the learning analytics

// Function to update all learning analytics
function updateLearningAnalytics(stats) {
  // Update metrics
  document.getElementById("errors-resolved").textContent = stats.errorResolution.totalFixed
  document.getElementById("concepts-learned").textContent = stats.conceptsLearned.length

  // Format practice time
  const hours = Math.floor(stats.totalPracticeTime / 60)
  const minutes = stats.totalPracticeTime % 60
  document.getElementById("practice-time").textContent = `${hours}h ${minutes}m`

  // Update code quality based on error resolution rate
  document.getElementById("code-quality").textContent = `${stats.errorResolution.rate}%`

  // Update code metrics
  document.getElementById("lines-written").textContent = stats.codeMetrics.linesWritten
  document.getElementById("files-accessed").textContent = stats.codeMetrics.filesAccessed

  // Update language distribution chart
  updateLanguageDistributionChart(stats.codeMetrics.languageDistribution)

  // Update error types chart
  updateErrorTypesChart(stats.errorResolution.errorTypes)

  // Update weekly activity chart
  updateWeeklyActivityChart(stats.weeklyActivity)

  // Update concepts learned grid
  updateConceptsLearnedGrid(stats.conceptsLearned)

  // Update learning sessions list
  updateLearningSessionsList(stats.sessions)
}

// Function to update language distribution chart
function updateLanguageDistributionChart(languageDistribution) {
  const canvas = document.getElementById("language-distribution-chart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Set canvas dimensions
  canvas.width = canvas.parentElement.clientWidth
  canvas.height = 200

  // Extract data
  const languages = Object.keys(languageDistribution)
  const counts = Object.values(languageDistribution)
  const total = counts.reduce((sum, count) => sum + count, 0)

  if (total === 0) {
    // No data yet
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
    ctx.font = "14px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("No language data available yet", canvas.width / 2, canvas.height / 2)
    return
  }

  // Colors for different languages
  const colors = [
    "rgba(77, 132, 255, 0.8)",
    "rgba(255, 99, 132, 0.8)",
    "rgba(255, 206, 86, 0.8)",
    "rgba(75, 192, 192, 0.8)",
    "rgba(153, 102, 255, 0.8)",
    "rgba(255, 159, 64, 0.8)",
  ]

  // Draw pie chart
  let startAngle = 0
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const radius = Math.min(centerX, centerY) - 10

  languages.forEach((language, index) => {
    const percentage = counts[index] / total
    const endAngle = startAngle + percentage * Math.PI * 2

    // Draw slice
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = colors[index % colors.length]
    ctx.fill()

    // Draw label
    const labelAngle = startAngle + (endAngle - startAngle) / 2
    const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7)
    const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7)

    ctx.fillStyle = "white"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(`${language} (${Math.round(percentage * 100)}%)`, labelX, labelY)

    startAngle = endAngle
  })
}

// Function to update error types chart
function updateErrorTypesChart(errorTypes) {
  const canvas = document.getElementById("error-types-chart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Set canvas dimensions
  canvas.width = canvas.parentElement.clientWidth
  canvas.height = 200

  // Extract data
  const types = Object.keys(errorTypes)
  const counts = Object.values(errorTypes)
  const total = counts.reduce((sum, count) => sum + count, 0)

  if (total === 0) {
    // No data yet
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
    ctx.font = "14px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("No error data available yet", canvas.width / 2, canvas.height / 2)
    return
  }

  // Colors for different error types
  const colors = [
    "rgba(255, 99, 132, 0.8)",
    "rgba(255, 159, 64, 0.8)",
    "rgba(255, 206, 86, 0.8)",
    "rgba(75, 192, 192, 0.8)",
    "rgba(153, 102, 255, 0.8)",
  ]

  // Calculate bar width and spacing
  const barWidth = (canvas.width - 60) / types.length - 10
  const maxCount = Math.max(...counts)

  // Draw bars
  types.forEach((type, index) => {
    const x = 50 + index * (barWidth + 10)
    const barHeight = (counts[index] / maxCount) * (canvas.height - 60)
    const y = canvas.height - 30 - barHeight

    // Draw bar
    ctx.fillStyle = colors[index % colors.length]
    ctx.fillRect(x, y, barWidth, barHeight)

    // Draw label
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(type, x + barWidth / 2, canvas.height - 15)

    // Draw count
    ctx.fillText(counts[index].toString(), x + barWidth / 2, y - 5)
  })
}

// Function to update weekly activity chart
function updateWeeklyActivityChart(weeklyActivity) {
  const canvas = document.getElementById("weekly-activity-chart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Set canvas dimensions
  canvas.width = canvas.parentElement.clientWidth
  canvas.height = 200

  // Day labels
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Calculate bar width and spacing
  const barWidth = (canvas.width - 60) / 7 - 10
  const maxActivity = Math.max(...weeklyActivity, 1) // Avoid division by zero

  // Draw bars
  weeklyActivity.forEach((activity, index) => {
    const x = 50 + index * (barWidth + 10)
    const barHeight = (activity / maxActivity) * (canvas.height - 60)
    const y = canvas.height - 30 - barHeight

    // Draw bar
    ctx.fillStyle = "rgba(77, 132, 255, 0.8)"
    ctx.fillRect(x, y, barWidth, barHeight)

    // Draw day label
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(days[index], x + barWidth / 2, canvas.height - 15)

    // Draw activity minutes
    ctx.fillText(`${activity}m`, x + barWidth / 2, y - 5)
  })
}

// Function to update concepts learned grid
function updateConceptsLearnedGrid(concepts) {
  const conceptsGrid = document.getElementById("concepts-grid")
  if (!conceptsGrid) return

  // Clear existing concepts
  conceptsGrid.innerHTML = ""

  // Add each concept as a badge
  concepts.forEach((concept) => {
    const conceptBadge = document.createElement("div")
    conceptBadge.className = "concept-badge"
    conceptBadge.textContent = concept
    conceptsGrid.appendChild(conceptBadge)
  })
}

// Function to update learning sessions list
function updateLearningSessionsList(sessions) {
  const sessionsList = document.getElementById("sessions-list")
  if (!sessionsList) return

  // Clear existing sessions
  sessionsList.innerHTML = ""

  // Sort sessions by start time (newest first)
  const sortedSessions = [...sessions].sort((a, b) => {
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  })

  // Add each session
  sortedSessions.slice(0, 5).forEach((session) => {
    const sessionItem = document.createElement("div")
    sessionItem.className = "session-item"

    // Format date
    const sessionDate = new Date(session.startTime)
    const formattedDate = sessionDate.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

    // Format duration
    const hours = Math.floor(session.duration / 60)
    const minutes = session.duration % 60
    const formattedDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

    // Create session content
    sessionItem.innerHTML = `
      <div class="session-header">
        <span class="session-date">${formattedDate}</span>
        <span class="session-duration">${formattedDuration}</span>
      </div>
      <div class="session-topics">
        ${session.topics.map((topic) => `<span class="topic-tag">${topic}</span>`).join("")}
      </div>
      <div class="session-stats">
        <span class="errors-resolved">
          <i class="codicon codicon-debug"></i> ${session.errorsResolved} errors resolved
        </span>
      </div>
    `

    sessionsList.appendChild(sessionItem)
  })

  // Add a message if no sessions
  if (sortedSessions.length === 0) {
    const noSessions = document.createElement("div")
    noSessions.className = "no-sessions"
    noSessions.textContent = "No learning sessions recorded yet."
    sessionsList.appendChild(noSessions)
  }
}

// Add CSS styles for the new elements
const styleSheet = document.createElement("style")
styleSheet.textContent = `
  .language-distribution, .error-types, .weekly-activity, .concepts-learned, .learning-sessions {
    margin-bottom: 2rem;
  }
  
  .chart-container {
    background-color: var(--light-bg);
    border-radius: var(--border-radius-md);
    padding: 1rem;
    height: 200px;
  }
  
  .concepts-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  
  .concept-badge {
    background-color: var(--primary-color);
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: var(--border-radius-md);
    font-size: 0.85rem;
  }
  
  .sessions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .session-item {
    background-color: var(--light-bg);
    border-radius: var(--border-radius-md);
    padding: 1rem;
  }
  
  .session-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  
  .session-date {
    font-weight: 500;
  }
  
  .session-duration {
    color: var(--text-secondary);
  }
  
  .session-topics {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  
  .topic-tag {
    background-color: rgba(77, 132, 255, 0.2);
    color: var(--primary-color);
    padding: 0.25rem 0.5rem;
    border-radius: var(--border-radius-sm);
    font-size: 0.75rem;
  }
  
  .session-stats {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }
  
  .no-sessions {
    color: var(--text-secondary);
    font-style: italic;
    text-align: center;
    padding: 1rem;
  }
`
document.head.appendChild(styleSheet)

// Update the event listener for messages from the extension
window.addEventListener("message", (event) => {
  const message = event.data

  switch (message.command) {
    // Add this case to handle learning stats updates
    case "updateLearningStats":
      updateLearningAnalytics(message.stats)
      break

    // Other existing cases...
  }
})

// Initialize charts when the journal tab is shown
document.querySelector('[data-tab="journal"]').addEventListener("click", () => {
  // Request the latest stats from the extension
  vscode.postMessage({
    command: "getLearningStats",
  })
})
