export interface ThinkingParseResult {
  thinkingDelta: string | null;
  textContentDelta: string | null;
}

enum ParseState {
  NORMAL = 'NORMAL',
  IN_THINKING = 'IN_THINKING',
  PARTIAL_TAG = 'PARTIAL_TAG',
}

/**
 * Utility class to parse thinking content from streaming text that can be split across chunks.
 * Handles <thinking>...</thinking> tags that may be incomplete in individual chunks.
 */
export class ThinkingContentParser {
  private state: ParseState = ParseState.NORMAL;
  private buffer: string = '';
  private readonly openingTag = '<thinking>';
  private readonly closingTag = '</thinking>';

  /**
   * Parse a chunk of text and extract thinking and regular content
   */
  parse(chunk: string): ThinkingParseResult {
    if (!chunk) {
      return { thinkingDelta: null, textContentDelta: null };
    }

    // Add chunk to buffer for processing
    this.buffer += chunk;

    let thinkingContent = '';
    let textContent = '';
    let lastProcessedIndex = 0;

    // Process the buffer looking for thinking tags
    while (lastProcessedIndex < this.buffer.length) {
      const remainingBuffer = this.buffer.substring(lastProcessedIndex);

      if (this.state === ParseState.NORMAL) {
        // Look for opening thinking tag
        const thinkingStartIndex = remainingBuffer.indexOf(this.openingTag);

        if (thinkingStartIndex === -1) {
          // No opening tag found, check if we have a partial tag at the end
          const partialMatch = this.findPartialOpeningTag(remainingBuffer);
          if (partialMatch.isPartial) {
            // Add content before potential partial tag to text content
            textContent += remainingBuffer.substring(
              0,
              partialMatch.startIndex,
            );
            lastProcessedIndex += partialMatch.startIndex;
            this.state = ParseState.PARTIAL_TAG;
            break; // Wait for more chunks
          } else {
            // No thinking tags, add all to text content
            textContent += remainingBuffer;
            lastProcessedIndex = this.buffer.length;
          }
        } else {
          // Found opening tag, add content before it to text content
          textContent += remainingBuffer.substring(0, thinkingStartIndex);
          lastProcessedIndex += thinkingStartIndex + this.openingTag.length;
          this.state = ParseState.IN_THINKING;
        }
      } else if (this.state === ParseState.IN_THINKING) {
        // Look for closing thinking tag
        const thinkingEndIndex = remainingBuffer.indexOf(this.closingTag);

        if (thinkingEndIndex === -1) {
          // No closing tag found, check if we have a partial closing tag at the end
          const partialMatch = this.findPartialClosingTag(remainingBuffer);
          if (partialMatch.isPartial) {
            // Add content before potential partial tag to thinking content
            thinkingContent += remainingBuffer.substring(
              0,
              partialMatch.startIndex,
            );
            lastProcessedIndex += partialMatch.startIndex;
            this.state = ParseState.PARTIAL_TAG;
            break; // Wait for more chunks
          } else {
            // No closing tag found, add all to thinking content
            thinkingContent += remainingBuffer;
            lastProcessedIndex = this.buffer.length;
          }
        } else {
          // Found closing tag, add content before it to thinking content
          thinkingContent += remainingBuffer.substring(0, thinkingEndIndex);
          lastProcessedIndex += thinkingEndIndex + this.closingTag.length;
          this.state = ParseState.NORMAL;
        }
      } else if (this.state === ParseState.PARTIAL_TAG) {
        // We were in a partial tag state, check if the new content completes the tag
        const completeTag = this.checkAndCompletePartialTag(remainingBuffer);
        if (completeTag.completed) {
          lastProcessedIndex += completeTag.consumedLength;
          this.state = completeTag.newState;
        } else {
          // Still partial, wait for more content
          break;
        }
      }
    }

    // Clean up processed content from buffer
    this.buffer = this.buffer.substring(lastProcessedIndex);

    return {
      thinkingDelta: thinkingContent || null,
      textContentDelta: textContent || null,
    };
  }

  /**
   * Find partial opening tag at the end of the buffer
   */
  private findPartialOpeningTag(text: string): {
    isPartial: boolean;
    startIndex: number;
  } {
    const openingTag = this.openingTag;

    for (let i = 1; i < openingTag.length && i <= text.length; i++) {
      const potentialPartial = text.substring(text.length - i);
      if (openingTag.startsWith(potentialPartial)) {
        return { isPartial: true, startIndex: text.length - i };
      }
    }

    return { isPartial: false, startIndex: -1 };
  }

  /**
   * Find partial closing tag at the end of the buffer
   */
  private findPartialClosingTag(text: string): {
    isPartial: boolean;
    startIndex: number;
  } {
    const closingTag = this.closingTag;

    for (let i = 1; i < closingTag.length && i <= text.length; i++) {
      const potentialPartial = text.substring(text.length - i);
      if (closingTag.startsWith(potentialPartial)) {
        return { isPartial: true, startIndex: text.length - i };
      }
    }

    return { isPartial: false, startIndex: -1 };
  }

  /**
   * Check if partial tag is now complete and determine next state
   */
  private checkAndCompletePartialTag(newText: string): {
    completed: boolean;
    newState: ParseState;
    consumedLength: number;
  } {
    const fullBuffer = this.buffer + newText;

    // Check if we can now complete an opening tag
    if (fullBuffer.includes(this.openingTag)) {
      const tagEndIndex =
        fullBuffer.indexOf(this.openingTag) + this.openingTag.length;
      return {
        completed: true,
        newState: ParseState.IN_THINKING,
        consumedLength: tagEndIndex - this.buffer.length,
      };
    }

    // Check if we can now complete a closing tag
    if (fullBuffer.includes(this.closingTag)) {
      const tagEndIndex =
        fullBuffer.indexOf(this.closingTag) + this.closingTag.length;
      return {
        completed: true,
        newState: ParseState.NORMAL,
        consumedLength: tagEndIndex - this.buffer.length,
      };
    }

    return {
      completed: false,
      newState: ParseState.PARTIAL_TAG,
      consumedLength: 0,
    };
  }

  /**
   * Reset the parser state (useful when starting a new stream)
   */
  reset(): void {
    this.state = ParseState.NORMAL;
    this.buffer = '';
  }
}
