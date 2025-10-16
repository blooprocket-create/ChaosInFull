declare module "@sentry/nextjs" {
  export function init(opts: any): void;
  export function addBreadcrumb(b: any): void;
}
declare module "posthog-js" {
  const posthog: {
    init: (key: string, opts?: any) => void;
    capture: (event: string, props?: Record<string, any>) => void;
    group?: (groupType: string, groupKey: string) => void;
  };
  export default posthog;
}