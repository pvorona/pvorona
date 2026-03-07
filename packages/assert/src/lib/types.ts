/* eslint-disable @typescript-eslint/no-explicit-any */
export type Override<A, B> = Omit<A, keyof B> & B;

type ConstraintDiagnostic<Message extends string, Argument> = {
  __kind: 'ConstraintDiagnostic';
  message: Message;
  argument: Argument;
};

export type InferErrorMessage<T, V = T> = [T] extends [
  ConstraintDiagnostic<infer Message, unknown>
]
  ? Message
  : V;

export type NotOnlyNull<T> = [T] extends [null]
  ? 'Must not be null only type'
  : T;

export type NotOnlyUndefined<T> = [T] extends [undefined]
  ? 'Must not be undefined only type'
  : T;

export type NotOnlyNullOrUndefined<T> = [T] extends [null | undefined]
  ? 'Must not be (null | undefined) only type'
  : T;

export type NotOnlyNumber<T> = [T] extends [number]
  ? 'Must not be number only type'
  : T;

export type NotOnlyString<T> = [T] extends [string]
  ? ConstraintDiagnostic<'Must not be string only type', T>
  : T;

export type NotOnlyArray<T> = [T] extends [unknown[]]
  ? 'Must not be array only type'
  : T;

export type NotOnlySymbol<T> = [T] extends [symbol]
  ? 'Must not be symbol only type'
  : T;

export type IncludesNullMember<T> = null extends T ? T : 'Must include null';

export type IncludesUndefinedMember<T> = undefined extends T
  ? T
  : 'Must include undefined';

export type IncludesNullOrUndefinedMember<T> = null | undefined extends T
  ? T
  : 'Must include (null | undefined)';

export type IncludesNumberOrNumberLiteralMember<T> = number extends T
  ? T
  : T extends number
  ? T
  : ConstraintDiagnostic<'Must include number or number literal', T>;

export type IncludesErrorOrBoundaryInput<T> = [unknown] extends [T]
  ? T
  : [Extract<T, globalThis.Error>] extends [never]
  ? ConstraintDiagnostic<'Must include Error, unknown, or any', T>
  : T;

export type NotOnlyErrorUnlessBoundaryInput<T> = [unknown] extends [T]
  ? T
  : [Exclude<T, globalThis.Error>] extends [never]
  ? ConstraintDiagnostic<'Must not be error-only type', T>
  : T;

type InferErrorArguments<T> = T extends ConstraintDiagnostic<any, infer U> ? U : T;

type InferErrorsArguments<T> = ConstraintDiagnostic<any, any> extends T
  ?
      | InferErrorArguments<Extract<T, ConstraintDiagnostic<any, any>>>
      | Exclude<T, ConstraintDiagnostic<any, any>>
  : T;

export type AtLeastOneValid<T> = [T] extends [ConstraintDiagnostic<string, unknown>]
  ? T
  : InferErrorsArguments<T>;

export type IncludesStringOrStringLiteralMember<T> = string extends T
  ? T
  : T extends string
  ? T
  : ConstraintDiagnostic<'Must include string or string literal', T>;

export type IncludesArrayOrArrayLiteralMember<T> = any[] extends T
  ? T
  : T extends any[]
  ? T
  : ConstraintDiagnostic<'Must include array or array literal', T>;

export type IncludesSymbolMember<T> = symbol extends T
  ? T
  : 'Must include symbol';

export type InferArrayType<T> = T extends Array<infer U> ? U[] : never;
