/**
 * phoneConnectionAnimation.test.js
 *
 * Verification suite for:
 * 1. PhoneConnectionAnimationModal (tactile electromagnetic conduit & lock-in sequence)
 * 2. IdentityDevicesAndPrivacy integration (Real device connection & Animation preview triggers)
 * 3. PacmanPairingStation 6-digit challenge code & QR generation without simulation buttons
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PhoneConnectionAnimationModal from '../components/PhoneConnectionAnimationModal';
import IdentityDevicesAndPrivacy from '../components/IdentityDevicesAndPrivacy';
import PacmanPairingStation from '../components/PacmanPairingStation';
import { unpairCompanionDevice } from '../services/focusIntegrityService';
import * as phoneClient from '../services/phoneConnectionClient';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Phone Connection Animation Suite', () => {
  let container = null;
  let root = null;
  let listPairedDevicesSpy = null;
  let startPairingSessionSpy = null;

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });
  });

  beforeEach(() => {
    localStorage.clear();
    unpairCompanionDevice();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    listPairedDevicesSpy = jest.spyOn(phoneClient, 'listPairedDevices').mockResolvedValue({
      success: true,
      devices: []
    });

    startPairingSessionSpy = jest.spyOn(phoneClient, 'startPairingSession').mockResolvedValue({
      success: true,
      pairingCode: '123456',
      expiresAt: Date.now() + 300000
    });
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    localStorage.clear();
    unpairCompanionDevice();
    jest.clearAllMocks();
  });

  test('1. PhoneConnectionAnimationModal renders nothing when isOpen is false', async () => {
    await act(async () => {
      root.render(
        <PhoneConnectionAnimationModal isOpen={false} onClose={jest.fn()} />
      );
    });

    expect(container.innerHTML).toBe('');
  });

  test('2. PhoneConnectionAnimationModal renders workstation, device name, and lock-in indicators when open', async () => {
    await act(async () => {
      root.render(
        <PhoneConnectionAnimationModal
          isOpen={true}
          device={{ deviceName: 'Galaxy S25 Ultra', isServerVerified: true }}
          onClose={jest.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Workstation');
    expect(container.textContent).toContain('Console Active');
    expect(container.textContent).toContain('Galaxy S25 Ultra');
    expect(container.textContent).toContain('Focus Integrity Telemetry');
    expect(container.textContent).toContain('Protocol v1.0 Live');
    expect(container.textContent).toContain('Ready for Deep Focus Work');
  });

  test('3. Clicking "Ready for Deep Focus Work" triggers onClose', async () => {
    const onCloseSpy = jest.fn();
    await act(async () => {
      root.render(
        <PhoneConnectionAnimationModal
          isOpen={true}
          device={{ deviceName: 'OnePlus 12' }}
          onClose={onCloseSpy}
        />
      );
    });

    const buttons = container.querySelectorAll('button');
    const readyBtn = Array.from(buttons).find(b => b.textContent.includes('Ready for Deep Focus Work'));
    expect(readyBtn).toBeTruthy();

    await act(async () => {
      readyBtn.click();
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  test('4. Clicking X dismiss button triggers onClose', async () => {
    const onCloseSpy = jest.fn();
    await act(async () => {
      root.render(
        <PhoneConnectionAnimationModal
          isOpen={true}
          device={{ deviceName: 'Pixel 9' }}
          onClose={onCloseSpy}
        />
      );
    });

    const closeBtn = container.querySelector('button[aria-label="Dismiss companion connection animation"]');
    expect(closeBtn).toBeTruthy();

    await act(async () => {
      closeBtn.click();
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  test('5. Real companion device pairing triggers celebration animation modal', async () => {
    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    expect(container.textContent).toContain('No phone connected');

    // Verify there are NO simulation buttons
    const simConnectBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Simulate Connect')
    );
    expect(simConnectBtn).toBeUndefined();

    // Click genuine "Connect Phone" button
    const connectBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Connect phone') || b.textContent.includes('Connect Phone')
    );
    expect(connectBtn).toBeTruthy();

    await act(async () => {
      connectBtn.click();
    });

    // Station opens showing 6-digit challenge and QR code
    expect(container.textContent).toContain('Pair with Android Companion');
    expect(container.textContent).toContain('Generated 6-Digit Pairing PIN:');
    expect(container.textContent).toContain('Check status');

    // Real device finishes pairing handshake with backend server
    listPairedDevicesSpy.mockResolvedValue({
      success: true,
      devices: [{
        deviceId: 'real-pixel-9',
        deviceName: 'Pixel 9 Pro',
        status: 'active',
        isServerVerified: true,
        lastSeenAt: new Date().toISOString()
      }]
    });

    // Click "Check status" to sync server state
    const checkStatusBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Check status')
    );
    expect(checkStatusBtn).toBeTruthy();

    await act(async () => {
      checkStatusBtn.click();
    });

    // The animation modal should appear!
    expect(container.textContent).toContain('Establishing Handshake...');
    expect(container.textContent).toContain('Pixel 9 Pro');
    expect(container.textContent).toContain('Focus Integrity Telemetry');
    expect(container.textContent).toContain('Ready for Deep Focus Work');

    // Dismiss modal
    const readyBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Ready for Deep Focus Work')
    );
    await act(async () => {
      readyBtn.click();
    });

    // Device should now be listed with the Animation button available
    expect(container.textContent).toContain('Pixel 9 Pro');
    const animBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Animation')
    );
    expect(animBtn).toBeTruthy();
  });

  test('6. Clicking "Animation" button on connected phone card re-launches connection animation', async () => {
    listPairedDevicesSpy.mockResolvedValueOnce({
      success: true,
      devices: [{
        deviceId: 'real-pixel-9',
        deviceName: 'Pixel 9 Pro',
        status: 'active',
        isServerVerified: true,
        lastSeenAt: new Date().toISOString()
      }]
    });

    await act(async () => {
      root.render(<IdentityDevicesAndPrivacy />);
    });

    expect(container.textContent).toContain('Pixel 9 Pro');

    // Trigger via "Animation" button
    const animBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Animation')
    );
    expect(animBtn).toBeTruthy();

    await act(async () => {
      animBtn.click();
    });

    expect(container.textContent).toContain('Establishing Handshake...');
    expect(container.textContent).toContain('Pixel 9 Pro');
    expect(container.textContent).toContain('Focus Integrity Telemetry');
  });

  test('7. PacmanPairingStation displays authoritative 6-digit code and QR code without simulation buttons', async () => {
    await act(async () => {
      root.render(
        <PacmanPairingStation
          pairingTokenRecord={{ token: '654321', pairUrl: 'https://learningtracker001.netlify.app/pair?code=654321' }}
          onClose={jest.fn()}
        />
      );
    });

    // Must display each of the 6 digits in blocks
    ['6', '5', '4', '3', '2', '1'].forEach(digit => {
      expect(container.textContent).toContain(digit);
    });

    // Must NOT contain any simulation buttons
    const demoBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Simulate Phone Scan') || b.textContent.includes('Simulate Connect')
    );
    expect(demoBtn).toBeUndefined();

    // Must have Copy PIN button
    const copyBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Copy PIN')
    );
    expect(copyBtn).toBeTruthy();
  });
});
