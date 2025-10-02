# Analysis & Documentation Guidelines

## Development Environment

**Do not suggest starting development server, it is typically already running on http://localhost:3000 with `bun dev`** - don't suggest starting it unless specifically needed.

**Use context7 MCP to get up to date documentation when needed**

## Pre-Work Analysis Requirements

**ALWAYS start by analyzing the codebase before making changes:**

1. **Understand the Context**: Read and analyze files related to the user's query
2. **Map Relationships**: Identify how components, hooks, and utilities connect
3. **Find the Logic**: Locate existing patterns and architectural decisions
4. **Check Dependencies**: Understand data flow and state management

## Context7 MCP Documentation

**Use Context7 MCP for up-to-date documentation and examples:**

- **Before implementing**: Get current docs for libraries, tools, and frameworks
- **For best practices**: Fetch examples and patterns from official sources  
- **When troubleshooting**: Access latest API references and guides
- **For new features**: Review current capabilities and recommended approaches

### When to Use Context7:
- Working with external libraries (SolidJS, TanStack, Hono, etc.)
- Implementing new integrations (Cloudflare APIs, Convex, etc.)
- Following framework-specific patterns
- Debugging library-specific issues
- Exploring new features or APIs

## Analysis Workflow

1. **Read relevant files** using file tools to understand current implementation
2. **Use Context7** to get up-to-date documentation for any libraries involved
3. **Map the relationships** between components, hooks, and data flow
4. **Identify patterns** already established in the codebase
5. **Plan changes** that align with existing architecture
6. **Implement** following established conventions

This ensures changes are well-informed, consistent, and leverage the latest best practices.