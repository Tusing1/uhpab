import { useEffect } from 'react';

export function useWritingNavigationGuard(pending: boolean) {
  useEffect(() => {
    if (!pending) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const navigate = (event: Event) => {
      if ((event as Event & { destination?: { sameDocument: boolean } }).destination?.sameDocument === false) return;
      if (event.cancelable && !window.confirm('Your latest changes are not saved. Leave without saving?')) event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest('a');
      if (anchor && !anchor.download && anchor.href !== location.href && !window.confirm('Your latest changes are not saved. Leave without saving?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload);
    if (navigation) navigation.addEventListener('navigate', navigate);
    else document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', unload); navigation?.removeEventListener('navigate', navigate); document.removeEventListener('click', click, true); };
  }, [pending]);
}
