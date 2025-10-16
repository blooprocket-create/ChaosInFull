import { useCallback, useMemo, useState } from "react";

export type ModalKey = "inventory" | "shop" | "quest" | "crafting" | "profile";

export type ModalState = Record<ModalKey, boolean>;

const defaultState: ModalState = {
  inventory: false,
  shop: false,
  quest: false,
  crafting: false,
  profile: false,
};

export function useModalState(initial?: Partial<ModalState>) {
  const [state, setState] = useState<ModalState>({ ...defaultState, ...(initial ?? {}) });

  const open = useCallback((key: ModalKey) => setState(s => ({ ...s, [key]: true })), []);
  const close = useCallback((key: ModalKey) => setState(s => ({ ...s, [key]: false })), []);
  const toggle = useCallback((key: ModalKey) => setState(s => ({ ...s, [key]: !s[key] })), []);
  const reset = useCallback(() => setState(defaultState), []);

  const api = useMemo(() => ({ open, close, toggle, reset }), [open, close, toggle, reset]);

  return { state, ...api } as const;
}

export default useModalState;
