# Product Guidelines

This document outlines the style, tone, and conventions for all user-facing content related to the Eyas project.

## 1. Tone of Voice
The primary tone for all documentation, UI text, and communication will be **Technical and Precise**.

- **Clarity over cleverness:** Language should be clear, direct, and unambiguous. Avoid jargon where a simpler term exists, but do not shy away from technical terms when they are the most accurate way to describe something.
- **Audience-aware:** While the tone is technical, remember that the audience includes non-developers like Product Owners. Define terms or link to external documentation where appropriate.
- **Concise:** Be economical with words. Get straight to the point.

## 2. Error Messaging
Error messages must be **Detailed and Actionable**. The goal is to empower the user to solve the problem themselves or provide a high-quality bug report.

- **Be Specific:** Clearly state what went wrong. Avoid generic messages like "An error occurred."
- **Provide Context:** Include relevant information, such as error codes or invalid values, that led to the failure. For CLI or log output, stack traces are appropriate.
- **Suggest a Solution:** Whenever possible, tell the user what they should do next. Provide clear, actionable steps to resolve the issue or a link to relevant documentation.

**Example:**
- **Bad:** "Invalid configuration."
- **Good:** "Configuration Error in `.eyas.config.js`: The `source` property is missing. Please specify the path to your project's build output directory."
