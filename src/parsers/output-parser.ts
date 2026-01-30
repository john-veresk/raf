export type TaskResult = 'complete' | 'failed' | 'unknown';

export interface ParsedOutput {
  result: TaskResult;
  failureReason?: string;
  contextOverflow: boolean;
}

const COMPLETE_PATTERN = /<promise>COMPLETE<\/promise>/i;
const FAILED_PATTERN = /<promise>FAILED<\/promise>/i;
const FAILURE_REASON_PATTERN = /Reason:\s*(.+?)(?:\n|$)/i;

const CONTEXT_OVERFLOW_PATTERNS = [
  /context length exceeded/i,
  /token limit/i,
  /maximum context/i,
  /context window/i,
  /too many tokens/i,
];

/**
 * Parse Claude's output to determine task result.
 */
export function parseOutput(output: string): ParsedOutput {
  const result: ParsedOutput = {
    result: 'unknown',
    contextOverflow: false,
  };

  // Check for context overflow
  for (const pattern of CONTEXT_OVERFLOW_PATTERNS) {
    if (pattern.test(output)) {
      result.contextOverflow = true;
      break;
    }
  }

  // Check for completion markers (search from the end for the last occurrence)
  const completeMatch = output.match(COMPLETE_PATTERN);
  const failedMatch = output.match(FAILED_PATTERN);

  if (completeMatch && failedMatch) {
    // Both present - use whichever appears last
    const completeIndex = output.lastIndexOf(completeMatch[0]);
    const failedIndex = output.lastIndexOf(failedMatch[0]);

    if (failedIndex > completeIndex) {
      result.result = 'failed';
      extractFailureReason(output, result);
    } else {
      result.result = 'complete';
    }
  } else if (completeMatch) {
    result.result = 'complete';
  } else if (failedMatch) {
    result.result = 'failed';
    extractFailureReason(output, result);
  }

  return result;
}

function extractFailureReason(output: string, result: ParsedOutput): void {
  const reasonMatch = output.match(FAILURE_REASON_PATTERN);
  if (reasonMatch) {
    result.failureReason = reasonMatch[1]?.trim();
  } else {
    // Try to find any text after the FAILED marker
    const failedIndex = output.lastIndexOf('<promise>FAILED</promise>');
    if (failedIndex !== -1) {
      const afterFailed = output.substring(failedIndex + '<promise>FAILED</promise>'.length).trim();
      if (afterFailed) {
        // Take first few lines as reason
        const lines = afterFailed.split('\n').slice(0, 3);
        result.failureReason = lines.join(' ').trim().substring(0, 500);
      }
    }
  }

  if (!result.failureReason) {
    result.failureReason = 'Unknown failure (no reason provided)';
  }
}

/**
 * Check if output indicates a retryable failure.
 */
export function isRetryableFailure(parsed: ParsedOutput): boolean {
  // Context overflow is not retryable
  if (parsed.contextOverflow) {
    return false;
  }

  // Unknown result might be retryable
  if (parsed.result === 'unknown') {
    return true;
  }

  // Check failure reason for non-retryable patterns
  if (parsed.result === 'failed' && parsed.failureReason) {
    const nonRetryable = [
      /cannot be done/i,
      /impossible/i,
      /not supported/i,
      /permission denied/i,
      /access denied/i,
    ];

    for (const pattern of nonRetryable) {
      if (pattern.test(parsed.failureReason)) {
        return false;
      }
    }

    // Most failures are retryable
    return true;
  }

  return false;
}

/**
 * Extract a summary from Claude's output for the outcome file.
 */
export function extractSummary(output: string): string {
  // Remove ANSI codes
  const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

  // Try to find meaningful summary sections
  const lines = cleanOutput.split('\n');
  const summaryLines: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // Skip code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      continue;
    }

    // Skip empty lines and very short lines
    if (line.trim().length < 5) {
      continue;
    }

    // Skip lines that look like file paths or commands
    if (line.trim().startsWith('/') || line.trim().startsWith('$')) {
      continue;
    }

    summaryLines.push(line);

    // Limit summary length
    if (summaryLines.length >= 50) {
      break;
    }
  }

  return summaryLines.join('\n').trim() || 'No summary available.';
}
