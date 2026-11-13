import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react'
import type { AICommand, AIResponse } from '../services/aiBridge'

type Handler = (command: AICommand) => void

type HudCommandContextValue = {
  registerHandlers: (handlers: Partial<Record<AICommand['action'], Handler>>) => void
  dispatchCommand: (command?: AICommand) => void
  executeAIResponse: (response: AIResponse) => void
}

const HudCommandContext = createContext<HudCommandContextValue | null>(null)

export function HudCommandProvider({ children }: { children: ReactNode }) {
  const handlers = useRef<Partial<Record<AICommand['action'], Handler>>>({})
  const registerHandlers = useCallback((next: Partial<Record<AICommand['action'], Handler>>) => { handlers.current = next }, [])
  const dispatchCommand = useCallback((command?: AICommand) => { if (command) handlers.current[command.action]?.(command) }, [])
  const executeAIResponse = useCallback((response: AIResponse) => { dispatchCommand(response.command) }, [dispatchCommand])
  return <HudCommandContext.Provider value={{ registerHandlers, dispatchCommand, executeAIResponse }}>{children}</HudCommandContext.Provider>
}

export function useHudCommand() {
  const value = useContext(HudCommandContext)
  if (!value) throw new Error('useHudCommand must be used inside HudCommandProvider')
  return value
}
