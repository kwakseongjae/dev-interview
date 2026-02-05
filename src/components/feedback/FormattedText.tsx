"use client";

import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";

interface FormattedTextProps {
  text: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * FormattedText - Renders text with **bold** markdown formatting
 * Parses **text** patterns and renders them as highlighted/bold spans
 */
export function FormattedText({
  text,
  className,
  highlightClassName = "font-semibold text-foreground bg-primary/10 px-1 rounded",
}: FormattedTextProps) {
  const parts = useMemo(() => parseMarkdownBold(text), [text]);

  return (
    <span className={className}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part.isBold ? (
            <mark className={cn("bg-transparent", highlightClassName)}>
              {part.text}
            </mark>
          ) : (
            part.text
          )}
        </Fragment>
      ))}
    </span>
  );
}

interface TextPart {
  text: string;
  isBold: boolean;
}

/**
 * Parses markdown bold syntax (**text**) into parts
 */
function parseMarkdownBold(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        isBold: false,
      });
    }

    // Add the bold text (without the ** markers)
    parts.push({
      text: match[1],
      isBold: true,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isBold: false,
    });
  }

  // If no parts were added, return the original text
  if (parts.length === 0) {
    parts.push({ text, isBold: false });
  }

  return parts;
}

export default FormattedText;
