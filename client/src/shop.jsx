// Shop.jsx - Shop & Customization UI for Odd Gravity
// Drop this file into /opt/obc/client/src/

import React, { useState, useEffect } from 'react';
import { PLAYER_SKINS, TRAIL_EFFECTS, MODE_UNLOCKS } from './progression';

// Tab options
const TABS = {
  SKINS: 'skins',
  TRAILS: 'trails',
  MODES: 'modes',
};

function Shop({ progressionManager, onClose, onModeUnlock }) {
  const [activeTab, setActiveTab] = useState(TABS.SKINS);
  const [shopData, setShopData] = useState(null);
  const [notification, setNotification] = useState(null);

  // Load shop data
  useEffect(() => {
    refreshShopData();
  }, []);

  const refreshShopData = () => {
    setShopData(progressionManager.getShopData());
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2000);
  };

  // Purchase handlers
  const handlePurchaseSkin = (skinId) => {
    const result = progressionManager.purchaseSkin(skinId);
    if (result.success) {
      showNotification(`Unlocked ${result.skin.name}!`);
      refreshShopData();
    } else {
      showNotification(result.error, 'error');
    }
  };

  const handlePurchaseTrail = (trailId) => {
    const result = progressionManager.purchaseTrail(trailId);
    if (result.success) {
      showNotification(`Unlocked ${result.trail.name}!`);
      refreshShopData();
    } else {
      showNotification(result.error, 'error');
    }
  };

  const handlePurchaseMode = (modeId) => {
    const result = progressionManager.purchaseMode(modeId);
    if (result.success) {
      showNotification(`Unlocked ${modeId} mode!`);
      refreshShopData();
      if (onModeUnlock) onModeUnlock(modeId);
    } else {
      showNotification(result.error, 'error');
    }
  };

  // Equip handlers
  const handleEquipSkin = (skinId) => {
    progressionManager.equipSkin(skinId);
    refreshShopData();
  };

  const handleEquipTrail = (trailId) => {
    progressionManager.equipTrail(trailId);
    refreshShopData();
  };

  if (!shopData) return null;

  const renderSkinPreview = (skin) => {
    const style = {
      width: 50,
      height: 50,
      borderRadius: skin.shape === 'square' ? 8 : '50%',
      background: skin.color === 'rainbow' 
        ? 'linear-gradient(135deg, #ff0000, #ff8000, #ffff00, #00ff00, #0080ff, #8000ff)'
        : skin.color,
      opacity: skin.transparent ? 0.7 : 1,
      boxShadow: skin.glow ? `0 0 20px ${skin.color}` : 'none',
      border: '3px solid rgba(255,255,255,0.2)',
    };
    return <div style={style} />;
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>✨ Shop</h2>
          <div style={styles.coinDisplay}>
            <span style={styles.coinIcon}>🪙</span>
            <span style={styles.coinAmount}>{shopData.coins}</span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Notification */}
        {notification && (
          <div style={{
            ...styles.notification,
            background: notification.type === 'error' ? '#F44336' : '#4CAF50'
          }}>
            {notification.message}
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          {Object.entries(TABS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setActiveTab(value)}
              style={{
                ...styles.tab,
                ...(activeTab === value ? styles.tabActive : {})
              }}
            >
              {key === 'SKINS' && '🎨 '}
              {key === 'TRAILS' && '✨ '}
              {key === 'MODES' && '🎮 '}
              {key}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Skins Tab */}
          {activeTab === TABS.SKINS && (
            <div style={styles.grid}>
              {shopData.skins.map(skin => (
                <div key={skin.id} style={styles.item}>
                  {renderSkinPreview(skin)}
                  <span style={styles.itemName}>{skin.name}</span>
                  
                  {skin.owned ? (
                    skin.equipped ? (
                      <div style={styles.equippedBadge}>✓ Equipped</div>
                    ) : (
                      <button
                        onClick={() => handleEquipSkin(skin.id)}
                        style={styles.equipBtn}
                      >
                        Equip
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handlePurchaseSkin(skin.id)}
                      disabled={!skin.canAfford}
                      style={{
                        ...styles.buyBtn,
                        opacity: skin.canAfford ? 1 : 0.5,
                      }}
                    >
                      🪙 {skin.cost}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Trails Tab */}
          {activeTab === TABS.TRAILS && (
            <div style={styles.grid}>
              {shopData.trails.map(trail => (
                <div key={trail.id} style={styles.item}>
                  <div style={styles.trailPreview}>
                    {trail.id === 'none' && '○'}
                    {trail.id === 'dots' && '• • •'}
                    {trail.id === 'line' && '━━━'}
                    {trail.id === 'sparkle' && '✦ ✧ ✦'}
                    {trail.id === 'fire' && '🔥'}
                    {trail.id === 'ice' && '❄️'}
                    {trail.id === 'rainbow' && '🌈'}
                    {trail.id === 'stars' && '⭐'}
                  </div>
                  <span style={styles.itemName}>{trail.name}</span>
                  
                  {trail.owned ? (
                    trail.equipped ? (
                      <div style={styles.equippedBadge}>✓ Equipped</div>
                    ) : (
                      <button
                        onClick={() => handleEquipTrail(trail.id)}
                        style={styles.equipBtn}
                      >
                        Equip
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handlePurchaseTrail(trail.id)}
                      disabled={!trail.canAfford}
                      style={{
                        ...styles.buyBtn,
                        opacity: trail.canAfford ? 1 : 0.5,
                      }}
                    >
                      🪙 {trail.cost}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Modes Tab */}
          {activeTab === TABS.MODES && (
            <div style={styles.modeList}>
              {shopData.modes.map(mode => (
                <div key={mode.id} style={styles.modeItem}>
                  <div style={styles.modeInfo}>
                    <span style={styles.modeName}>
                      {mode.id === 'classic' && '🎯 '}
                      {mode.id === 'oddgravity' && '🔄 '}
                      {mode.id === 'bouncy' && '🏀 '}
                      {mode.id === 'inverted' && '🙃 '}
                      {mode.id === 'flux' && '〰️ '}
                      {mode.id === 'pulse' && '💓 '}
                      {mode.id === 'chaotic' && '🌀 '}
                      {mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}
                    </span>
                    <span style={styles.modeDesc}>
                      {mode.id === 'classic' && 'Standard balanced gameplay'}
                      {mode.id === 'oddgravity' && '30% faster gravity flips'}
                      {mode.id === 'bouncy' && 'Bounce off walls instead of dying'}
                      {mode.id === 'inverted' && 'Gravity is reversed!'}
                      {mode.id === 'flux' && 'Ball wobbles up/down constantly'}
                      {mode.id === 'pulse' && '35% faster, shorter freeze'}
                      {mode.id === 'chaotic' && 'Random gravity flips!'}
                    </span>
                  </div>
                  
                  {mode.unlocked ? (
                    <div style={styles.unlockedBadge}>✓ Unlocked</div>
                  ) : (
                    <button
                      onClick={() => handlePurchaseMode(mode.id)}
                      disabled={!mode.canAfford}
                      style={{
                        ...styles.buyBtn,
                        opacity: mode.canAfford ? 1 : 0.5,
                      }}
                    >
                      🪙 {mode.cost}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Level progress */}
        <div style={styles.levelBar}>
          <div style={styles.levelInfo}>
            <span style={styles.levelBadge}>
              Lv.{progressionManager.getLevelProgress().level}
            </span>
            <span style={styles.levelXP}>
              {progressionManager.getLevelProgress().xpInLevel} / {progressionManager.getLevelProgress().xpNeeded} XP
            </span>
          </div>
          <div style={styles.xpBarBg}>
            <div 
              style={{
                ...styles.xpBarFill,
                width: `${progressionManager.getLevelProgress().progress * 100}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: 20,
    padding: 0,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  title: {
    margin: 0,
    fontSize: 24,
    color: '#FFF',
    flex: 1,
  },
  coinDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255, 215, 0, 0.2)',
    padding: '8px 16px',
    borderRadius: 20,
    marginRight: 16,
  },
  coinIcon: {
    fontSize: 20,
  },
  coinAmount: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#FFF',
    fontSize: 24,
    cursor: 'pointer',
    padding: 8,
    opacity: 0.7,
  },
  notification: {
    padding: '12px 24px',
    textAlign: 'center',
    color: '#FFF',
    fontWeight: 'bold',
  },
  tabs: {
    display: 'flex',
    padding: '0 16px',
    gap: 8,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    padding: '16px 8px',
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#FFF',
    borderBottomColor: '#4ECDC4',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 20,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: 16,
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    transition: 'transform 0.2s',
  },
  itemName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  trailPreview: {
    width: 50,
    height: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    color: '#FFF',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
  },
  equipBtn: {
    background: '#4ECDC4',
    border: 'none',
    color: '#000',
    padding: '6px 16px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  buyBtn: {
    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    border: 'none',
    color: '#000',
    padding: '6px 16px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  equippedBadge: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
  },
  unlockedBadge: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  modeItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  modeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  modeName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modeDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  levelBar: {
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  levelInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelBadge: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 14,
  },
  levelXP: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  xpBarBg: {
    height: 8,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
    borderRadius: 4,
    transition: 'width 0.3s',
  },
};

export default Shop;