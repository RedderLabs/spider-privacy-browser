/**
 * @format
 * Drawer: mounts when visible, shows only REAL state (no fake account/sync),
 * and its actions fire the wired callbacks.
 */
import 'react-native';
import React from 'react';
import {describe, it, expect, jest} from '@jest/globals';
import {act, create, ReactTestRenderer} from 'react-test-renderer';
import {Drawer} from '../src/components/Drawer';

const texts = (tree: ReactTestRenderer): string[] => {
  const out: string[] = [];
  const walk = (node: any) => {
    if (node == null) {return;}
    if (typeof node === 'string') {out.push(node); return;}
    if (Array.isArray(node)) {node.forEach(walk); return;}
    if (node.children) {node.children.forEach(walk);}
  };
  walk(tree.toJSON());
  return out;
};

describe('Drawer', () => {
  it('renders real content when visible and fires actions', async () => {
    const onClose = jest.fn();
    const onNewTab = jest.fn();
    const onOpenTabs = jest.fn();
    const onOpenSettings = jest.fn();

    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = create(
        <Drawer
          visible
          onClose={onClose}
          onNewTab={onNewTab}
          onOpenTabs={onOpenTabs}
          onOpenSettings={onOpenSettings}
        />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Shows real sections (Spanish default): security + tracker blocker + score.
    const joined = texts(tree!).join(' | ');
    expect(joined).toContain('SEGURIDAD');
    expect(joined).toContain('Bloqueador de rastreadores');
    expect(joined).toContain('Puntuación de privacidad');
    // No aspirational/fake account UI from the mockup.
    expect(joined).not.toContain('Alex');
    expect(joined).not.toContain('Sync');

    // The "new private tab" action is wired.
    const newTabNode = tree!.root.findAll((n) => n.props.onPress === onNewTab)[0];
    expect(newTabNode).toBeTruthy();
    await act(async () => {
      newTabNode.props.onPress();
    });
    expect(onNewTab).toHaveBeenCalledTimes(1);

    tree!.unmount();
  });
});
