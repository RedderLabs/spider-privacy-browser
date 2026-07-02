/**
 * @format
 * Drawer: mounts when visible, shows only REAL state (no fake account/sync),
 * and its actions fire the wired callbacks. Uses @testing-library/react-native
 * (auto-cleanup unmounts before Jest teardown, so the Animated drawer doesn't
 * crash on the deprecated react-test-renderer under React 19).
 */
import 'react-native';
import React from 'react';
import {describe, it, expect, jest} from '@jest/globals';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {Drawer} from '../src/components/Drawer';

describe('Drawer', () => {
  it('renders real content when visible and fires actions', () => {
    const onClose = jest.fn();
    const onNewTab = jest.fn();
    const onOpenTabs = jest.fn();
    const onOpenSettings = jest.fn();

    render(
      <Drawer
        visible
        onClose={onClose}
        onNewTab={onNewTab}
        onOpenTabs={onOpenTabs}
        onOpenSettings={onOpenSettings}
      />,
    );

    // Real sections (Spanish default): security + tracker blocker + score.
    expect(screen.getByText('SEGURIDAD')).toBeTruthy();
    expect(screen.getByText('Bloqueador de rastreadores')).toBeTruthy();
    expect(screen.getByText('Puntuación de privacidad')).toBeTruthy();
    // No aspirational/fake account UI from the mockup.
    expect(screen.queryByText(/Alex/)).toBeNull();
    expect(screen.queryByText(/Sync/)).toBeNull();

    // The "new private tab" action is wired.
    fireEvent.press(screen.getByText('Nueva pestaña privada'));
    expect(onNewTab).toHaveBeenCalledTimes(1);
  });
});
