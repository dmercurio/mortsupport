export enum ViewRuleResult {
  ALLOW = 'allow',
  DENY = 'deny',
  SKIP = 'skip',
}
export type ViewRule<C, T> = (ctx: C, models: T[]) => Promise<ViewRuleResult>;
export type ViewPolicy<C, T> = ViewRule<C, T>[];

export const AnyoneCanView = [async <C, T>(ctx: C, models: T[]) => ViewRuleResult.ALLOW];
