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

