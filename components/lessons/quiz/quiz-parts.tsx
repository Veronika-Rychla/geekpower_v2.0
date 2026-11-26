import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

/*
 * `<Question>` and `<Option>` inside a quiz. They never render on their own:
 * the quiz component reads their content with `readChoiceQuizParts` and lays
 * it out itself. No "use client", so both the lesson page (server) and the
 * editor preview (client) can use them. Each side must map the MDX names to
 * these exact functions, since the parts are recognised by identity.
 */

interface QuizPartProps {
  id?: string;
  children?: ReactNode;
}

export function QuizQuestion({ children }: QuizPartProps) {
  return <>{children}</>;
}

export function QuizOption({ children }: QuizPartProps) {
  return <>{children}</>;
}

/** Maps the MDX names to the part components. */
export const QUIZ_PART_COMPONENTS = {
  Question: QuizQuestion,
  Option: QuizOption,
};

export interface RenderedChoiceOption {
  id: string;
  content: ReactNode;
}

/** The question and options of a choice quiz, looking through any `<p>` wrappers MDX added. */
export function readChoiceQuizParts(children: ReactNode): {
  question: ReactNode;
  options: RenderedChoiceOption[];
} {
  let question: ReactNode = null;
  const options: RenderedChoiceOption[] = [];

  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      const element = child as ReactElement<QuizPartProps>;
      if (element.type === QuizQuestion) {
        question = element.props.children;
      } else if (element.type === QuizOption) {
        options.push({ id: element.props.id ?? "", content: element.props.children });
      } else {
        walk(element.props.children);
      }
    });
  };
  walk(children);

  return { question, options };
}
