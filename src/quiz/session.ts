export interface Session {
  correct: number
  incorrect: number
}

export function createSession(): Session {
  return { correct: 0, incorrect: 0 }
}

export function recordResult(session: Session, correct: boolean): Session {
  return correct
    ? { ...session, correct: session.correct + 1 }
    : { ...session, incorrect: session.incorrect + 1 }
}
