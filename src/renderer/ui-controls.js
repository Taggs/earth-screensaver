/**
 * UI Controls - Independent of globe implementation
 * Ensures critical UI elements (like Close button) always work
 */

(function() {
  'use strict';

  console.log('[UI] Initializing UI controls...');

  // ============================================================================
  // CLOSE BUTTON - MUST ALWAYS WORK
  // ============================================================================
  function initCloseButton() {
    const closeButton = document.getElementById('closeButton');
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        console.log('[UI] Close button clicked');
        if (window.electronAPI) {
          window.electronAPI.exitScreensaver();
        } else {
          // Fallback for non-Electron environment
          window.close();
        }
      });
      console.log('[UI] Close button initialized');
    } else {
      console.error('[UI] Close button not found!');
    }
  }

  // ============================================================================
  // OTHER UI CONTROLS
  // ============================================================================
  function initOtherControls() {
    // Auto-rotate toggle
    const autoRotateBtn = document.getElementById('autoRotateBtn');
    if (autoRotateBtn) {
      autoRotateBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        // Globe will listen to this event
        window.dispatchEvent(new CustomEvent('toggleAutoRotate', {
          detail: { enabled: this.classList.contains('active') }
        }));
      });
    }

    // Day/night toggle
    const dayNightBtn = document.getElementById('dayNightBtn');
    if (dayNightBtn) {
      dayNightBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        window.dispatchEvent(new CustomEvent('toggleDayNight', {
          detail: { enabled: this.classList.contains('active') }
        }));
      });
    }

    // Weather toggle
    const weatherBtn = document.getElementById('weatherBtn');
    if (weatherBtn) {
      weatherBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        window.dispatchEvent(new CustomEvent('toggleWeather', {
          detail: { enabled: this.classList.contains('active') }
        }));
      });
    }

    // Translate toggle
    const translateBtn = document.getElementById('translateBtn');
    if (translateBtn) {
      translateBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        window.dispatchEvent(new CustomEvent('toggleTranslate', {
          detail: { enabled: this.classList.contains('active') }
        }));
      });
    }

    // Performance stats toggle
    const showStatsCheckbox = document.getElementById('showStatsCheckbox');
    const performanceStats = document.getElementById('performanceStats');
    if (showStatsCheckbox && performanceStats) {
      showStatsCheckbox.addEventListener('change', function() {
        performanceStats.style.display = this.checked ? 'block' : 'none';
      });
    }

    // Quality preset selector
    const qualityPreset = document.getElementById('qualityPreset');
    if (qualityPreset) {
      qualityPreset.addEventListener('change', function() {
        window.dispatchEvent(new CustomEvent('qualityPresetChanged', {
          detail: { preset: this.value }
        }));
      });
    }

    console.log('[UI] Other controls initialized');
  }

  // ============================================================================
  // DRAGGABLE CONTROLS PANEL
  // ============================================================================
  function initDraggablePanel() {
    const controlsPanel = document.getElementById('controlsPanel');
    if (!controlsPanel) return;

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    const header = controlsPanel.querySelector('h3');
    if (!header) return;

    header.style.cursor = 'move';

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
    }

    function drag(e) {
      if (!isDragging) return;
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      setTranslate(currentX, currentY, controlsPanel);
    }

    function dragEnd() {
      isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
  }

  // ============================================================================
  // NEWS BOX CLOSE
  // ============================================================================
  function initNewsBox() {
    const newsBoxClose = document.getElementById('newsBoxClose');
    const newsBox = document.getElementById('newsBox');

    if (newsBoxClose && newsBox) {
      newsBoxClose.addEventListener('click', function() {
        newsBox.classList.remove('active');
      });
    }
  }

  // ============================================================================
  // INITIALIZE
  // ============================================================================
  function init() {
    try {
      // Close button is most critical - initialize first
      initCloseButton();
      initOtherControls();
      initDraggablePanel();
      initNewsBox();
      console.log('[UI] All controls initialized successfully');
    } catch (error) {
      console.error('[UI] Error initializing controls:', error);
      // Even if other controls fail, try to ensure close button works
      try {
        initCloseButton();
      } catch (e) {
        console.error('[UI] CRITICAL: Failed to initialize close button:', e);
      }
    }
  }

  // Initialize immediately or wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
