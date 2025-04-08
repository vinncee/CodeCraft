import * as vscode from "vscode"
import * as fs from "fs"
import { AIService, ResponseMode } from "./ai-service"

// Define weekly goals interface
interface WeeklyGoal {
  id: string
  name: string
  target: number
  current: number
  lastReset: string // ISO date string
}

interface Activity {
  date: string
  title: string
  description: string
}

// Define learning stats interface
interface LearningStats {
  skills: {
    javascript: number
    problemSolving: number
    debugging: number
    codeOrganization: number
  }
  streak: {
    currentStreak: number
    lastActive: string
    activeDays: string[]
  }
  errorResolution: {
    rate: number
    avgTime: number
    totalFixed: number
  }
  activeTimes: {
    [key: string]: number
  }
  progressHistory: {
    date: string
    value: number
  }[]
}

export function activate(context: vscode.ExtensionContext) {
  console.log("AI Coding Mentor is now active!")

  // Create AI service
  const aiService = new AIService(context)

  // Register the main command to open the AI Coding Mentor
  const disposable = vscode.commands.registerCommand("codecraft.openAIMentor", () => {
    AIMentorPanel.createOrShow(context.extensionUri, aiService, context)
  })

  // Register the command to explain errors
  const explainErrorDisposable = vscode.commands.registerCommand("codecraft.explainError", () => {
    if (AIMentorPanel.currentPanel) {
      AIMentorPanel.currentPanel.explainCurrentError()
    } else {
      AIMentorPanel.createOrShow(context.extensionUri, aiService, context)
      // Wait for panel to initialize
      setTimeout(() => {
        if (AIMentorPanel.currentPanel) {
          AIMentorPanel.currentPanel.explainCurrentError()
        }
      }, 1000)
    }
  })

  // Register command to set API token
  const setApiTokenDisposable = vscode.commands.registerCommand("codecraft.setHuggingFaceApiToken", async () => {
    const apiToken = await vscode.window.showInputBox({
      prompt: "Enter your Hugging Face API token",
      password: true,
      ignoreFocusOut: true,
    })

    if (apiToken) {
      await vscode.workspace.getConfiguration("codecraft").update("huggingFaceApiToken", apiToken, true)
      vscode.window.showInformationMessage("Hugging Face API token saved successfully!")

      // Refresh AI service
      aiService.resetConversation()
    }
  })

  context.subscriptions.push(disposable, explainErrorDisposable, setApiTokenDisposable)

  // If the webview panel already exists, reveal it
  if (AIMentorPanel.currentPanel) {
    AIMentorPanel.currentPanel.reveal()
  }

  // Track diagnostics changes to show/hide the "Explain This Error" button
  vscode.languages.onDidChangeDiagnostics(() => {
    if (AIMentorPanel.currentPanel) {
      AIMentorPanel.currentPanel.updateDiagnostics()
    }
  })

  // Listen for text document changes to analyze code for achievements
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (
      AIMentorPanel.currentPanel &&
      event.document.languageId.match(/javascript|typescript|python|java|csharp|cpp|go|rust|php/)
    ) {
      const code = event.document.getText()
      AIMentorPanel.currentPanel.analyzeCode()
    }
  })
}

/**
 * Manages the webview panel for the AI Coding Mentor
 */
class AIMentorPanel {
  public static currentPanel: AIMentorPanel | undefined
  private static readonly viewType = "aiMentor"
  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionUri: vscode.Uri
  private readonly _aiService: AIService
  private _disposables: vscode.Disposable[] = []
  private _responseMode: ResponseMode = ResponseMode.Text
  private _userExp = 0
  private _userLevel = 1
  private _expToNextLevel = 100
  private _context: vscode.ExtensionContext
  private _weeklyGoals: WeeklyGoal[] = []
  private _activities: Activity[] = []
  private _learningStats: LearningStats = {
    skills: {
      javascript: 65,
      problemSolving: 78,
      debugging: 42,
      codeOrganization: 55,
    },
    streak: {
      currentStreak: 5,
      lastActive: new Date().toISOString(),
      activeDays: ["2025-04-01", "2025-04-02", "2025-04-03", "2025-04-04", "2025-04-05"],
    },
    errorResolution: {
      rate: 75,
      avgTime: 14, // minutes
      totalFixed: 23,
    },
    activeTimes: {
      "9AM": 30,
      "12PM": 40,
      "3PM": 60,
      "6PM": 100,
      "9PM": 80,
      "12AM": 35,
    },
    progressHistory: [
      { date: "2025-03-01", value: 10 },
      { date: "2025-03-08", value: 25 },
      { date: "2025-03-15", value: 40 },
      { date: "2025-03-22", value: 55 },
      { date: "2025-03-29", value: 65 },
      { date: "2025-04-05", value: 80 },
    ],
  }

