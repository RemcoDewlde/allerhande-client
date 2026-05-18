/** Thrown when authentication with the Albert Heijn token endpoint fails. */
export class AllerhandeAuthError extends Error {
  readonly statusCode: number;
  readonly statusText: string;

  constructor(statusCode: number, statusText: string) {
    super(`Auth failed: ${statusCode} ${statusText}`);
    this.name = "AllerhandeAuthError";
    this.statusCode = statusCode;
    this.statusText = statusText;
  }
}

/** Thrown when the GraphQL endpoint returns a non-2xx HTTP status. */
export class AllerhandeApiError extends Error {
  readonly statusCode: number;
  readonly statusText: string;

  constructor(statusCode: number, statusText: string) {
    super(`GraphQL request failed: ${statusCode} ${statusText}`);
    this.name = "AllerhandeApiError";
    this.statusCode = statusCode;
    this.statusText = statusText;
  }
}

/**
 * Thrown when the GraphQL response body contains an `errors` array,
 * or when the response contains no `data` field.
 */
export class AllerhandeGraphQLError extends Error {
  readonly messages: readonly string[];

  constructor(messages: string[]) {
    super(messages.join("; "));
    this.name = "AllerhandeGraphQLError";
    this.messages = messages;
  }
}
