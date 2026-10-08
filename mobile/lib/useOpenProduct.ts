import { useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { createTapGuard } from './tap-guard';

/**
 * Opens the product editor for a product id, ignoring a repeat tap.
 *
 * The product list downloads roughly a megabyte across seven sequential
 * requests on every load, so a row tap can feel dead for long enough to invite
 * a second one. Because `router.push` always pushes, that second tap stacked a
 * duplicate edit screen and made Back look broken — see `tap-guard.ts`.
 */
export function useOpenProduct() {
  const router = useRouter();
  const guard = useRef(createTapGuard());

  // Back on the list: re-arm straight away rather than waiting out the window.
  useFocusEffect(
    useCallback(() => {
      guard.current.release();
    }, []),
  );

  return useCallback(
    (productId: string) => {
      if (!guard.current.accept(Date.now())) return;
      router.push({ pathname: '/(app)/product/[id]', params: { id: productId } });
    },
    [router],
  );
}
