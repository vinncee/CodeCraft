import * as vscode from "vscode"
import fetch from "node-fetch"

export interface AIResponse {
  text: string
  isUser: boolean
  timestamp: string
}

export enum ResponseMode {
  Text = "text",
  Visual = "visual",
}

export class AIService {
  private hfApiToken: string | undefined
  private responseMode: ResponseMode = ResponseMode.Text
  private context: vscode.ExtensionContext
  private conversationHistory: { role: "system" | "user" | "assistant"; content: string }[] = []
  private modelId = "mistralai/Mistral-7B-Instruct-v0.2" // Default model
  private socraticStrictness = "balanced" // Default value

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.initializeHuggingFace()
  }

  private async initializeHuggingFace() {
    // Get API token from configuration
    const config = vscode.workspace.getConfiguration("codecraft")
    this.hfApiToken = config.get<string>("huggingFaceApiToken")
    this.modelId = config.get<string>("huggingFaceModel") || this.modelId
    this.socraticStrictness = config.get<string>("socraticStrictness") || "balanced"

    if (!this.hfApiToken) {
      vscode.window
        .showWarningMessage("Hugging Face API token not found. Please set your API token in settings.", "Open Settings")
        .then((selection) => {
          if (selection === "Open Settings") {
            vscode.commands.executeCommand("workbench.action.openSettings", "codecraft.huggingFaceApiToken")
          }
        })
      return
    }

    // Initialize conversation with system prompt
    this.resetConversation()
  }

  public resetConversation() {
    // Set up the initial system prompt that guides the AI to act as a Socratic mentor
    this.conversationHistory = [
      {
        role: "system",
        content: `You are CodeCraft, an AI coding mentor designed to help programmers learn through Socratic questioning rather than direct answers.

IMPORTANT: NEVER provide direct solutions or answers to coding problems. Your role is to guide through questions.

Your Socratic approach:
1. Ask clarifying questions to understand the user's problem and their current understanding
2. Guide users to discover solutions themselves through targeted questions
3. Use analogies and visual metaphors to explain concepts without giving away answers
4. Break down complex problems into smaller, manageable steps with guiding questions for each step
5. Encourage debugging and testing practices by asking "What would happen if...?" questions
6. Provide hints that point in the right direction without revealing solutions
7. Respond to direct requests for answers with questions that help the user think through the problem

Examples of good responses:
- Instead of "You should use a for loop here", ask "What kind of iteration would be appropriate here? What are the options?"
- Instead of "The error is caused by a null reference", ask "What might happen if this variable is null? How could you check for that?"
- Instead of "Here's the solution: [code]", ask "What approach have you tried so far? What specific part are you stuck on?"

Current mode: ${this.responseMode}`,
      },
    ]
  }

  public setResponseMode(mode: ResponseMode) {
    this.responseMode = mode

    // Update the system message with the new mode
    if (this.conversationHistory.length > 0 && this.conversationHistory[0].role === "system") {
      this.conversationHistory[0].content = this.conversationHistory[0].content.replace(
        /Current mode: (text|visual)/,
        `Current mode: ${mode}`,
      )
    }
  }

  private formatConversationForHuggingFace(): string {
    // Format the conversation history for Hugging Face models
    let formattedConversation = ""

    // Add system message as a special instruction with strictness level
    if (this.conversationHistory.length > 0 && this.conversationHistory[0].role === "system") {
      let systemPrompt = this.conversationHistory[0].content

      // Add strictness level to the system prompt
      if (!systemPrompt.includes("Socratic strictness level:")) {
        systemPrompt += `\n\nSocratic strictness level: ${this.socraticStrictness.toUpperCase()}`

        if (this.socraticStrictness === "strict") {
          systemPrompt += "\nNEVER provide direct code solutions. Always guide through questions."
        } else if (this.socraticStrictness === "balanced") {
          systemPrompt += "\nPrimarily guide through questions, but small code hints are acceptable when necessary."
        } else {
          systemPrompt += "\nGuide through questions when possible, but provide more direct help for complex problems."
        }
      }

      formattedConversation += `<s>[INST] ${systemPrompt} [/INST]</s>\n`
    }

    // Add the conversation history
    for (let i = 1; i < this.conversationHistory.length; i++) {
      const message = this.conversationHistory[i]
      if (message.role === "user") {
        formattedConversation += `<s>[INST] ${message.content} [/INST]`
      } else if (message.role === "assistant") {
        formattedConversation += ` ${message.content}</s>\n`
      } else if (message.role === "system" && i > 0) {
        // For system messages that aren't the first one, treat them as special instructions
        formattedConversation += `<s>[INST] ${message.content} [/INST]</s>\n`
      }
    }

    return formattedConversation
  }

  private ensureSocraticResponse(response: string): string {
    // Apply different levels of filtering based on strictness setting
    switch (this.socraticStrictness) {
      case "strict":
        // In strict mode, aggressively filter out direct answers
        return this.applySocraticFilters(response, 0.4, 3, true)

      case "balanced":
        // In balanced mode, allow some direct help but still encourage questions
        return this.applySocraticFilters(response, 0.25, 2, false)

      case "flexible":
        // In flexible mode, only intervene for very direct solutions
        return this.applySocraticFilters(response, 0.15, 1, false)

      default:
        return response
    }
  }

  private applySocraticFilters(
    response: string,
    minQuestionRatio: number,
    minQuestions: number,
    removeCodeBlocks: boolean,
  ): string {
    // Check if the response contains code blocks that might be direct solutions
    const containsCodeBlock = response.includes("```") && !response.includes("```?")

    // Check if the response has enough questions (Socratic method relies on questioning)
    const questionCount = (response.match(/\?/g) || []).length
    const sentenceCount = (response.match(/[.!?]+/g) || []).length
    const questionRatio = questionCount / Math.max(sentenceCount, 1)

    let modifiedResponse = response

    // If strict mode and contains code blocks that look like solutions, replace them
    if (removeCodeBlocks && containsCodeBlock) {
      modifiedResponse = modifiedResponse.replace(
        /```[\s\S]*?```/g,
        "```\n// Instead of providing the code directly, let's think through how to approach this problem.\n// What are the key steps you would need to implement?\n```",
      )
    }

    // If the response doesn't seem Socratic enough, append a reminder
    if (
      (containsCodeBlock && questionRatio < minQuestionRatio) ||
      (questionCount < minQuestions && modifiedResponse.length > 200)
    ) {
      modifiedResponse +=
        "\n\nRemember, I'm here to guide your learning through questions rather than providing direct solutions. What specific part of this problem are you finding challenging? What approaches have you considered so far?"
    }

    return modifiedResponse
  }

  public async sendMessage(message: string): Promise<AIResponse> {
    if (!this.hfApiToken) {
      this.initializeHuggingFace()
      if (!this.hfApiToken) {
        return {
          text: "I'm having trouble connecting to my AI capabilities. Please check your Hugging Face API token in the settings.",
          isUser: false,
          timestamp: new Date().toISOString(),
        }
      }
    }

    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: message,
    })

    try {
      // If in visual mode, add a reminder to generate visual explanations
      let visualPrompt = ""
      if (this.responseMode === ResponseMode.Visual) {
        visualPrompt =
          "\nRemember to use visual metaphors and analogies in your explanation. Describe visual scenarios that help explain the concept."

        // Add a temporary system message for this response
        this.conversationHistory.push({
          role: "system",
          content: visualPrompt,
        })
      }

      // Format the conversation for the Hugging Face model
      const prompt = this.formatConversationForHuggingFace()

      // Call Hugging Face Inference API
      const response = await fetch(`https://api-inference.huggingface.co/models/${this.modelId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.hfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false,
          },
        }),
      })

      // Remove the temporary visual prompt if it was added
      if (this.responseMode === ResponseMode.Visual) {
        this.conversationHistory.pop()
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Hugging Face API error: ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      const aiMessage = data[0]?.generated_text || "I'm sorry, I couldn't generate a response."

      // Apply Socratic filter to ensure the response guides rather than solves
      const socraticResponse = this.ensureSocraticResponse(aiMessage)

      // Add AI response to history
      this.conversationHistory.push({
        role: "assistant",
        content: socraticResponse,
      })

      return {
        text: socraticResponse,
        isUser: false,
        timestamp: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error("Error calling Hugging Face:", error)

      return {
        text: `I encountered an error: ${error.message || "Unknown error"}. Please try again later.`,
        isUser: false,
        timestamp: new Date().toISOString(),
      }
    }
  }

  public async explainError(error: any): Promise<AIResponse> {
    if (!this.hfApiToken) {
      this.initializeHuggingFace()
      if (!this.hfApiToken) {
        return {
          text: "I'm having trouble connecting to my AI capabilities. Please check your Hugging Face API token in the settings.",
          isUser: false,
          timestamp: new Date().toISOString(),
        }
      }
    }

    const errorPrompt = `I have an error in my code: "${error.message}" at line ${error.line}, column ${error.column}. The code at this line is: "${error.text}". Can you help me understand what's happening?`

    // Add error as a user message
    this.conversationHistory.push({
      role: "user",
      content: errorPrompt,
    })

    try {
      // Add a temporary system message for error explanation
      this.conversationHistory.push({
        role: "system",
        content: `For this error explanation, use a Socratic approach. Don't just explain the error, but guide the user to understand it themselves. Ask questions that lead them to discover the root cause. Turn this into a learning opportunity about the underlying concept. Make it a puzzle for them to solve with your guidance.`,
      })

      // Format the conversation for the Hugging Face model
      const prompt = this.formatConversationForHuggingFace()

      // Call Hugging Face Inference API
      const response = await fetch(`https://api-inference.huggingface.co/models/${this.modelId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.hfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false,
          },
        }),
      })

      // Remove the temporary system message
      this.conversationHistory.pop()

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Hugging Face API error: ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      const aiMessage = data[0]?.generated_text || "I'm sorry, I couldn't analyze this error."

      // Apply Socratic filter
      const socraticResponse = this.ensureSocraticResponse(aiMessage)

      // Add AI response to history
      this.conversationHistory.push({
        role: "assistant",
        content: socraticResponse,
      })

      return {
        text: socraticResponse,
        isUser: false,
        timestamp: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error("Error calling Hugging Face for error explanation:", error)

      return {
        text: `I encountered an error while analyzing your code: ${error.message || "Unknown error"}. Please try again later.`,
        isUser: false,
        timestamp: new Date().toISOString(),
      }
    }
  }
}

