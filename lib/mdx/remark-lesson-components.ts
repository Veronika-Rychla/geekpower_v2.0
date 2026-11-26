import type { Node, Parent } from "unist";
import type { VFile } from "vfile";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";

import {
  CHOICE_MAX_OPTIONS,
  CHOICE_MIN_OPTIONS,
  QUIZ_ID_PATTERN,
  QUIZ_PART_TAGS,
  QUIZ_TAGS,
  type ChoiceOption,
  type QuizDefinition,
} from "@/lib/quizzes";

type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;

export interface RemarkLessonComponentsOptions {
  /** Receives every quiz in the lesson, in document order. */
  onQuizzes?: (quizzes: QuizDefinition[]) => void;
}

const EXPRESSION_TYPES = new Set(["mdxFlowExpression", "mdxTextExpression", "mdxjsEsm"]);
const CHOICE_TAG = QUIZ_TAGS.choice;

function isJsxElement(node: Node): node is JsxElement {
  return node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";
}

function hasChildren(node: Node): node is Parent {
  return Array.isArray((node as Parent).children);
}

/** Lowercase names (`div`, `br`) are plain HTML; capitalized ones are our components. */
function isComponentName(name: string | null): name is string {
  return !!name && /^[A-Z]/.test(name);
}

/**
 * Validates lesson MDX and collects its quizzes. Lessons are written in the
 * browser and compiled with JavaScript blocked, so this rejects (with a
 * position, for the editor's error message) anything that would otherwise be
 * dropped silently or crash at render time: `{expressions}`, imports, unknown
 * components and malformed quizzes.
 */
export function remarkLessonComponents(options: RemarkLessonComponentsOptions = {}) {
  return (tree: Node, file: VFile) => {
    const source = String(file.value);
    const quizzes: QuizDefinition[] = [];
    const quizIds = new Set<string>();

    /** The Markdown between an element's tags, straight from the source. */
    function innerText(element: JsxElement): string {
      const first = element.children[0]?.position?.start.offset;
      const last = element.children.at(-1)?.position?.end.offset;
      return first === undefined || last === undefined ? "" : source.slice(first, last).trim();
    }

    function stringAttribute(element: JsxElement, name: string): string | undefined {
      for (const attribute of element.attributes) {
        if (attribute.type !== "mdxJsxAttribute" || attribute.name !== name) continue;
        if (typeof attribute.value !== "string") {
          file.fail(`<${element.name}> ${name}="…" must be plain text in quotes.`, element);
        }
        return attribute.value;
      }
      return undefined;
    }

    /** `<Question>`/`<Option>` children, looking through the paragraphs MDX may wrap them in. */
    function quizParts(quiz: JsxElement): JsxElement[] {
      const parts: JsxElement[] = [];
      const walk = (node: Node) => {
        for (const child of hasChildren(node) ? node.children : []) {
          if (isJsxElement(child) && QUIZ_PART_TAGS.includes(child.name as (typeof QUIZ_PART_TAGS)[number])) {
            parts.push(child);
          } else if (child.type === "paragraph") {
            walk(child);
          } else if (!(child.type === "text" && "value" in child && String(child.value).trim() === "")) {
            file.fail(`Only <Question> and <Option> can go inside <${quiz.name}>.`, child);
          }
        }
      };
      walk(quiz);
      return parts;
    }

    function parseChoiceQuiz(element: JsxElement) {
      const id = stringAttribute(element, "id");
      if (!id || !QUIZ_ID_PATTERN.test(id)) {
        file.fail(`<${CHOICE_TAG}> needs an id="…" made of letters, digits, "-" or "_".`, element);
      }
      if (quizIds.has(id)) {
        file.fail(`Two quizzes share the id "${id}". Each quiz needs its own id.`, element);
      }
      quizIds.add(id);

      const parts = quizParts(element);
      const questions = parts.filter((part) => part.name === "Question");
      if (questions.length !== 1) {
        file.fail(`<${CHOICE_TAG} id="${id}"> needs exactly one <Question>.`, element);
      }
      const question = innerText(questions[0]);
      if (!question) {
        file.fail(`The <Question> of quiz "${id}" is empty.`, questions[0]);
      }

      const options: ChoiceOption[] = [];
      for (const part of parts.filter((p) => p.name === "Option")) {
        const optionId = stringAttribute(part, "id");
        if (!optionId) {
          file.fail(`Every <Option> in quiz "${id}" needs an id="…".`, part);
        }
        if (options.some((option) => option.id === optionId)) {
          file.fail(`Quiz "${id}" has two options with id "${optionId}".`, part);
        }
        const text = innerText(part);
        if (!text) {
          file.fail(`Option "${optionId}" of quiz "${id}" is empty.`, part);
        }
        options.push({ id: optionId, text });
      }
      if (options.length < CHOICE_MIN_OPTIONS || options.length > CHOICE_MAX_OPTIONS) {
        file.fail(
          `Quiz "${id}" needs ${CHOICE_MIN_OPTIONS}–${CHOICE_MAX_OPTIONS} options, it has ${options.length}.`,
          element,
        );
      }

      const correctId = stringAttribute(element, "correct");
      if (!correctId || !options.some((option) => option.id === correctId)) {
        file.fail(`Quiz "${id}" needs correct="…" set to the id of one of its options.`, element);
      }

      quizzes.push({ kind: "choice", id, question, options, correctId });
    }

    function visit(node: Node, insideQuiz: boolean) {
      if (EXPRESSION_TYPES.has(node.type)) {
        file.fail(
          node.type === "mdxjsEsm"
            ? "Lessons can't use import/export."
            : "Curly braces start a JavaScript expression, which lessons don't allow. Write \\{ and \\} to show braces.",
          node,
        );
      }

      if (isJsxElement(node) && isComponentName(node.name)) {
        if (node.name === CHOICE_TAG) {
          if (insideQuiz) file.fail(`A quiz can't contain another quiz.`, node);
          parseChoiceQuiz(node);
          // Question/Option content is ordinary Markdown: still check it for expressions
          node.children.forEach((child) => visit(child, true));
          return;
        }
        const isPart = QUIZ_PART_TAGS.includes(node.name as (typeof QUIZ_PART_TAGS)[number]);
        if (!isPart) {
          file.fail(`Unknown component <${node.name}>. Lessons can use <${CHOICE_TAG}> only.`, node);
        }
        if (!insideQuiz) {
          file.fail(`<${node.name}> only works inside <${CHOICE_TAG}>.`, node);
        }
      }

      if (hasChildren(node)) {
        node.children.forEach((child) => visit(child, insideQuiz));
      }
    }

    visit(tree, false);
    options.onQuizzes?.(quizzes);
  };
}
