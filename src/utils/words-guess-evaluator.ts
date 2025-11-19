export type LetterState = "correct" | "present" | "absent";

export interface LetterEvaluation {
  letter: string;
  state: LetterState;
}

export interface GuessEvaluation {
  letters: LetterEvaluation[];
  pattern: string;
  isCorrect: boolean;
}

export function evaluateWordGuess(
  guess: string,
  target: string,
): GuessEvaluation {
  const guessChars = guess.split("");
  const targetChars = target.split("");
  const letters: LetterEvaluation[] = guessChars.map((letter) => ({
    letter,
    state: "absent",
  }));
  const usedTarget = new Array(targetChars.length).fill(false);

  for (let index = 0; index < guessChars.length; index++) {
    if (guessChars[index] === targetChars[index]) {
      letters[index].state = "correct";
      usedTarget[index] = true;
    }
  }

  for (let index = 0; index < guessChars.length; index++) {
    if (letters[index].state !== "absent") continue;
    const letter = guessChars[index];
    const targetIndex = targetChars.findIndex(
      (targetLetter, targetLetterIndex) =>
        !usedTarget[targetLetterIndex] && targetLetter === letter,
    );
    if (targetIndex !== -1) {
      letters[index].state = "present";
      usedTarget[targetIndex] = true;
    }
  }

  return {
    letters,
    pattern: buildPatternFromLetters(letters),
    isCorrect: letters.every((entry) => entry.state === "correct"),
  };
}

export function patternToLetters(
  guessWord: string,
  pattern: string,
): LetterEvaluation[] {
  return guessWord.split("").map((letter, index) => ({
    letter,
    state: patternDigitToState(pattern.charAt(index)),
  }));
}

function buildPatternFromLetters(letters: LetterEvaluation[]) {
  return letters
    .map((entry) => {
      switch (entry.state) {
        case "correct":
          return "2";
        case "present":
          return "1";
        default:
          return "0";
      }
    })
    .join("");
}

function patternDigitToState(digit: string): LetterState {
  switch (digit) {
    case "2":
      return "correct";
    case "1":
      return "present";
    default:
      return "absent";
  }
}
