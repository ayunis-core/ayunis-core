/**
 * Patches DOM methods to handle browser extension interference.
 *
 * Browser extensions (translation, password managers, accessibility tools)
 * can modify the DOM outside React's control. When React tries to update,
 * it may fail with "The node to be removed is not a child of this node".
 *
 * This patch catches those specific errors and handles them gracefully.
 * Based on: https://github.com/facebook/react/issues/17256
 */
export function applyDomPatch() {
  if (typeof window === 'undefined') return;

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      console.warn('RemoveChild: node is not a child of this node', child);
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('InsertBefore: reference node is not a child of this node');
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
