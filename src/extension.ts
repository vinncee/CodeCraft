import * as vscode from "vscode"
import * as fs from "fs"
import { AIService, ResponseMode } from "./ai-service"

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
  vscode.languages.onDidChangeDiagnostics((e) => {
    if (AIMentorPanel.currentPanel) {
      AIMentorPanel.currentPanel.updateDiagnostics()
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
        }
      },
      null,
      this._disposables,
    )
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
    await this._context.globalState.update("codecraft.expToNextLevel", this._expToNextLevel)
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

