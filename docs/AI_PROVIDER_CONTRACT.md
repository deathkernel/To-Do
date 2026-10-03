# AI Provider Contract

The application owns task state, permissions and validation. AI providers only propose structured actions/content.

Every AI action must be validated by the domain layer before persistence. Provider output is untrusted input.

Supported capability identifiers are defined in packages/domain/ai.ts.
