export interface TreeElement {
  type: string;
  props: Record<string, unknown>;
  children: TreeElement[];
  visible?: unknown;
  repeat?: unknown;
  on?: unknown;
}

export interface TreeSpec {
  root?: TreeElement;
  state?: Record<string, unknown>;
}

export interface FlatElement {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
  visible?: unknown;
  repeat?: unknown;
  on?: unknown;
}

export interface FlatSpec {
  root: string;
  elements: Record<string, FlatElement>;
  state?: Record<string, unknown>;
}

export const treeToFlatSpec = (spec: TreeSpec | null): FlatSpec | null => {
  if (!spec?.root) {
    return null;
  }

  const elements: Record<string, FlatElement> = {};
  let counter = 0;

  const walk = (element: TreeElement): string => {
    const key = `node-${counter}`;
    counter += 1;

    const childKeys =
      element.children?.map((child) => walk(child)) ?? [];

    elements[key] = {
      type: element.type,
      props: element.props ?? {},
      children: childKeys,
      visible: element.visible,
      repeat: element.repeat,
      on: element.on,
    };

    return key;
  };

  const rootKey = walk(spec.root);
  return { root: rootKey, elements, state: spec.state };
};
