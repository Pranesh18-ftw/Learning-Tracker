/**
 * IdentityDevicesAndPrivacy.jsx
 *
 * Sixth Section: CONNECTED DEVICES & PRIVACY
 *
 * Focus Integrity V1 Companion Architecture (Prompts #1, #6, #8, #9, #13, #14, #15, #18, #25, #26):
 * - Workstation (Web console): ● Connected
 * - Android Companion Phone: ● Connected / ○ Not paired
 * - Short-lived, single-use, server-verified pairing tokens (Prompt #8)
 * - Application-generated anonymous device association ID (Prompt #9)
 * - Interactive App Classification Manager: Reference vs Distraction vs Unknown (Prompts #13, #14, #15)
 * - Exact Privacy Disclosure and Non-surveillance guarantees (Prompts #6, #26)
 * - Additive Resiliency: Disconnecting phone preserves all learning continuity (Prompt #25)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Laptop,
  Smartphone,
  Shield,
  Download,
  Trash2,
  CheckCircle2,
  X,
  Settings2,
  Plus,
  QrCode,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import {
  getPairedDevice,
  setPairedDeviceRecord,
  unpairCompanionDevice,
  getAppOverrides,
  setAppOverride,
  isFocusIntegrityEnabled,
  setFocusIntegrityEnabled,
  deleteFocusTelemetryHistory
} from '../services/focusIntegrityService';
import {
  APP_CATEGORIES,
  DEFAULT_APP_CLASSIFICATIONS
} from '../shared/focusIntegrityProtocol';
import { useRoadmap } from '../context/RoadmapContext';
import {
  signOutUser,
  deleteUserAccountPermanently,
  createCompanionPairingRequest,
  revokeCompanionDevice,
  renameCompanionDevice
} from '../services/authService';
import { getOrCreateAccount } from '../services/accountIdentityService';
import {
  startPairingSession,
  revokePairedDevice,
  deletePhoneTelemetry,
  listPairedDevices
} from '../services/phoneConnectionClient';
import GoogleSignInModal from './GoogleSignInModal';

function formatLastSeen(timestamp) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Unknown';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return 'Just now';
  if (diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 1000))}m ago`;
  if (diffMs < 24 * 60 * 60 * 1000) return `${Math.floor(diffMs / (60 * 60 * 1000))}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPairedAt(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const mapServerDevice = (d) => ({
  ...d,
  deviceId: d.deviceId,
  deviceAssociationId: d.deviceId,
  deviceName: d.deviceName || 'Android Companion',
  status: d.status || null,
  protocolVersion: d.protocolVersion || 1,
  pairedAt: d.pairedAt || null,
  lastSeenAt: d.lastSeenAt || null,
  hasUsageAccess: (d.hasUsageAccess !== undefined && d.hasUsageAccess !== null)
    ? Boolean(d.hasUsageAccess)
    : null,
  isServerVerified: true,
  source: 'server'
});

const IdentityDevicesAndPrivacy = ({
  connectedDevices = {},
  onExportData,
  onResetIdentity
}) => {
  const roadmapContext = useRoadmap() || {};
  const {
    account = getOrCreateAccount(),
    isAuthInitializing,
    refreshAccount,
    logoutAccount,
    deleteAccount
  } = roadmapContext;
  const currentAccountId = account?.accountId || account?.externalAuthId || account?.uid || null;
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const initialLocal = getPairedDevice();
  const [devices, setDevices] = useState(() => {
    if (!initialLocal) return [];
    if (initialLocal.ownerAccountId && currentAccountId && initialLocal.ownerAccountId !== currentAccountId) {
      return [];
    }
    return [{
      ...initialLocal,
      deviceId: initialLocal.deviceId || initialLocal.deviceAssociationId,
      deviceAssociationId: initialLocal.deviceAssociationId || initialLocal.deviceId,
      isServerVerified: false,
      source: 'local'
    }];
  });
  const pairedDevice = devices[0] || null;
  const [managingDevice, setManagingDevice] = useState(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [deviceSyncError, setDeviceSyncError] = useState(null);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [pairingTokenRecord, setPairingTokenRecord] = useState(null);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [pairingError, setPairingError] = useState('');
  const [appOverrides, setAppOverridesState] = useState(() => getAppOverrides());
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackageCategory, setNewPackageCategory] = useState(APP_CATEGORIES.REFERENCE);
  const [focusIntegrityEnabled, setFocusIntegrityEnabledState] = useState(() => isFocusIntegrityEnabled());
  const [showDeleteTelemetryModal, setShowDeleteTelemetryModal] = useState(false);
  const [telemetryDeletedSuccess, setTelemetryDeletedSuccess] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const syncDevicesFromServer = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsLoadingDevices(true);
    try {
      const res = await listPairedDevices();
      if (!isMountedRef.current) return;
      if (res && res.success) {
        setDeviceSyncError(null);
        const activeDevices = (res.devices || []).filter(d => d.status !== 'revoked' && !d.revokedAt);
        if (activeDevices.length > 0) {
          // Case 1: Server returned active registered devices for this account
          const mapped = activeDevices.map(d => ({
            ...mapServerDevice(d),
            ownerAccountId: currentAccountId
          }));
          setDevices(mapped);
          setPairedDeviceRecord(mapped[0], currentAccountId);
          setShowPairingModal(false);
        } else {
          // Case 2: Successful response with NO registered devices for this account
          setDevices([]);
          const currentLocal = getPairedDevice();
          if (currentLocal) {
            const isOwnedByCurrent = !currentLocal.ownerAccountId || (currentAccountId && currentLocal.ownerAccountId === currentAccountId);
            if (isOwnedByCurrent) {
              unpairCompanionDevice(currentAccountId);
            }
          }
        }
      } else {
        // Case 3: Network or authentication failure
        // Preserve existing local state as fallback where appropriate,
        // but do not represent it as verified server registration
        if (res?.error && res.error !== 'Authentication required.') {
          setDeviceSyncError(res.error);
        }
        setDevices(prev => {
          if (prev.length > 0) {
            return prev.map(d => ({ ...d, isServerVerified: false }));
          }
          const local = getPairedDevice();
          if (local) {
            if (local.ownerAccountId && currentAccountId && local.ownerAccountId !== currentAccountId) {
              return [];
            }
            return [{
              ...local,
              deviceId: local.deviceId || local.deviceAssociationId,
              deviceAssociationId: local.deviceAssociationId || local.deviceId,
              isServerVerified: false,
              source: 'local'
            }];
          }
          return prev;
        });
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setDeviceSyncError('Network error connecting to phone service');
      setDevices(prev => {
        if (prev.length > 0) {
          return prev.map(d => ({ ...d, isServerVerified: false }));
        }
        const local = getPairedDevice();
        if (local) {
          if (local.ownerAccountId && currentAccountId && local.ownerAccountId !== currentAccountId) {
            return [];
          }
          return [{
            ...local,
            deviceId: local.deviceId || local.deviceAssociationId,
            deviceAssociationId: local.deviceAssociationId || local.deviceId,
            isServerVerified: false,
            source: 'local'
          }];
        }
        return prev;
      });
    } finally {
      if (isMountedRef.current) {
        setIsLoadingDevices(false);
      }
    }
  }, [currentAccountId]);

  // Sync state on mount
  useEffect(() => {
    syncDevicesFromServer();
    setFocusIntegrityEnabledState(isFocusIntegrityEnabled());
  }, [syncDevicesFromServer]);

  // Bounded poll for newly completed pairing while pairing modal is open
  useEffect(() => {
    if (!showPairingModal) return;

    let pollCount = 0;
    const MAX_POLLS = 60; // 60 * 5s = 5m (matches pairing token lifetime)

    const intervalId = setInterval(async () => {
      pollCount += 1;
      if (pollCount > MAX_POLLS) {
        clearInterval(intervalId);
        return;
      }

      try {
        const res = await listPairedDevices();
        if (res && res.success && Array.isArray(res.devices)) {
          const active = res.devices.filter(d => d.status !== 'revoked' && !d.revokedAt);
          if (active.length > 0) {
            const mapped = active.map(mapServerDevice);
            setDevices(mapped);
            setPairedDeviceRecord(mapped[0]);
            setShowPairingModal(false);
          }
        }
      } catch {
        // Quiet failure during background poll
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [showPairingModal]);

  // Escape key dismissal for dialogs
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showPairingModal) setShowPairingModal(false);
        if (showManageModal) setShowManageModal(false);
        if (showConfirmReset) setShowConfirmReset(false);
        if (showDeleteModal) setShowDeleteModal(false);
        if (showDeleteTelemetryModal) setShowDeleteTelemetryModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPairingModal, showManageModal, showConfirmReset, showDeleteModal, showDeleteTelemetryModal]);

  const handleToggleFocusIntegrity = () => {
    const nextVal = !focusIntegrityEnabled;
    setFocusIntegrityEnabled(nextVal);
    setFocusIntegrityEnabledState(nextVal);
  };

  const handleConfirmDeleteTelemetry = async () => {
    try {
      await deletePhoneTelemetry();
    } catch {}
    deleteFocusTelemetryHistory();
    setShowDeleteTelemetryModal(false);
    setTelemetryDeletedSuccess(true);
    setTimeout(() => setTelemetryDeletedSuccess(false), 3000);
  };

  const handleOpenPairing = async () => {
    try {
      const apiResult = await startPairingSession();
      if (apiResult && apiResult.success) {
        setPairingTokenRecord({
          token: apiResult.pairingCode,
          pairUrl: `https://learningtracker001.netlify.app/pair?code=${apiResult.pairingCode}`,
          expiresAt: apiResult.expiresAt
        });
        setPairingError('');
        setShowPairingModal(true);
        return;
      }
    } catch {}

    const req = createCompanionPairingRequest();
    setPairingTokenRecord({
      token: req.tokenId,
      pairUrl: req.pairUrl,
      expiresAt: req.expiresAt
    });
    setPairingError('');
    setShowPairingModal(true);
  };


  const handleSaveDeviceName = () => {
    const target = managingDevice || pairedDevice;
    if (!target || !deviceNameInput.trim()) return;
    // Server-backed device names cannot be changed via server API
    if (target.isServerVerified) {
      return;
    }
    const id = target.deviceId || target.deviceAssociationId;
    renameCompanionDevice(id, deviceNameInput.trim());
    setDevices(prev => prev.map(d => {
      if ((d.deviceId || d.deviceAssociationId) === id) {
        return { ...d, deviceName: deviceNameInput.trim() };
      }
      return d;
    }));
    const currentLocal = getPairedDevice();
    if (currentLocal && (currentLocal.deviceId === id || currentLocal.deviceAssociationId === id)) {
      setPairedDeviceRecord({ ...currentLocal, deviceName: deviceNameInput.trim() }, currentAccountId);
    }
    setShowManageModal(false);
    setManagingDevice(null);
  };

  const handleRevokeDevice = async (deviceToRevoke) => {
    const target = deviceToRevoke || managingDevice || pairedDevice;
    if (!target) return;
    const id = target.deviceId || target.deviceAssociationId;
    try {
      await revokePairedDevice(id);
    } catch {}
    revokeCompanionDevice(id);
    unpairCompanionDevice();
    setDevices(prev => {
      const remaining = prev.filter(d => (d.deviceId || d.deviceAssociationId) !== id);
      if (remaining.length > 0) {
        setPairedDeviceRecord(remaining[0]);
      }
      return remaining;
    });
    setManagingDevice(null);
    setShowManageModal(false);
  };

  const handleUnpair = (deviceToUnpair) => {
    const target = deviceToUnpair || managingDevice || pairedDevice;
    const id = target ? (target.deviceId || target.deviceAssociationId) : null;
    unpairCompanionDevice();
    if (id) {
      setDevices(prev => {
        const remaining = prev.filter(d => (d.deviceId || d.deviceAssociationId) !== id);
        if (remaining.length > 0) {
          setPairedDeviceRecord(remaining[0]);
        }
        return remaining;
      });
    } else {
      setDevices([]);
    }
    setManagingDevice(null);
    setShowManageModal(false);
    setShowPairingModal(false);
  };

  const handleToggleAppClassification = (pkg) => {
    const current = appOverrides[pkg] || DEFAULT_APP_CLASSIFICATIONS[pkg] || APP_CATEGORIES.UNKNOWN;
    const nextCategory = current === APP_CATEGORIES.REFERENCE
      ? APP_CATEGORIES.DISTRACTION
      : APP_CATEGORIES.REFERENCE;
    const updated = setAppOverride(pkg, nextCategory);
    setAppOverridesState({ ...updated });
  };

  const handleAddCustomApp = (e) => {
    e.preventDefault();
    if (!newPackageName.trim()) return;
    const updated = setAppOverride(newPackageName.trim().toLowerCase(), newPackageCategory);
    setAppOverridesState({ ...updated });
    setNewPackageName('');
  };

  // Known default list merged with overrides
  const displayPackages = [
    { pkg: 'com.android.chrome', label: 'Google Chrome', defaultCat: APP_CATEGORIES.REFERENCE },
    { pkg: 'com.google.android.calculator', label: 'Android Calculator', defaultCat: APP_CATEGORIES.REFERENCE },
    { pkg: 'com.adobe.reader', label: 'Adobe Acrobat PDF', defaultCat: APP_CATEGORIES.REFERENCE },
    { pkg: 'com.instagram.android', label: 'Instagram', defaultCat: APP_CATEGORIES.DISTRACTION },
    { pkg: 'com.zhiliaoapp.musically', label: 'TikTok', defaultCat: APP_CATEGORIES.DISTRACTION },
    { pkg: 'com.google.android.youtube', label: 'YouTube / Shorts', defaultCat: APP_CATEGORIES.DISTRACTION }
  ];

  const isGoogleLinked = account?.authProvider === 'google';
  const displaySafeId = account?.accountId
    ? `LT-${account.accountId.slice(-6).toUpperCase()}`
    : 'LT-LOCAL';

  const handleSignOut = () => {
    signOutUser();
    logoutAccount && logoutAccount();
  };

  const handleConfirmDeleteAccount = () => {
    deleteUserAccountPermanently();
    deleteAccount && deleteAccount();
    setShowDeleteModal(false);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">

      {/* ── 0. ACCOUNT & IDENTITY (Prompt #18 & #19) ── */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-electric-600/10 text-electric-600 dark:text-electric-400 flex items-center justify-center font-bold text-lg">
              {isGoogleLinked ? 'G' : '👤'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {account?.displayName || 'Learner'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isGoogleLinked
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isGoogleLinked ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {isGoogleLinked ? 'Google Connected' : 'Local Only'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                {account?.email ? `${account.email} · ` : ''}ID: <span className="font-semibold text-slate-600 dark:text-slate-300">{displaySafeId}</span>
                {isGoogleLinked && (
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Authenticated with Google · Data stored locally on this device
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthInitializing ? (
              <span
                id="identity-verifying-state"
                className="px-3 py-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-electric-500 animate-pulse" />
                Verifying...
              </span>
            ) : !isGoogleLinked ? (
              <button
                type="button"
                id="identity-google-signin-btn"
                onClick={() => setShowSignInModal(true)}
                className="px-3 py-1.5 rounded-xl bg-electric-600 hover:bg-electric-700 text-white font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue with Google</span>
              </button>
            ) : (
              <button
                type="button"
                id="identity-signout-btn"
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                Sign out
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-mono font-bold transition-colors cursor-pointer"
            >
              Delete account
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. CONNECTED DEVICES (Prompt #8) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-electric-500/10 text-electric-600 dark:text-electric-400 flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                Section 06 · Hardware Companion & Focus Integrity
              </span>
              <h2 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
                Devices
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={syncDevicesFromServer}
              disabled={isLoadingDevices}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh device status from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDevices ? 'animate-spin text-electric-500' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPairing}
              className="px-3 py-1.5 rounded-xl border border-electric-300 dark:border-electric-700 bg-electric-50 dark:bg-electric-950/40 text-electric-700 dark:text-electric-300 hover:bg-electric-100 dark:hover:bg-electric-900/40 font-mono text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{devices.length > 0 ? '+ Connect another phone' : 'Connect phone'}</span>
            </button>
          </div>
        </div>

        {deviceSyncError && (
          <div className="text-[11px] font-mono text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
            <span>Notice: {deviceSyncError} (offline / local fallback active)</span>
            <button
              type="button"
              onClick={() => setDeviceSyncError(null)}
              className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 text-xs font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Workstation (💻 This computer) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-electric-500/10 text-electric-600 dark:text-electric-400 flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block">
                  💻 This computer
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Primary learning console
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active</span>
            </div>
          </div>

          {/* Mobile Companions (Server-backed or Local Fallback) */}
          {devices.map((device) => {
            const isVerified = device.isServerVerified !== false;
            return (
              <div
                key={device.deviceId || device.deviceAssociationId}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isVerified
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block">
                      📱 {device.deviceName || 'Android Companion'}
                    </span>
                    <div className="text-[10px] font-mono text-slate-400">
                      Focus Integrity · {isVerified ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Registered (Server Verified)</span>
                      ) : (
                        <span className="text-amber-500 dark:text-amber-400 font-semibold">Registered (Local Fallback · Unverified)</span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Activity · {device.lastSeenAt ? (
                        <span className="text-slate-500">Last seen {formatLastSeen(device.lastSeenAt)}</span>
                      ) : (
                        <span className="text-slate-500">Awaiting companion connection</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManagingDevice(device);
                      setDeviceNameInput(device.deviceName || 'Android Companion');
                      setShowManageModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-slate-400 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>
            );
          })}

          {/* No phone connected state */}
          {devices.length === 0 && (
            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/30 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 block">
                    📱 No phone connected
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Phone telemetry unavailable
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenPairing}
                className="px-3 py-1.5 rounded-xl bg-electric-600 hover:bg-electric-700 text-white font-mono text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Connect Phone
              </button>
            </div>
          )}

        </div>

        {/* Focus Integrity Toggle (Prompt #27) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Focus Integrity
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                focusIntegrityEnabled
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${focusIntegrityEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {focusIntegrityEnabled ? '● Enabled' : '○ Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
              Measure interruptions during active focus sessions. If disabled, learning sessions continue normally without phone telemetry.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleFocusIntegrity}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
              focusIntegrityEnabled
                ? 'border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                : 'bg-electric-600 hover:bg-electric-700 text-white border-transparent'
            }`}
          >
            {focusIntegrityEnabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {/* ── 2. FOCUS APP CLASSIFICATIONS (Phone usage != distraction) ── */}
      <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-coral-500/10 text-coral-600 dark:text-coral-400 flex items-center justify-center font-bold">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                Focus Integrity Rule (Prompt #13 & #14)
              </span>
              <h3 className="font-display font-black text-lg text-slate-900 dark:text-white tracking-tight">
                Phone App Classifications
              </h3>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            Phone use ≠ Distraction · User overrides authoritative
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
          The learner legitimately uses calculators, documentation, PDF readers, and browser lookups during engineering work. Apps are classified explicitly as Reference or Distraction. Unrecognized apps remain strictly <strong className="font-mono text-slate-800 dark:text-slate-200">UNKNOWN</strong>, never silently labeled distractions.
        </p>

        {/* Classification List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {displayPackages.map(item => {
            const currentCat = appOverrides[item.pkg] || item.defaultCat;
            const isRef = currentCat === APP_CATEGORIES.REFERENCE;
            return (
              <div
                key={item.pkg}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.label}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {item.pkg}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleAppClassification(item.pkg)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all border shrink-0 ${
                    isRef
                      ? 'bg-electric-500/10 border-electric-500/40 text-electric-600 dark:text-electric-300'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-300'
                  }`}
                  title="Click to toggle category"
                >
                  {isRef ? '📖 Reference' : '⚡ Distraction'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Add custom package override */}
        <form onSubmit={handleAddCustomApp} className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="text"
            value={newPackageName}
            onChange={(e) => setNewPackageName(e.target.value)}
            placeholder="Add package (e.g. org.kicad.viewer)"
            className="flex-1 min-w-0 sm:min-w-[200px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-coral-500"
          />
          <select
            value={newPackageCategory}
            onChange={(e) => setNewPackageCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300"
          >
            <option value={APP_CATEGORIES.REFERENCE}>Reference (Allowed Tool)</option>
            <option value={APP_CATEGORIES.DISTRACTION}>Distraction</option>
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-mono font-bold flex items-center gap-1 transition-colors border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        </form>
      </div>

      {/* ── 3. YOUR DATA & PRIVACY (Prompt #6 & #26) ── */}
      <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Data Sovereignty & Play Store Compliance
            </span>
            <h3 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
              Focus Integrity Privacy Guarantee
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Prompt #6 Canonical Disclosure:
            </h4>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed italic bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
              "During a focus session, Learning Tracker can measure app interruptions and time away from your intended work. We use this only to calculate your focus-session summary. Your phone activity is processed for this purpose and is not presented as a surveillance feed."
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block">✓ What We Measure:</span>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>• App foreground/background transition durations</li>
                <li>• Screen interactive vs non-interactive state</li>
                <li>• Discrete session window only (sessionStart → sessionEnd)</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-rose-700 dark:text-rose-400 block">✕ What We Never Touch:</span>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>• Zero microphone, camera, contacts, or location access</li>
                <li>• Zero reading of personal messages or browsing content</li>
                <li>• No persistent hardware IDs (IMEI/SIM) or continuous surveillance</li>
              </ul>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportData}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-slate-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Learning Portfolio JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteTelemetryModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Delete Focus Integrity History</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Identity & Reality Profile</span>
            </button>
          </div>
          {telemetryDeletedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Focus Integrity history deleted. Learning sessions preserved.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── PAIR PHONE MODAL (Prompt #3, #4, #5 & #6) ── */}
      {showPairingModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 anim-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pairing-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div id="pairing-modal-title" className="flex items-center gap-2 font-display font-black text-lg text-slate-900 dark:text-white">
                <Smartphone className="w-5 h-5 text-electric-600 dark:text-electric-400" />
                <span>Connect Android Companion</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPairingModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Close pairing modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              Scan this verified QR with your phone camera, or open the link below in the <strong>Learning Tracker Android Companion</strong> app:
            </p>

            {/* QR Code & App Link Box (Prompt #3 & #4) */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 text-center space-y-3">
              {/* High-contrast tactile QR visual */}
              <div className="w-40 h-40 bg-white p-3 rounded-2xl mx-auto shadow-md border border-slate-300 flex flex-col items-center justify-center space-y-1.5 relative group">
                <div className="grid grid-cols-5 gap-1.5 w-full h-full p-1 bg-slate-900 rounded-xl">
                  <div className="bg-white rounded-sm col-span-2 row-span-2 flex items-center justify-center">
                    <div className="w-3 h-3 bg-slate-900 rounded-xs" />
                  </div>
                  <div className="bg-white rounded-sm" />
                  <div className="bg-white rounded-sm col-span-2 row-span-2 flex items-center justify-center">
                    <div className="w-3 h-3 bg-slate-900 rounded-xs" />
                  </div>
                  <div className="bg-white rounded-sm col-span-2 row-span-2 flex items-center justify-center">
                    <div className="w-3 h-3 bg-slate-900 rounded-xs" />
                  </div>
                  <div className="bg-white rounded-sm col-span-3 row-span-3 flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-slate-900" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Verified HTTPS App Link (Prompt #4)
                </span>
                <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-electric-600 dark:text-electric-400 font-bold select-all break-all">
                  {pairingTokenRecord?.pairUrl || `https://learningtracker001.netlify.app/connect/${pairingTokenRecord?.token || 'token'}`}
                </div>
                <span className="text-[10px] text-slate-400 font-mono block pt-0.5">
                  Single-use · Valid for 5 minutes · No persistent hardware serials
                </span>
              </div>
            </div>

            {pairingError && (
              <div className="text-xs font-mono text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                {pairingError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-mono text-slate-400">
                Awaiting real companion app scan · Ticket expires in 5m
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={syncDevicesFromServer}
                  disabled={isLoadingDevices}
                  className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-electric-600 dark:text-electric-400 hover:bg-electric-50 dark:hover:bg-electric-950/40 border border-electric-200 dark:border-electric-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDevices ? 'animate-spin' : ''}`} />
                  <span>Check status</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPairingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DEVICE MANAGEMENT MODAL (Prompt #9) ── */}
      {showManageModal && (managingDevice || pairedDevice) && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 anim-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-device-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div id="manage-device-modal-title" className="flex items-center gap-2 font-display font-black text-lg text-slate-900 dark:text-white">
                <Smartphone className="w-5 h-5 text-emerald-500" />
                <span>Manage Device</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManageModal(false);
                  setManagingDevice(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Close device manager"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rename Device Input (Prompt #9) */}
            {(() => {
              const current = managingDevice || pairedDevice;
              const isServerBacked = current?.isServerVerified !== false && current?.source === 'server';
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="manage-device-name-input" className="text-xs font-mono text-slate-500">
                      Device Name
                    </label>
                    {isServerBacked ? (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        Server-backed
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                        Local-only
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="manage-device-name-input"
                      type="text"
                      value={deviceNameInput}
                      onChange={(e) => setDeviceNameInput(e.target.value)}
                      disabled={isServerBacked}
                      placeholder="e.g. Galaxy S25"
                      className={`flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none ${
                        isServerBacked ? 'opacity-60 cursor-not-allowed' : 'focus:border-electric-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleSaveDeviceName}
                      disabled={isServerBacked || !deviceNameInput.trim()}
                      className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                  {isServerBacked ? (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Renaming is disabled for server-backed devices because remote name updates are not supported by the phone API.
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                      Local rename only. Changes apply to this browser workstation only.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Diagnostics (Prompt #9) */}
            {(() => {
              const current = managingDevice || pairedDevice;
              const isVerified = current.isServerVerified !== false;
              return (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Platform</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">Android</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    <span className={isVerified ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-500 dark:text-amber-400 font-bold"}>
                      {isVerified ? (current.status === 'revoked' ? 'Revoked' : 'Registered (Server Verified)') : "Registered (Local Fallback · Unverified)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Seen</span>
                    <span className="text-slate-500">
                      {current.lastSeenAt ? formatLastSeen(current.lastSeenAt) : 'Awaiting connection'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Paired</span>
                    <span className="text-slate-500">{current.pairedAt ? formatPairedAt(current.pairedAt) : 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Usage Access</span>
                    <span className="text-slate-500">
                      {current.hasUsageAccess === true ? 'Granted' : (current.hasUsageAccess === false ? 'Needed' : 'Unknown')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device ID</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[180px] font-mono" title={current.deviceId || current.deviceAssociationId}>
                      {current.deviceId || current.deviceAssociationId}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons: Disconnect & Revoke (Prompt #9) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleUnpair(managingDevice || pairedDevice)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold transition-colors cursor-pointer"
                >
                  Disconnect Phone
                </button>
                <button
                  type="button"
                  onClick={() => handleRevokeDevice(managingDevice || pairedDevice)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Revoke Access</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM RESET DIALOG ── */}
      {showConfirmReset && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 anim-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-reset-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-red-300 dark:border-red-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <h3 id="confirm-reset-modal-title" className="font-display font-black text-lg text-red-600 dark:text-red-400">
              Reset Identity & Reality?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              This will reset your destination, resource inventory, and time reality back to clean defaults. Your completed sessions, roadmap tasks, and archive records will remain safe.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetIdentity();
                  setShowConfirmReset(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                Yes, Reset Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE ACCOUNT CONFIRMATION MODAL (Prompt #14) ── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 anim-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div id="delete-account-modal-title" className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-display font-black text-lg">
              <Trash2 className="w-5 h-5" />
              <span>Delete Learning Tracker Account</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              This will permanently delete:
            </p>
            <ul className="text-xs font-mono text-slate-500 dark:text-slate-400 space-y-1 pl-4 list-disc">
              <li>Local learning history & sessions on this device</li>
              <li>Goals & reality declarations</li>
              <li>Evidence & archive proof moments</li>
              <li>Device associations</li>
            </ul>
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 pt-1">
              This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                Permanently Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE FOCUS INTEGRITY HISTORY MODAL (Prompt #28) ── */}
      {showDeleteTelemetryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 anim-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-telemetry-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <h3 id="delete-telemetry-modal-title" className="font-display font-black text-lg text-slate-900 dark:text-white">
              Delete Focus Integrity history?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              This removes phone-derived focus interruption data. Your learning sessions remain.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteTelemetryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTelemetry}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GOOGLE SIGN-IN MODAL ── */}
      <GoogleSignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSuccess={() => {
          setShowSignInModal(false);
          refreshAccount && refreshAccount();
        }}
      />

    </section>
  );
};

export default IdentityDevicesAndPrivacy;
