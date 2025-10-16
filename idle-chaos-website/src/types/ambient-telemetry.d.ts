declare module "@sentry/nextjs" {
  export function init(opts: Record<string, unknown>): void;
  export function addBreadcrumb(b: Record<string, unknown>): void;
}
declare module "posthog-js" {
  const posthog: {
    init: (key: string, opts?: Record<string, unknown>) => void;
    capture: (event: string, props?: Record<string, unknown>) => void;
    group?: (groupType: string, groupKey: string) => void;
  };
  export default posthog;
}