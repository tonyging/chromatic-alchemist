/**
 * 音效工具函數
 * 使用 Web Audio API 生成簡單的音調效果
 */

// 擴展 Window 介面以支持 webkitAudioContext（Safari）
interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export type SoundType = 'attack' | 'hit' | 'critical' | 'victory';

/**
 * 播放音效
 * @param type - 音效類型
 * @param enabled - 是否啟用音效（預設為 true）
 */
export function playSound(type: SoundType, enabled = true): void {
  if (!enabled) return;

  try {
    // 支持標準 AudioContext 和 Safari 的 webkitAudioContext
    const AudioContextClass =
      window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;

    if (!AudioContextClass) {
      console.warn('Web Audio API 不支援');
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 根據音效類型設定頻率和持續時間
    switch (type) {
      case 'attack':
        oscillator.frequency.value = 440; // A4
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case 'hit':
        oscillator.frequency.value = 220; // A3
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'critical':
        oscillator.frequency.value = 880; // A5
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'victory':
        oscillator.frequency.value = 523.25; // C5
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
    }

    oscillator.start();
  } catch (error) {
    console.error('音效播放失敗:', error);
  }
}
