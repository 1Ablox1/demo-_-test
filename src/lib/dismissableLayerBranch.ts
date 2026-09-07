import { context as dismissableLayerContext } from 'reka-dismissable-context'

/** Register teleported UI (e.g. autocomplete panel) so modal dialogs do not dismiss on click. */
export function registerDismissableBranch(el: HTMLElement): () => void {
  dismissableLayerContext.branches.add(el)
  return () => {
    dismissableLayerContext.branches.delete(el)
  }
}
