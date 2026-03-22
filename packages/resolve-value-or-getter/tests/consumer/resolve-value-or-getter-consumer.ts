import { resolveValueOrGetter } from '@pvorona/resolve-value-or-getter';

const literal = resolveValueOrGetter('literal');
const computed = resolveValueOrGetter(() => 42);

literal satisfies string;
computed satisfies number;
