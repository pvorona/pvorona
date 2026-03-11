/* eslint-disable @typescript-eslint/no-explicit-any */
export type Override<A, B> = Omit<A, keyof B> & B;

type ConstraintDiagnostic<Message extends string, Argument> = {
  __kind: 'ConstraintDiagnostic';
  message: Message;
  argument: Argument;
};

type NotOnly<T, Only, Message extends string> = [T] extends [Only]
  ? ConstraintDiagnostic<Message, T>
  : T;

type IncludesSomeMember<T, Member, Message extends string> = Member extends T
  ? T
  : [Extract<T, Member>] extends [never]
  ? ConstraintDiagnostic<Message, T>
  : T;

type IncludesBroadOrLiteral<T, Broad, Message extends string> = Broad extends T
  ? T
  : T extends Broad
  ? T
  : ConstraintDiagnostic<Message, T>;

type IncludesAllMembers<T, Members, Message extends string> = [
  Members,
] extends [T]
  ? T
  : ConstraintDiagnostic<Message, T>;

export type DisplayDiagnostics<T, V = T> = [T] extends [
  ConstraintDiagnostic<infer Message, unknown>,
]
  ? Message
  : V;

export type NotOnlyNull<T> = NotOnly<T, null, 'Must not be null only type'>;

export type NotOnlyUndefined<T> = NotOnly<
  T,
  undefined,
  'Must not be undefined only type'
>;

export type NotOnlyNullOrUndefined<T> = NotOnly<
  T,
  null | undefined,
  'Must not be (null | undefined) only type'
>;

export type NotOnlyNumber<T> = NotOnly<
  T,
  number,
  'Must not be number only type'
>;

export type NotOnlyString<T> = NotOnly<
  T,
  string,
  'Must not be string only type'
>;

export type NotOnlyArray<T> = NotOnly<
  T,
  unknown[],
  'Must not be array only type'
>;

export type NotOnlySymbol<T> = NotOnly<
  T,
  symbol,
  'Must not be symbol only type'
>;

export type IncludesNullMember<T> = IncludesSomeMember<
  T,
  null,
  'Must include null'
>;

export type IncludesUndefinedMember<T> = IncludesSomeMember<
  T,
  undefined,
  'Must include undefined'
>;

export type IncludesNullOrUndefinedMember<T> = IncludesAllMembers<
  T,
  null | undefined,
  'Must include (null | undefined)'
>;

export type IncludesNumberOrNumberLiteralMember<T> = IncludesBroadOrLiteral<
  T,
  number,
  'Must include number or number literal'
>;

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

type InferErrorArguments<T> = T extends ConstraintDiagnostic<any, infer U>
  ? U
  : T;

type InferErrorsArguments<T> = ConstraintDiagnostic<any, any> extends T
  ?
      | InferErrorArguments<Extract<T, ConstraintDiagnostic<any, any>>>
      | Exclude<T, ConstraintDiagnostic<any, any>>
  : T;

export type AtLeastOneValid<T> = [T] extends [
  ConstraintDiagnostic<string, unknown>,
]
  ? T
  : InferErrorsArguments<T>;

export type IncludesStringOrStringLiteralMember<T> = IncludesBroadOrLiteral<
  T,
  string,
  'Must include string or string literal'
>;

export type IncludesArrayOrArrayLiteralMember<T> = IncludesBroadOrLiteral<
  T,
  readonly any[],
  'Must include array or array literal'
>;

export type IncludesSymbolMember<T> = symbol extends T
  ? T
  : 'Must include symbol';
