import type { InterpretedMessage, MessageInterpreterContext } from '../message-interpreter.js';

export interface MessageInterpreterPort {
  interpret(message: string, context: MessageInterpreterContext): Promise<InterpretedMessage>;
}