  public static createOrShow(extensionUri: vscode.Uri, aiService: AIService, context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined

    // If we already have a panel, show it
    if (AIMentorPanel.currentPanel) {
      AIMentorPanel.currentPanel._panel.reveal(column)
      return
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      AIMentorPanel.viewType,
      "AI Coding Mentor",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media"), vscode.Uri.joinPath(extensionUri, "dist")],
        retainContextWhenHidden: true,
      },
    )

    AIMentorPanel.currentPanel = new AIMentorPanel(panel, extensionUri, aiService, context)
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    aiService: AIService,
    context: vscode.ExtensionContext,
  ) {
    this._panel = panel
    this._extensionUri = extensionUri
    this._aiService = aiService
    this._context = context

    this._userExp = context.globalState.get("codecraft.userExp", 0)
    this._userLevel = context.globalState.get("codecraft.userLevel", 1)

    // Calculate XP needed for next level based on current level
    this._expToNextLevel = Math.floor(100 * Math.pow(1.5, this._userLevel - 1))

    // Load weekly goals or initialize default ones
    this._loadWeeklyGoals()

    // Load activities
    this._loadActivities()

    // Load learning stats
    this._loadLearningStats()

    // Set the webview's initial html content
    this._update()

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "sendMessage":
            await this._handleUserMessage(message.text)
            return
          case "toggleMode":
            this._toggleMode(message.mode)
            return
          case "openLearningJournal":
            this._showLearningJournal()
            return
          case "explainError":
            await this.explainCurrentError()
            return
          case "checkApiKey":
            this._checkApiKey()
            return
          case "setSocraticLevel":
            this._setSocraticLevel(message.level)
            return
          case "updateExperience":
            this._updateExperience(message.exp, message.level)
            return
          case "updateGoalProgress":
            this._updateGoalProgress(message.goalId, message.increment)
            return
          case "resetWeeklyGoals":
            this._resetWeeklyGoals()
            return
          case "recordActivity":
            this._recordActivity(message.title, message.description)
            return
          case "updateLearningStats":
            this._updateLearningStats(message.stats)
            return
        }
      },
      null,
      this._disposables,
    )
  }

  private _loadLearningStats() {
    // Get stored stats or initialize default values
    const storedStats = this._context.globalState.get<LearningStats>("codecraft.learningStats")

    if (storedStats) {
      this._learningStats = storedStats
    } else {
      // Create default stats
      this._learningStats = {
        skills: {
          javascript: 65,
          problemSolving: 78,
          debugging: 42,
          codeOrganization: 55,
        },
        streak: {
          currentStreak: 5,
          lastActive: new Date().toISOString(),
          activeDays: ["2025-04-01", "2025-04-02", "2025-04-03", "2025-04-04", "2025-04-05"],
        },
        errorResolution: {
          rate: 75,
          avgTime: 14, // minutes
          totalFixed: 23,
        },
        activeTimes: {
          "9AM": 30,
          "12PM": 40,
          "3PM": 60,
          "6PM": 100,
          "9PM": 80,
          "12AM": 35,
        },
        progressHistory: [
          { date: "2025-03-01", value: 10 },
          { date: "2025-03-08", value: 25 },
          { date: "2025-03-15", value: 40 },
          { date: "2025-03-22", value: 55 },
          { date: "2025-03-29", value: 65 },
          { date: "2025-04-05", value: 80 },
        ],
      }

      // Save default stats
      this._context.globalState.update("codecraft.learningStats", this._learningStats)
    }

    // Send stats to webview
    this._panel.webview.postMessage({
      command: "updateLearningStats",
      stats: this._learningStats,
    })
  }

  private _loadActivities() {
    // Get stored activities or initialize empty array
    const storedActivities = this._context.globalState.get<Activity[]>("codecraft.activities")

    if (storedActivities && storedActivities.length > 0) {
      this._activities = storedActivities
    } else {
      this._activities = []
    }
  }

  private _saveActivities() {
    this._context.globalState.update("codecraft.activities", this._activities)
  }

  private _recordActivity(title: string, description: string) {
    const newActivity: Activity = {
      date: new Date().toISOString(),
      title: title,
      description: description,
    }

    this._activities.unshift(newActivity) // Add to the beginning
    if (this._activities.length > 10) {
      this._activities.pop() // Keep only the latest 10 activities
    }
    this._saveActivities()

    // Send updated activities to webview
    this._panel.webview.postMessage({
      command: "updateActivities",
      activities: this._activities,
    })

    // Update skill progress based on activity type
    if (title === "Error Explained") {
      // Update error resolution stats
      this._learningStats.errorResolution.totalFixed += 1
      this._context.globalState.update("codecraft.learningStats", this._learningStats)

      // Send updated stats to webview
      this._panel.webview.postMessage({
        command: "updateLearningStats",
        stats: this._learningStats,
      })
    }
  }

  public analyzeCode() {
    // Analyze code for learning patterns
    // This is a simplified version that just updates the code organization skill
    this._learningStats.skills.codeOrganization = Math.min(this._learningStats.skills.codeOrganization + 1, 100)

    // Update learning stats
    this._context.globalState.update("codecraft.learningStats", this._learningStats)

    // Send updated stats to webview
    this._panel.webview.postMessage({
      command: "updateLearningStats",
      stats: this._learningStats,
    })
  }

  private _loadWeeklyGoals() {
    // Get stored goals or create default ones if none exist
    const storedGoals = this._context.globalState.get<WeeklyGoal[]>("codecraft.weeklyGoals")

    if (storedGoals && storedGoals.length > 0) {
      this._weeklyGoals = storedGoals

      // Check if goals need to be reset (weekly)
      const now = new Date()
      const lastReset = new Date(this._weeklyGoals[0].lastReset)
      const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24))

      // Reset goals if it's been more than 7 days
      if (daysSinceReset >= 7) {
        this._resetWeeklyGoals()
      }
    } else {
      // Create default goals
      const now = new Date().toISOString()
      this._weeklyGoals = [
        { id: "learning", name: "Learning Progress", target: 100, current: 0, lastReset: now },
        { id: "challenges", name: "Challenges Completed", target: 5, current: 0, lastReset: now },
      ]
      this._saveWeeklyGoals()
    }
  }

  private _saveWeeklyGoals() {
    this._context.globalState.update("codecraft.weeklyGoals", this._weeklyGoals)
  }

  private _resetWeeklyGoals() {
    const now = new Date().toISOString()
    this._weeklyGoals.forEach((goal) => {
      goal.current = 0
      goal.lastReset = now
    })
    this._saveWeeklyGoals()

    // Send updated goals to webview
    this._panel.webview.postMessage({
      command: "updateWeeklyGoals",
      goals: this._weeklyGoals,
    })
  }

  private _updateGoalProgress(goalId: string, increment: number) {
    const goal = this._weeklyGoals.find((g) => g.id === goalId)
    if (goal) {
      goal.current = Math.min(goal.current + increment, goal.target)
      this._saveWeeklyGoals()

      // Send updated goals to webview
      this._panel.webview.postMessage({
        command: "updateWeeklyGoals",
        goals: this._weeklyGoals,
      })
    }
  }

  public reveal() {
    this._panel.reveal()
  }

  private async _checkApiKey() {
    const config = vscode.workspace.getConfiguration("codecraft")
    const apiToken = config.get<string>("huggingFaceApiToken")

    if (!apiToken) {
      this._panel.webview.postMessage({
        command: "apiKeyStatus",
        status: "missing",
      })
    } else {
      this._panel.webview.postMessage({
        command: "apiKeyStatus",
        status: "set",
      })
    }
  }

  public async explainCurrentError() {
    // Get current diagnostics and send to webview
    const editor = vscode.window.activeTextEditor
    if (editor) {
      const document = editor.document
      const diagnostics = vscode.languages.getDiagnostics(document.uri)

      if (diagnostics.length > 0) {
        const error = diagnostics[0]
        const errorMessage = error.message
        const errorRange = error.range
        const errorCode = error.code
        const lineText = document.lineAt(errorRange.start.line).text

        const errorInfo = {
          message: errorMessage,
          code: errorCode,
          line: errorRange.start.line + 1,
          column: errorRange.start.character + 1,
          text: lineText,
        }

        // Get AI explanation
        const response = await this._aiService.explainError(errorInfo)

        this._panel.webview.postMessage({
          command: "receiveMessage",
          message: response,
        })

        // Record activity
        this._recordActivity("Error Explained", `Explained error: ${errorMessage}`)

        // Update learning progress goal
        this._updateGoalProgress("learning", 5)

        // Update debugging skill
        this._learningStats.skills.debugging = Math.min(this._learningStats.skills.debugging + 2, 100)
        this._context.globalState.update("codecraft.learningStats", this._learningStats)

        // Send updated stats to webview
        this._panel.webview.postMessage({
          command: "updateLearningStats",
          stats: this._learningStats,
        })
      }
    }
  }

  public updateDiagnostics() {
    const editor = vscode.window.activeTextEditor
    if (editor) {
      const document = editor.document
      const diagnostics = vscode.languages.getDiagnostics(document.uri)

      this._panel.webview.postMessage({
        command: "updateDiagnostics",
        hasErrors: diagnostics.length > 0,
      })
    }
  }

  private async _handleUserMessage(text: string) {
    // Send message to AI service
    const response = await this._aiService.sendMessage(text)

    // Send response back to webview
    this._panel.webview.postMessage({
      command: "receiveMessage",
      message: response,
    })

    // Record activity
    this._recordActivity("Sent Message", `Sent message: ${text}`)

    // Update learning progress goal
    this._updateGoalProgress("learning", 2)

    // Update JavaScript skill
    this._learningStats.skills.javascript = Math.min(this._learningStats.skills.javascript + 1, 100)
    this._context.globalState.update("codecraft.learningStats", this._learningStats)

    // Send updated stats to webview
    this._panel.webview.postMessage({
      command: "updateLearningStats",
      stats: this._learningStats,
    })
  }

  private _toggleMode(mode: string) {
    // Handle mode toggle (Text Guide vs Visual Metaphor)
    this._responseMode = mode as ResponseMode
    this._aiService.setResponseMode(this._responseMode)

    vscode.window.showInformationMessage(`Switched to ${mode} mode`)
  }

  private _showLearningJournal() {
    // Switch to learning journal tab
    this._panel.webview.postMessage({
      command: "showLearningJournal",
    })
  }

  private async _setSocraticLevel(level: string) {
    // Update the configuration
    await vscode.workspace.getConfiguration("codecraft").update("socraticStrictness", level, true)

    vscode.window.showInformationMessage(`Socratic teaching level set to: ${level}`)

    // No need to reset the conversation, the AI service will pick up the new setting
  }

  private async _updateExperience(exp: number, level: number) {
    // Update the stored values
    this._userExp = exp
    this._userLevel = level

    // Calculate new XP requirement for next level (increases with each level)
    this._expToNextLevel = Math.floor(100 * Math.pow(1.5, level - 1))

    // Save to global state
    await this._context.globalState.update("codecraft.userExp", this._userExp)
    await this._context.globalState.update("codecraft.userLevel", this._userLevel)
    await this._context.globalState.update("expToNextLevel", this._expToNextLevel)

    // Update learning progress goal when gaining experience
    this._updateGoalProgress("learning", 1)

    // Update problem solving skill
    this._learningStats.skills.problemSolving = Math.min(this._learningStats.skills.problemSolving + 1, 100)
    this._context.globalState.update("codecraft.learningStats", this._learningStats)

    // Send updated stats to webview
    this._panel.webview.postMessage({
      command: "updateLearningStats",
      stats: this._learningStats,
    })
  }

  private _update() {
    const webview = this._panel.webview
    this._panel.title = "AI Coding Mentor"
    this._panel.webview.html = this._getHtmlForWebview(webview)

    // Send initial experience data
    this._panel.webview.postMessage({
      command: "initExperience",
      exp: this._userExp,
      level: this._userLevel,
      expToNextLevel: this._expToNextLevel,
    })

    // Send initial weekly goals data
    this._panel.webview.postMessage({
      command: "updateWeeklyGoals",
      goals: this._weeklyGoals,
    })

    // Send initial activities data
    this._panel.webview.postMessage({
      command: "updateActivities",
      activities: this._activities,
    })

    // Send initial learning stats data
    this._panel.webview.postMessage({
      command: "updateLearningStats",
      stats: this._learningStats,
    })
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get path to media files
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "styles.css"))
    const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "codicon.css"))
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"))

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce()

    // Read the HTML file
    const htmlPath = vscode.Uri.joinPath(this._extensionUri, "media", "webview.html")
    const htmlPathOnDisk = htmlPath.fsPath

    let html = fs.readFileSync(htmlPathOnDisk, "utf8")

    // Replace placeholders in the HTML
    html = html.replace(/{{cspSource}}/g, webview.cspSource)
    html = html.replace(/{{nonce}}/g, nonce)
    html = html.replace(/{{styleUri}}/g, styleUri.toString())
    html = html.replace(/{{codiconsUri}}/g, codiconsUri.toString())
    html = html.replace(/{{scriptUri}}/g, scriptUri.toString())

    return html
  }

  private dispose() {
    AIMentorPanel.currentPanel = undefined

    // Clean up our resources
    this._panel.dispose()

    while (this._disposables.length) {
      const disposable = this._disposables.pop()
      if (disposable) {
        disposable.dispose()
      }
    }
  }

  // Update learning stats
  private _updateLearningStats(stats: LearningStats) {
    // Store updated stats
    this._learningStats = stats
    this._context.globalState.update("codecraft.learningStats", stats)

    // Send updated stats to webview
    this._panel.webview.postMessage({
      command: "updateLearningStats",
      stats: stats,
    })
  }
}

function getNonce() {
  let text = ""
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

export function deactivate() {}
